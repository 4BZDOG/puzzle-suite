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

        doc.setFontSize(Math.min(rowH * 2.5, Math.max(8, rowH * 1.5) * pScale));
        let cx = layout.x, cy = layout.y + rowH;

        scrData.forEach((s, i) => {
            if (i > 0 && i % itemsPerCol === 0) { cx += colW; cy = layout.y + rowH; }
            const splitX = cx + colW * 0.45;

            doc.setFont('courier', 'bold');
            doc.setTextColor(15, 23, 42);
            doc.text(s.scrambled, cx + 5 * scale, cy, { align: 'left' });

            doc.setDrawColor(100, 116, 139);
            doc.setLineWidth(0.2);
            doc.line(splitX, cy + 1, cx + colW - 2, cy + 1);

            doc.setFont(pdfFont, 'bold');
            doc.setTextColor(220, 20, 60);
            doc.text(s.original, cx + colW - 2, cy, { align: 'right' });

            cy += rowH;
        });
    } else {
        let cy = layout.y + 10 * scale;
        let cx = layout.x;
        const colW = layout.w / 2;

        scrData.forEach(s => {
            if (cy > ctx.PAGE_HEIGHT - ctx.MARGIN - 10 * scale) { cy = layout.y + 10 * scale; cx += colW; }

            doc.setFont('courier', 'bold');
            doc.setFontSize(14 * pScale);
            doc.setTextColor(15, 23, 42);

            const lineStartX = cx + colW * 0.40;
            doc.text(s.scrambled, cx + 10 * scale, cy, { align: 'left' });

            doc.setDrawColor(15, 23, 42);
            doc.setLineWidth(0.4);

            const lineEndX = showHint ? cx + colW - 20 * scale : cx + colW - 10 * scale;
            doc.line(lineStartX, cy + 2 * scale, lineEndX, cy + 2 * scale);

            if (showHint) {
                doc.setFont(pdfFont, 'normal');
                doc.setFontSize(10 * pScale);
                doc.setTextColor(100, 116, 139);
                doc.text(`(${s.original[0]}...)`, lineEndX + 3 * scale, cy, { align: 'left' });
            }

            cy += 12 * pScale;
        });
    }
}
