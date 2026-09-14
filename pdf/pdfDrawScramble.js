// =============================================================
// pdf/pdfDrawScramble.js
// =============================================================
import { PALETTE, drawExamplePill, examplePillWidth, drawLeader, setFontSafe } from './pdfHelpers.js';

/**
 * Draw a word-scramble puzzle onto the PDF.
 *
 * Rows are distributed across the whole page rather than stacked at the
 * top under a fixed row height, and the run-up to each answer line is
 * filled with a dotted leader so the gap reads as a deliberate rule
 * instead of a hole in the layout.
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
        _drawScrambleKey(ctx, scrData, layout, pScale);
        return;
    }

    // ---- Word bank -------------------------------------------------
    // Unscrambling IUOSBUSNITTT with no hint at all is a memory test, not a
    // vocabulary exercise. The bank takes the foot of the page; the rows are
    // then budgeted into what is left.
    const bank = _bankLayout(ctx, scrData, layout.w, pScale);
    const bankH = bank ? bank.height : 0;

    // ---- Column count ----------------------------------------------
    // Two columns by default: twenty items down one column left a 12 cm
    // answer line beside a three-letter word and wasted half the width.
    const availH = layout.h - 6 * scale - bankH;
    const MIN_ROW = 9 * pScale, MAX_ROW = 22 * pScale;
    let numCols = scrData.length <= 8 ? 1 : scrData.length <= 24 ? 2 : 3;
    while (numCols < 3 && Math.ceil(scrData.length / numCols) * MIN_ROW > availH) numCols++;
    const itemsPerCol = Math.ceil(scrData.length / numCols);
    const colW = layout.w / numCols;
    const rowH = Math.min(MAX_ROW, availH / itemsPerCol);
    // Centre any leftover height instead of leaving it all at the foot.
    const topPad = Math.max(0, (availH - rowH * itemsPerCol) / 2);

    const showExample = ctx.showExample || false;
    const scramFontPt = Math.min(15 * pScale, Math.max(10 * pScale, rowH * 1.1));

    doc.setFont('courier', 'bold');
    doc.setFontSize(scramFontPt);
    const maxScramW = Math.max(...scrData.map(s => doc.getTextWidth(s.scrambled)));
    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(scramFontPt * 0.7);
    const numLabelW = doc.getTextWidth(`${scrData.length}. `) + 1;
    const splitX = Math.min(numLabelW + maxScramW + 8 * scale, colW * 0.52);

    scrData.forEach((s, i) => {
        const col = Math.floor(i / itemsPerCol);
        const cx = layout.x + col * colW;
        const cy = layout.y + 6 * scale + topPad + (i % itemsPerCol) * rowH + rowH * 0.55;
        const isEx = showExample && i === 0;

        // Row number
        setFontSafe(doc, pdfFont, 'normal');
        doc.setFontSize(scramFontPt * 0.7);
        doc.setTextColor(...PALETTE.muted);
        doc.text(`${i + 1}.`, cx + 2 * scale, cy);

        // Scrambled word
        doc.setFont('courier', 'bold');
        doc.setFontSize(scramFontPt);
        doc.setTextColor(...PALETTE.ink);
        const wordX = cx + numLabelW + 2 * scale;
        doc.text(s.scrambled, wordX, cy);
        const wordEnd = wordX + doc.getTextWidth(s.scrambled);

        const lineStartX = cx + splitX;
        const hintW = showHint && !isEx ? 18 * scale : 0;
        // A writing line only has to fit the word, not the rest of the column.
        const MAX_LINE = 52 * scale;
        const lineEndX = Math.min(cx + colW - 4 * scale - hintW, lineStartX + MAX_LINE);

        // Dotted leader bridges the gap to the answer line
        drawLeader(doc, wordEnd + 2, lineStartX - 1.5, cy);

        if (isEx) {
            // The pill owns the right-hand end of the row, and the worked
            // answer is sized to the width that leaves. Two columns halve the
            // room a one-column layout had, so a right-aligned pill would
            // otherwise land on top of a long answer like COORDINATE.
            const pillRight = cx + colW - 3 * scale;
            const pillW = examplePillWidth(doc, { pScale, pdfFont });
            const answerX = lineStartX + 2 * scale;
            const answerMaxW = Math.max(8, pillRight - pillW - 3 - answerX);

            setFontSafe(doc, pdfFont, 'bold');
            let answerPt = scramFontPt;
            doc.setFontSize(answerPt);
            if (doc.getTextWidth(s.original) > answerMaxW) {
                answerPt = Math.max(6.5, answerPt * answerMaxW / doc.getTextWidth(s.original));
                doc.setFontSize(answerPt);
            }
            doc.setTextColor(...PALETTE.example);
            doc.text(s.original, answerX, cy);

            doc.setDrawColor(...PALETTE.example);
            doc.setLineWidth(0.4);
            doc.line(lineStartX, cy + 2 * scale, Math.min(lineEndX, pillRight - pillW - 3),
                cy + 2 * scale);
            drawExamplePill(doc, pillRight, cy, { pScale, pdfFont, align: 'right' });
            doc.setTextColor(...PALETTE.ink);
        } else {
            doc.setDrawColor(180, 180, 180);
            doc.setLineWidth(0.3);
            doc.line(lineStartX, cy + 2 * scale, lineEndX, cy + 2 * scale);

            if (showHint) {
                setFontSafe(doc, pdfFont, 'normal');
                doc.setFontSize(9 * pScale);
                doc.setTextColor(150, 150, 150);
                doc.text(`(${s.original[0]}...)`, lineEndX + 2 * scale, cy);
            }
        }
    });

    if (bank) _drawBank(ctx, bank, layout.x, layout.y + layout.h - bankH, layout.w, pScale);
}

/**
 * Geometry for the word bank: every answer, alphabetised, in as many
 * columns as the widest word allows (up to four). Returns null when the
 * bank is switched off.
 */
function _bankLayout(ctx, scrData, availW, pScale) {
    const { doc, pdfFont, scale } = ctx;
    if (ctx.scrShowBank === false || !scrData.length) return null;
    const words = scrData.map(s => s.original).sort();
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(9.5 * pScale);
    const widest = words.reduce((m, w) => Math.max(m, doc.getTextWidth(w)), 0) + 8 * scale;
    const cols = Math.max(1, Math.min(4, Math.floor((availW - 8 * scale) / Math.max(widest, 1))));
    const rows = Math.ceil(words.length / cols);
    const rowH = 5.2 * pScale;
    return { words, cols, rows, rowH, colW: (availW - 8 * scale) / cols,
        height: 10 * pScale + rows * rowH + 6 * scale };
}

/** Framed WORD BANK box at the foot of the page. */
function _drawBank(ctx, bank, x, y, w, pScale) {
    const { doc, pdfFont, scale } = ctx;
    const { words, cols, rows, rowH, colW } = bank;

    doc.setDrawColor(...PALETTE.rule);
    doc.setLineWidth(0.4);
    doc.setFillColor(...PALETTE.band);
    doc.roundedRect(x, y, w, bank.height - 2 * scale, 2, 2, 'FD');

    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(8 * pScale);
    doc.setTextColor(...PALETTE.muted);
    doc.setCharSpace(0.4);
    doc.text('WORD BANK', x + 4 * scale, y + 6 * pScale);
    doc.setCharSpace(0);

    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(9.5 * pScale);
    doc.setTextColor(...PALETTE.ink);
    words.forEach((word, i) => {
        const c = Math.floor(i / rows), r = i % rows;
        doc.text(word, x + 4 * scale + c * colW, y + 11 * pScale + r * rowH);
    });
}

/**
 * Scramble answer key. The answer owns a reserved right-hand column and
 * the type size is solved from the widest pair, so a long word can never
 * collide with its own answer.
 */
function _drawScrambleKey(ctx, scrData, layout, pScale) {
    const { doc, scale, pdfFont } = ctx;
    const numCols = scrData.length > 14 ? 2 : 1;
    const itemsPerCol = Math.ceil(scrData.length / numCols);
    const colW = layout.w / numCols;
    const rowH = Math.max(3.6, Math.min(8 * scale, layout.h / itemsPerCol));

    const GAP = 4 * scale;  // leader room between the scramble and its answer
    // Courier is monospace, so width scales linearly with point size:
    // measure once at a reference size and solve for the largest that fits.
    const REF = 10;
    doc.setFont('courier', 'bold');
    doc.setFontSize(REF);
    const refW = Math.max(...scrData.map(s => doc.getTextWidth(s.scrambled)));
    const fitPt = refW > 0 ? (REF * (colW - GAP - 4 * scale)) / (2 * refW) : 11;
    const fs = Math.max(5.5, Math.min(11 * pScale, rowH * 2.0, fitPt));

    scrData.forEach((s, i) => {
        const col = Math.floor(i / itemsPerCol);
        const cx = layout.x + col * colW;
        const cy = layout.y + rowH + (i % itemsPerCol) * rowH;

        doc.setFont('courier', 'bold');
        doc.setFontSize(fs);
        doc.setTextColor(...PALETTE.ink);
        doc.text(s.scrambled, cx + 2 * scale, cy);
        const scramEnd = cx + 2 * scale + doc.getTextWidth(s.scrambled);

        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fs);
        doc.setTextColor(...PALETTE.key);
        const answerX = cx + colW - 2 * scale;
        const answerW = doc.getTextWidth(s.original);
        drawLeader(doc, scramEnd + 1.5, answerX - answerW - 1.5, cy - fs * 0.12);
        doc.text(s.original, answerX, cy, { align: 'right' });
    });
    doc.setTextColor(...PALETTE.ink);
}
