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
    const showExample = ctx.showExample || false;
    const exWordPos = showExample && wsData.wordPositions?.length ? wsData.wordPositions[0] : null;
    const exCells = new Set(exWordPos?.cells ? exWordPos.cells.map(c => `${c.x},${c.y}`) : []);

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
                // Highlight example word cells with a light blue fill
                if (!isKey && exCells.has(`${x},${y}`)) {
                    doc.setFillColor(219, 234, 254);
                    doc.rect(cx, cy, cSize, cSize, 'F');
                }
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
        const colWidth = gridW / numCols;
        const itemsPerCol = Math.ceil(items.length / numCols);
        let cx = ox, cy = bankY;
        const sq = 2.5 * scale;

        const exWord = exWordPos ? exWordPos.word : null;
        items.forEach((text, i) => {
            if (i > 0 && i % itemsPerCol === 0) { cx += colWidth; cy = bankY; }
            const isEx = exWord && wsData.placed[i] === exWord;
            const lines = doc.splitTextToSize(text, colWidth - 8 * scale);

            if (cy + (lines.length * 4 * pScale) > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                drawWatermark();
                cy = MARGIN + 10 * scale;
            }

            if (isEx) {
                // Draw a tick/checkmark in blue (avoids unicode rendering issues)
                doc.setFillColor(219, 234, 254);
                doc.rect(cx, cy - sq + 0.5 * scale, sq, sq, 'F');
                doc.setDrawColor(37, 99, 235);
                doc.setLineWidth(0.5);
                const bx = cx, by = cy - sq + 0.5 * scale;
                doc.line(bx + sq * 0.15, by + sq * 0.55, bx + sq * 0.42, by + sq * 0.80);
                doc.line(bx + sq * 0.42, by + sq * 0.80, bx + sq * 0.85, by + sq * 0.20);
                doc.setTextColor(37, 99, 235);
            } else {
                doc.setDrawColor(100);
                doc.setLineWidth(0.3);
                doc.rect(cx, cy - sq + 0.5 * scale, sq, sq, 'S');
                doc.setTextColor(15, 23, 42);
            }
            lines.forEach((line, idx) => {
                doc.text(line, cx + 5 * scale, cy);
                if (idx < lines.length - 1) cy += 4 * pScale;
            });
            if (isEx) doc.setTextColor(15, 23, 42);
            cy += 6 * pScale;
        });
    }
}
