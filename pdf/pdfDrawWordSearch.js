// =============================================================
// pdf/pdfDrawWordSearch.js
// =============================================================
import { PALETTE, drawCapsule, drawExamplePill, examplePillWidth, setFontSafe } from './pdfHelpers.js';

/**
 * Draw a word-search puzzle page (grid + word bank) onto the PDF.
 *
 * Highlighting is vector, not per-cell tinting: a word is ringed by a
 * single capsule running along its path, so a diagonal or backwards
 * word reads as one connected mark instead of a scatter of tinted
 * cells. The same primitive draws the student's worked example (blue)
 * and every solution on the teacher key (crimson).
 *
 * @param {Object}  ctx       - buildCtx() result
 * @param {Object}  wsData    - puzzleData.ws
 * @param {Object}  layout    - { x, y, w, h } in mm
 * @param {Array}   wordsList - state.words (for clue lookups)
 * @param {boolean} showClues
 * @param {boolean} isKey
 * @param {number}  pScale    - per-page font scale multiplier
 */
export function drawWordSearch(ctx, wsData, layout, wordsList, showClues, isKey, pScale) {
    if (!wsData) return;
    const { doc, PAGE_HEIGHT, MARGIN, scale, mmToPt, pdfFont, drawWatermark } = ctx;
    pScale = pScale || scale;

    const showLetterCount = ctx.showLetterCount !== false;
    const showExample = ctx.showExample || false;
    const exWordPos = !isKey && showExample && wsData.wordPositions?.length ? wsData.wordPositions[0] : null;

    // ---- Budget the page: size the grid around the word bank it needs ----
    const items = (wsData.placed || []).map(w => {
        if (showClues && wordsList) {
            const match = wordsList.find(x => x.word === w);
            if (match) return showLetterCount ? `${match.clue} (${w.length})` : match.clue;
        }
        return w;
    });
    const maxLen = wsData.placed.reduce((m, w) => Math.max(m, w.length), 0);
    const numCols = showClues ? 2 : (maxLen > 12 ? 2 : maxLen <= 8 ? 4 : 3);
    const itemsPerCol = Math.max(1, Math.ceil(items.length / numCols));
    const bankRowH = 6.5 * pScale;
    const bankH = isKey ? 0 : (8 * pScale + itemsPerCol * bankRowH + 4 * pScale);

    const maxCellSize = isKey ? 8.5 : 11;
    const heightForGrid = isKey ? layout.h : Math.max(20, layout.h - bankH);
    const cSize = Math.min(layout.w / wsData.size, heightForGrid / wsData.size, maxCellSize);
    const gridW = cSize * wsData.size;

    const ox = layout.x + (layout.w - gridW) / 2;
    // Centre whatever height is left over rather than dumping it at the foot.
    const slack = Math.max(0, layout.h - bankH - gridW);
    const oy = isKey ? layout.y + (layout.h - gridW) / 2 : layout.y + slack / 2;

    const fontSizePt = mmToPt(cSize) * 0.60;
    const showInternalGrid = ctx.wsInternalGrid || false;

    // ---- Layer 1: banding + highlight capsules (under everything) ----
    if (!isKey) {
        for (let y = 0; y < wsData.size; y++) {
            if (y % 2 === 1) {
                doc.setFillColor(...PALETTE.band);
                doc.rect(ox, oy + y * cSize, gridW, cSize, 'F');
            }
        }
    }

    const centreOf = (c) => [ox + c.x * cSize + cSize / 2, oy + c.y * cSize + cSize / 2];

    if (exWordPos?.cells?.length) {
        const [x1, y1] = centreOf(exWordPos.cells[0]);
        const [x2, y2] = centreOf(exWordPos.cells[exWordPos.cells.length - 1]);
        drawCapsule(doc, x1, y1, x2, y2, cSize * 0.44, {
            stroke: PALETTE.example, fill: PALETTE.exampleBg, lineWidth: 0.5,
        });
    }

    // ---- Layer 2: cell borders ----
    if (!isKey && showInternalGrid) {
        doc.setDrawColor(220);
        doc.setLineWidth(0.3);
        for (let y = 0; y < wsData.size; y++) {
            for (let x = 0; x < wsData.size; x++) {
                doc.rect(ox + x * cSize, oy + y * cSize, cSize, cSize, 'S');
            }
        }
    }
    if (isKey) {
        doc.setDrawColor(190);
        doc.setLineWidth(0.15);
        for (let y = 0; y < wsData.size; y++) {
            for (let x = 0; x < wsData.size; x++) {
                doc.rect(ox + x * cSize, oy + y * cSize, cSize, cSize, 'S');
            }
        }
        // Solution paths: one high-contrast ring per word beats dimming
        // 200-odd filler letters into an unreadable grey block.
        (wsData.wordPositions || []).forEach(wp => {
            if (!wp.cells?.length) return;
            const [x1, y1] = centreOf(wp.cells[0]);
            const [x2, y2] = centreOf(wp.cells[wp.cells.length - 1]);
            drawCapsule(doc, x1, y1, x2, y2, cSize * 0.46, {
                stroke: PALETTE.key, fill: null, lineWidth: 0.45,
            });
        });
    }

    // ---- Layer 3: letters ----
    const hasPaths = (wsData.wordPositions || []).length > 0;
    for (let y = 0; y < wsData.size; y++) {
        for (let x = 0; x < wsData.size; x++) {
            const cx = ox + x * cSize, cy = oy + y * cSize;
            const inSolution = wsData.solution?.has(`${x},${y}`);

            doc.setFont('courier', 'bold');
            doc.setFontSize(fontSizePt);

            if (isKey) {
                if (inSolution) {
                    doc.setTextColor(...PALETTE.ink);
                } else {
                    // Rings carry the answer, so fillers only need to recede
                    // a little — not vanish. (Was 200; unreadable in print.)
                    doc.setTextColor(hasPaths ? 130 : 165);
                    doc.setFont('courier', 'normal');
                }
            } else {
                doc.setTextColor(...PALETTE.ink);
            }

            doc.text(wsData.grid[y][x], cx + cSize / 2, cy + cSize / 2, { align: 'center', baseline: 'middle' });
        }
    }

    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.5);
    doc.rect(ox, oy, gridW, gridW, 'S');

    if (isKey) return;

    // ---- Word bank ----
    const bankY = oy + gridW + 8 * scale;
    const bankW = layout.w;
    const bankX = layout.x;

    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(9 * pScale);
    doc.setTextColor(...PALETTE.muted);
    doc.text('FIND THESE WORDS:', bankX, bankY);
    doc.setDrawColor(200);
    doc.setLineWidth(0.15);
    doc.line(bankX, bankY + 2 * pScale, bankX + bankW, bankY + 2 * pScale);

    const listStartY = bankY + 6 * pScale;
    doc.setTextColor(...PALETTE.ink);
    doc.setFontSize(9.5 * pScale);

    const colWidth = bankW / numCols;
    let cx = bankX, cy = listStartY;
    const sq = 3 * scale;
    const exWord = exWordPos ? exWordPos.word : null;

    items.forEach((text, i) => {
        if (i > 0 && i % itemsPerCol === 0) { cx += colWidth; cy = listStartY; }
        const isEx = exWord && wsData.placed[i] === exWord;
        setFontSafe(doc, pdfFont, 'normal');
        doc.setFontSize(9.5 * pScale);
        const reserve = isEx ? examplePillWidth(doc, { pScale, pdfFont }) + 2 : 0;
        const lines = doc.splitTextToSize(text, colWidth - 10 * scale - reserve);

        if (cy + (lines.length * 4.5 * pScale) > PAGE_HEIGHT - MARGIN) {
            doc.addPage();
            drawWatermark();
            cy = MARGIN + 10 * scale;
        }

        const boxY = cy - sq + 0.5 * scale;
        if (isEx) {
            doc.setFillColor(...PALETTE.exampleBg);
            doc.rect(cx, boxY, sq, sq, 'F');
            doc.setDrawColor(...PALETTE.example);
            doc.setLineWidth(0.5);
            doc.line(cx + sq * 0.15, boxY + sq * 0.55, cx + sq * 0.42, boxY + sq * 0.80);
            doc.line(cx + sq * 0.42, boxY + sq * 0.80, cx + sq * 0.85, boxY + sq * 0.20);
            doc.setTextColor(...PALETTE.example);
        } else {
            doc.setDrawColor(150);
            doc.setLineWidth(0.3);
            doc.rect(cx, boxY, sq, sq, 'S');
            doc.setTextColor(...PALETTE.ink);
        }

        const firstLineY = cy;
        let lastX = cx + sq + 3 * scale;
        lines.forEach((line, idx) => {
            setFontSafe(doc, pdfFont, 'normal');
            doc.setFontSize(9.5 * pScale);
            doc.text(line, cx + sq + 3 * scale, cy);
            if (idx === lines.length - 1) lastX = cx + sq + 3 * scale + doc.getTextWidth(line);
            if (idx < lines.length - 1) cy += 4.5 * pScale;
        });
        if (isEx) {
            const pillW = examplePillWidth(doc, { pScale, pdfFont });
            drawExamplePill(doc, Math.min(lastX + 2, cx + colWidth - pillW - 2), firstLineY, { pScale, pdfFont });
            doc.setTextColor(...PALETTE.ink);
        }
        cy += bankRowH;
    });
}
