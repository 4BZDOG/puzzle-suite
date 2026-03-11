// =============================================================
// pdf/pdfDrawWordSearch.js
// =============================================================

/**
 * Draw a word-search puzzle page (grid + word bank) onto the PDF.
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

    const maxCellSize = isKey ? 6 : 9;
    const cSize = Math.min(layout.w / wsData.size, layout.h / wsData.size, maxCellSize);
    const gridW = cSize * wsData.size;

    const ox = layout.x + (layout.w - gridW) / 2;
    const oy = isKey ? layout.y + (layout.h - gridW) / 2 : layout.y;

    doc.setLineWidth(0.3);
    const fontSizePt = mmToPt(cSize) * 0.60;

    // Read wsInternalGrid from ctx (passed via buildCtx settings) — never touch the DOM here
    const showInternalGrid = ctx.wsInternalGrid || false;

    for (let y = 0; y < wsData.size; y++) {
        for (let x = 0; x < wsData.size; x++) {
            const cx = ox + x * cSize, cy = oy + y * cSize;

            if (!isKey && showInternalGrid) {
                doc.setDrawColor(200);
                doc.rect(cx, cy, cSize, cSize, 'S');
            }

            doc.setFont('courier', 'bold');
            doc.setFontSize(fontSizePt);

            if (isKey) {
                doc.setDrawColor(0);
                doc.rect(cx, cy, cSize, cSize, 'S');
                if (wsData.solution.has(`${x},${y}`)) {
                    doc.setTextColor(15, 23, 42);
                } else {
                    doc.setTextColor(200);
                    doc.setFont('courier', 'normal');
                }
            } else {
                doc.setTextColor(15, 23, 42);
            }

            doc.text(wsData.grid[y][x], cx + cSize / 2, cy + cSize / 2, { align: 'center', baseline: 'middle' });
        }
    }

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.5);
    doc.rect(ox, oy, gridW, gridW, 'S');

    if (!isKey) {
        const bankY = oy + gridW + 10 * scale;
        doc.setFont(pdfFont, 'normal');
        doc.setTextColor(15, 23, 42);
        doc.setFontSize(9 * pScale);

        const items = wsData.placed.map(w => {
            if (showClues && wordsList) {
                const match = wordsList.find(x => x.word === w);
                if (match) return `${match.clue} (${w.length})`;
            }
            return w;
        });

        const numCols = showClues ? 2 : 3;
        const colWidth = layout.w / numCols;
        const itemsPerCol = Math.ceil(items.length / numCols);
        let cx = layout.x, cy = bankY;
        const sq = 2.5 * scale;

        items.forEach((text, i) => {
            if (i > 0 && i % itemsPerCol === 0) { cx += colWidth; cy = bankY; }
            const lines = doc.splitTextToSize(text, colWidth - 8 * scale);

            if (cy + (lines.length * 4 * pScale) > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                drawWatermark();
                cy = MARGIN + 10 * scale;
            }

            doc.setDrawColor(100);
            doc.setLineWidth(0.3);
            doc.rect(cx, cy - sq + 0.5 * scale, sq, sq, 'S');
            lines.forEach((line, idx) => {
                doc.text(line, cx + 5 * scale, cy);
                if (idx < lines.length - 1) cy += 4 * pScale;
            });
            cy += 6 * pScale;
        });
    }
}
