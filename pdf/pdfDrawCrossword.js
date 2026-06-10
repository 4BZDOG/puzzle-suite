// =============================================================
// pdf/pdfDrawCrossword.js
// =============================================================

/**
 * Draw a crossword puzzle (grid + clues) onto the PDF.
 *
 * @param {Object}  ctx     - buildCtx() result
 * @param {Object}  cwData  - puzzleData.cw
 * @param {Object}  layout  - { x, y, w, h } in mm
 * @param {boolean} isKey
 * @param {number}  pScale
 */
export function drawCrossword(ctx, cwData, layout, isKey, pScale) {
    if (!cwData || !cwData.placed.length) return;
    const { doc, PAGE_HEIGHT, PAGE_WIDTH, MARGIN, scale, mmToPt, pdfFont, drawWatermark } = ctx;
    pScale = pScale || scale;

    const maxCellSize = isKey ? 6 : 8;
    const cSize = Math.min(layout.w / cwData.cols, (layout.h * 0.85) / cwData.rows, maxCellSize);
    const gridW = cSize * cwData.cols, gridH = cSize * cwData.rows;

    const ox = layout.x + (layout.w - gridW) / 2;
    const oy = isKey ? layout.y + (layout.h - gridH) / 2 : layout.y;

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);

    const numFontSizePt  = Math.max(7.5, mmToPt(cSize) * 0.42);
    const charFontSizePt = mmToPt(cSize) * 0.65;

    const showExample = ctx.showExample || false;
    const firstAcross = showExample && !isKey
        ? (cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num)[0] || null)
        : null;
    const exCells = new Set();
    if (firstAcross) {
        for (let i = 0; i < firstAcross.word.length; i++) exCells.add(`${firstAcross.x + i},${firstAcross.y}`);
    }

    for (let y = 0; y < cwData.rows; y++) {
        for (let x = 0; x < cwData.cols; x++) {
            const cell = cwData.grid[y][x];
            if (cell) {
                const cx = ox + x * cSize, cy = oy + y * cSize;
                const isEx = exCells.has(`${x},${y}`);
                doc.setFillColor(isEx ? 219 : 255, isEx ? 234 : 255, isEx ? 254 : 255);
                doc.rect(cx, cy, cSize, cSize, 'FD');

                if (cell.num && !isKey) {
                    doc.setFont(pdfFont, 'normal');
                    doc.setFontSize(numFontSizePt);
                    doc.setTextColor(15, 23, 42);
                    doc.text(cell.num.toString(), cx + cSize * 0.08, cy + cSize * 0.08, { baseline: 'top' });
                }
                if (isKey) {
                    doc.setFont(pdfFont, 'bold');
                    doc.setFontSize(charFontSizePt);
                    doc.setTextColor(220, 20, 60);
                    doc.text(cell.char, cx + cSize / 2, cy + cSize / 2 + cSize * 0.05, { align: 'center', baseline: 'middle' });
                } else if (isEx) {
                    // Show example letters in blue
                    const letterIdx = x - firstAcross.x;
                    doc.setFont(pdfFont, 'bold');
                    doc.setFontSize(charFontSizePt);
                    doc.setTextColor(37, 99, 235);
                    doc.text(firstAcross.word[letterIdx], cx + cSize / 2, cy + cSize / 2 + cSize * 0.05, { align: 'center', baseline: 'middle' });
                }
            }
        }
    }

    if (!isKey) {
        const cluesY = oy + gridH + 8 * pScale;
        const ac = cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
        const dn = cwData.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num);
        const colW = layout.w / 2;
        const availH = PAGE_HEIGHT - MARGIN - cluesY;

        const calcColH = (list, fontPt) => {
            const lineH = fontPt * 0.5;
            const spacingH = fontPt * 0.18;
            const titleH = 5 * pScale;
            let h = titleH;
            doc.setFontSize(fontPt);
            list.forEach(w => {
                const lines = doc.splitTextToSize(`${w.num}. ${w.clue} (${w.word.length})`, colW - 6 * pScale);
                h += lines.length * lineH + spacingH;
            });
            return h;
        };

        let fontPt = 10 * pScale;
        const MIN_PT = 6.5;
        if (availH > 0) {
            while (fontPt > MIN_PT) {
                if (Math.max(calcColH(ac, fontPt), calcColH(dn, fontPt)) <= availH) break;
                fontPt = Math.max(MIN_PT, fontPt - 0.25);
            }
        }

        let acrossY = cluesY;
        let downY = cluesY;

        const drawColHeader = (title, colX, y) => {
            doc.setFont(pdfFont, 'bold');
            doc.setFontSize(10 * pScale);
            doc.setTextColor(15, 23, 42);
            doc.text(title, colX, y);
            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.3);
            doc.line(colX, y + 2 * pScale, colX + colW - 4 * pScale, y + 2 * pScale);
            return y + 6 * pScale;
        };

        const lineH = fontPt * 0.5;
        const spacingH = fontPt * 0.18;

        const drawClue = (w, colX, yRef, isExClue) => {
            const prefix = isExClue ? '[EX] ' : '';
            const numPrefix = `${prefix}${w.num}. `;
            const clueText = `${w.clue} (${w.word.length})`;
            doc.setFontSize(fontPt);
            doc.setFont(pdfFont, 'bold');
            const numW = doc.getTextWidth(numPrefix);
            const hangIndent = numW * 0.6;
            doc.setFont(pdfFont, 'normal');
            const bodyWrapW = colW - 6 * pScale - hangIndent;
            const clueLines = doc.splitTextToSize(clueText, bodyWrapW);
            const totalLines = clueLines.length;
            if (yRef.y + totalLines * lineH > PAGE_HEIGHT - MARGIN) {
                doc.addPage();
                drawWatermark();
                yRef.y = MARGIN + 10 * pScale;
            }
            doc.setFontSize(fontPt);
            doc.setFont(pdfFont, 'bold');
            if (isExClue) doc.setTextColor(37, 99, 235);
            else doc.setTextColor(15, 23, 42);
            doc.text(numPrefix, colX, yRef.y);
            doc.setFont(pdfFont, 'normal');
            if (!isExClue) doc.setTextColor(51, 65, 85);
            clueLines.forEach((line, idx) => {
                doc.text(line, colX + (idx === 0 ? numW : hangIndent), yRef.y);
                yRef.y += lineH;
            });
            if (isExClue) doc.setTextColor(15, 23, 42);
            yRef.y += spacingH;
        };

        // Draw ACROSS column
        if (ac.length) {
            acrossY = drawColHeader('ACROSS', layout.x, acrossY);
            const yRefAc = { y: acrossY };
            ac.forEach(w => {
                const isEx = showExample && firstAcross && w.num === firstAcross.num && w.dir === 'across';
                drawClue(w, layout.x, yRefAc, isEx);
            });
        }

        // Draw DOWN column
        if (dn.length) {
            downY = drawColHeader('DOWN', layout.x + colW, downY);
            const yRefDn = { y: downY };
            dn.forEach(w => {
                drawClue(w, layout.x + colW, yRefDn, false);
            });
        }
    }
}
