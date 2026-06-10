// =============================================================
// pdf/pdfDrawScramble.js
// =============================================================

/**
 * Draw a word-scramble puzzle onto the PDF.
 *
 * @param {Object}  ctx      - buildCtx() result
 * @param {Array}   scrData  - puzzleData.scr
 * @param {Object}  layout   - { x, y, w, h }
 * @param {boolean} isKey
 * @param {boolean} showHint - first-letter hint
 * @param {number}  pScale
 */
export function drawScramble(ctx, scrData, layout, isKey, showHint, pScale) {
    if (!scrData || !scrData.length) return;
    const { doc, scale, pdfFont } = ctx;
    pScale = pScale || scale;

    if (isKey) {
        const numCols    = 2;
        const itemsPerCol = Math.ceil(scrData.length / numCols);
        const colW = layout.w / numCols;
        const rowH = Math.min(8 * scale, layout.h / itemsPerCol);

        // Start from a row-height-based size, then shrink so that the longest
        // scrambled word + gap + answer word both fit inside colW.
        // Courier is monospace so scrambled and original have equal pixel widths.
        let fs = Math.max(6, rowH * 1.5 * pScale);
        doc.setFont('courier', 'bold');
        doc.setFontSize(fs);
        const maxWordW = Math.max(...scrData.map(s => doc.getTextWidth(s.original)));
        const needed = 2 * maxWordW + 6 * scale; // scrambled + gap + answer
        if (needed > colW) {
            fs = Math.max(5, fs * (colW - 6 * scale) / (2 * maxWordW));
            doc.setFontSize(fs);
        }

        let cx = layout.x, cy = layout.y + rowH;

        scrData.forEach((s, i) => {
            if (i > 0 && i % itemsPerCol === 0) { cx += colW; cy = layout.y + rowH; }

            doc.setFont('courier', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(s.scrambled, cx + 2 * scale, cy);

            const scramW = doc.getTextWidth(s.scrambled);
            const lineStart = cx + 2 * scale + scramW + 2 * scale;
            const lineEnd = cx + colW - 2 * scale;
            if (lineEnd > lineStart) {
                doc.setDrawColor(100, 116, 139);
                doc.setLineWidth(0.2);
                doc.line(lineStart, cy + 1, lineEnd, cy + 1);
            }

            doc.setFont(pdfFont, 'bold');
            doc.setTextColor(220, 20, 60);
            doc.text(s.original, cx + colW - 2 * scale, cy, { align: 'right' });

            cy += rowH;
        });
    } else {
        const numCols = 2;
        const itemsPerCol = Math.ceil(scrData.length / numCols);
        const colW = layout.w / numCols;
        const maxRowH = 14 * pScale;
        const rowH = Math.min(maxRowH, (layout.h - 6 * scale) / itemsPerCol);
        const showExample = ctx.showExample || false;

        // Compute maximum scrambled word width to set a dynamic split point
        const scramFontPt = Math.min(13 * pScale, rowH * 1.8);
        doc.setFont('courier', 'bold');
        doc.setFontSize(scramFontPt);
        const maxScramW = Math.max(...scrData.map(s => doc.getTextWidth(s.scrambled)));
        const numLabelW = doc.getTextWidth(`${scrData.length}. `);
        const splitX = Math.min(numLabelW + maxScramW + 6 * scale, colW * 0.55);

        let cy = layout.y + 6 * scale;
        let cx = layout.x;

        scrData.forEach((s, i) => {
            if (i > 0 && i % itemsPerCol === 0) { cx += colW; cy = layout.y + 6 * scale; }

            const isEx = showExample && i === 0;

            // Row number
            doc.setFont(pdfFont, 'normal');
            doc.setFontSize(scramFontPt * 0.7);
            doc.setTextColor(100, 116, 139);
            doc.text(`${i + 1}.`, cx + 2 * scale, cy);

            // Scrambled word
            doc.setFont('courier', 'bold');
            doc.setFontSize(scramFontPt);
            doc.setTextColor(15, 23, 42);
            doc.text(s.scrambled, cx + numLabelW + 3 * scale, cy, { align: 'left' });

            const lineStartX = cx + splitX;
            const hintW = showHint ? 18 * scale : 0;
            const lineEndX = cx + colW - 4 * scale - hintW;

            if (isEx) {
                doc.setFont(pdfFont, 'bold');
                doc.setFontSize(scramFontPt);
                doc.setTextColor(37, 99, 235);
                doc.text(s.original, lineStartX + 2 * scale, cy);
                doc.setDrawColor(37, 99, 235);
                doc.setLineWidth(0.4);
                doc.line(lineStartX, cy + 2 * scale, lineEndX, cy + 2 * scale);
                doc.setFont(pdfFont, 'italic');
                doc.setFontSize(7 * pScale);
                doc.text('[EXAMPLE]', cx + colW - 2 * scale, cy, { align: 'right' });
                doc.setTextColor(15, 23, 42);
            } else {
                doc.setDrawColor(180, 180, 180);
                doc.setLineWidth(0.3);
                doc.line(lineStartX, cy + 2 * scale, lineEndX, cy + 2 * scale);

                if (showHint) {
                    doc.setFont(pdfFont, 'normal');
                    doc.setFontSize(9 * pScale);
                    doc.setTextColor(150, 150, 150);
                    doc.text(`(${s.original[0]}...)`, lineEndX + 2 * scale, cy, { align: 'left' });
                }
            }

            cy += rowH;
        });
    }
}
