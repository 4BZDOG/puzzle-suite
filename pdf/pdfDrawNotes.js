// =============================================================
// pdf/pdfDrawNotes.js
// =============================================================
import { drawHeader, drawExamplePill, examplePillWidth, placeExamplePill, drawLeader, drawRuledArea, setFontSafe, PALETTE } from './pdfHelpers.js';
import { isMatchingNotes, exampleDefIndex, stripLetterCount } from '../core/notesModel.js';
import { drawWordSearch } from './pdfDrawWordSearch.js';
import { drawCrossword } from './pdfDrawCrossword.js';
import { drawScramble } from './pdfDrawScramble.js';

const sanitizePDFText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();
};

/** Trim a label to fit `maxW`, adding an ellipsis. Assumes font is set. */
function fitLabel(doc, label, maxW) {
    if (doc.getTextWidth(label) <= maxW) return label;
    let out = label;
    while (out.length > 4 && doc.getTextWidth(out + '…') > maxW) out = out.slice(0, -1);
    return out + '…';
}

/**
 * Draw the notes/vocabulary page.
 *
 * The table is measured before it is drawn, then scaled to fill the
 * page: a six-word list no longer leaves a third of the sheet blank,
 * and a fifty-word list tightens instead of spilling onto page two.
 *
 * Geometry: rules and zebra bands run margin to margin, but every letter
 * and answer box sits `padX` inside them, and each row's text block is
 * centred vertically in its band. The column widths depend on the type
 * size, so they are solved inside `measure(k)` with the rest of the fit.
 *
 * @param {Object} ctx       - buildCtx() result
 * @param {Array}  notesList - puzzleData.notes
 * @param {number} startY    - Y after the header
 * @param {number} pScale
 */
export function drawNotes(ctx, notesList, startY, pScale) {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale, pdfFont, drawWatermark, notesConfig } = ctx;
    pScale = pScale || scale;
    if (!notesList || !notesList.length) return;

    const availW = PAGE_WIDTH - MARGIN * 2;
    // The table stops FOOT_CLEAR short of the bottom margin so the last rule
    // never crowds the running footer hairline beneath it.
    const FOOT_CLEAR = 6;
    const bottomY = PAGE_HEIGHT - MARGIN - FOOT_CLEAR;
    const availH = bottomY - startY;
    // Inset for every letter and answer box, from both the band edges and the
    // page rules, so no text ever touches the edge of its row.
    const padX = 2.5 * pScale;

    const isMatching = isMatchingNotes(notesList);
    const showTerm = notesConfig ? notesConfig.showTerm !== false : true;
    const showDef  = notesConfig ? notesConfig.showDef !== false : true;
    // A letter count beside a shuffled definition gives the answer away —
    // only one word in a list has three letters, only one has twelve. The
    // hint belongs on crossword clues, not on a matching sheet.
    const showLetterCount = !isMatching && ctx.showLetterCount !== false;
    const showExample = ctx.showExample || false;

    const termFrac = (notesConfig?.termWidth || 27) / 100;

    // The term side of the worked example is always row 1. The definition
    // beside it belongs to a DIFFERENT term once the definitions are
    // shuffled, so the EXAMPLE badge has to follow the definition that
    // actually describes term 1 instead of being pinned to row A.
    const exTermIdx = showExample ? 0 : -1;
    const exDefIdx  = showExample ? exampleDefIndex(notesList) : -1;

    // The term column has to be measured at the size the row will actually
    // be drawn at — the vertical fit below can grow the type, and a column
    // sized for 10pt would then wrap "COORDINATE" onto two lines. The pool
    // runs to the right inset, so the definition column ends at padX too.
    const termColWFor = (fontPt, numColW) => {
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fontPt);
        const widest = notesList.reduce((m, w) => Math.max(m, doc.getTextWidth(w.term)), 0);
        const pool = availW - numColW - padX;
        return Math.min(
            Math.max(pool * termFrac, 28, widest + 5),
            pool * 0.70);
    };

    // Row text, per candidate scale k
    const rowText = (w) => {
        const clueBody = stripLetterCount(sanitizePDFText(w.clue));
        const letterCount = isMatching ? (w.clueTermLength ?? w.term.length) : w.term.length;
        return {
            prefix: isMatching ? `${w.matchLetter}. ` : '',
            body: showLetterCount ? `${clueBody} (${letterCount})` : clueBody,
        };
    };

    const measure = (k) => {
        const fontPt = 10 * pScale * k;
        const sz     = fontPt * 0.3528;   // type size in mm
        const capH   = 0.72 * sz;         // cap height in mm
        const lineH  = 4.5 * pScale * k;
        const pad    = 4.5 * pScale * k;

        // ---- Columns, solved at this type size ---------------------------
        // The row number is right-aligned 3 mm short of the term column (or
        // the answer box). In matching mode the box follows the number and
        // the term sits after the box.
        const numW     = Math.max(11, availW * 0.06);
        const boxH     = isMatching ? Math.min(1.45 * sz, 6.5) : 0;
        const boxW     = isMatching ? Math.min(boxH * 1.7, 11) : 0;
        const boxColW  = isMatching ? boxW + 4 : 0;
        const numColW  = padX + numW + boxColW;
        const numRight = MARGIN + padX + numW - 3;
        const boxX     = MARGIN + padX + numW;
        const termX    = MARGIN + numColW;
        const termColW = termColWFor(fontPt, numColW);
        const defX     = termX + termColW;
        const defW     = (PAGE_WIDTH - MARGIN - padX) - defX;

        const pillW = examplePillWidth(doc, { pScale, pdfFont });
        // The letter label is drawn bold, so it is measured bold, and every
        // definition starts at the widest label's edge. Measured in the body
        // weight, "F." came out narrower than it drew and ran into its text.
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fontPt);
        const prefixCol = isMatching
            ? notesList.reduce((m, w) => Math.max(m, doc.getTextWidth(`${w.matchLetter}. `)), 0) + 1.4
            : 0;

        // Header: baseline to heavy rule, then the rows.
        let total = 2 * pScale;
        const rows = notesList.map((w, i) => {
            setFontSafe(doc, pdfFont, 'bold');
            doc.setFontSize(fontPt);
            const tLines = showTerm ? doc.splitTextToSize(w.term, termColW - 4) : [];
            const isExDef = i === exDefIdx;
            // A hidden term column means the example row spells the answer
            // out beside its definition; that echo needs reserving too, or
            // the pill gets pushed past the margin and clamped onto the text.
            const echoW = (isExDef && !showTerm && !isMatching)
                ? doc.getTextWidth(w.term) + 2 : 0;

            setFontSafe(doc, pdfFont, 'normal');
            doc.setFontSize(fontPt);
            const t = rowText(w);
            const prefixW = t.prefix ? prefixCol : 0;
            const reserve = isExDef ? pillW + 2 + echoW : 0;
            const dLines = showDef
                ? doc.splitTextToSize(t.body, Math.max(20, defW - prefixW - reserve))
                : [];

            // Where the last line of the definition ends, so the pill can be
            // placed against it (and measured for) identically in both passes.
            let lastLineW = 0;
            if (dLines.length) {
                lastLineW = doc.getTextWidth(dLines[dLines.length - 1]) + prefixW;   // hanging indent: every line sits right of the letter
            }
            const pillOwnLine = isExDef && showDef &&
                (lastLineW + echoW + 2 + pillW > defW);

            // The row is one line taller when the pill drops to its own line.
            const maxLines = Math.max(tLines.length, dLines.length, 1);
            const extra    = pillOwnLine ? 1 : 0;
            const h        = (maxLines + extra) * lineH + pad;
            // Cap-top of the first line to the last baseline: the block that
            // is centred in the band.
            const blockH   = capH + (maxLines - 1 + extra) * lineH;
            total += h;
            return { tLines, dLines, maxLines, h, blockH, prefixW, lastLineW, echoW, pillOwnLine, ...t };
        });

        const geom = { padX, numW, numRight, numColW, boxX, boxW, boxH, boxColW,
            termX, termColW, defX, defW, prefixCol };
        return { rows, total, fontPt, lineH, capH, k, geom };
    };

    // Largest k (leading + type size together) that still fits one page.
    const K_MIN = 0.72, K_MAX = 1.7;
    let lo = K_MIN, hi = K_MAX, best = measure(K_MIN);
    if (measure(K_MAX).total <= availH) {
        best = measure(K_MAX);
    } else {
        for (let it = 0; it < 12; it++) {
            const mid = (lo + hi) / 2;
            const m = measure(mid);
            if (m.total <= availH) { best = m; lo = mid; } else { hi = mid; }
        }
    }
    const { rows, fontPt, lineH, capH } = best;
    const { numRight, boxX, boxW, boxH, termX, defX, defW, prefixCol } = best.geom;
    // Any leftover goes half above the table, so it reads as margin.
    let cy = startY + Math.max(0, Math.min(14 * pScale, (availH - best.total) / 2));

    // ---- Header row ----
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(Math.min(11 * pScale, fontPt));
    doc.setTextColor(...PALETTE.muted);
    doc.text('#', numRight, cy, { align: 'right' });
    if (showTerm) doc.text('TERM', termX, cy);
    if (showDef) doc.text(isMatching ? 'DEFINITIONS (IN A DIFFERENT ORDER)' : 'DEFINITION', defX, cy);
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, cy + 2 * pScale, PAGE_WIDTH - MARGIN, cy + 2 * pScale);
    // The top edge of the first band is the heavy rule.
    let rowTop = cy + 2 * pScale;

    // Hairline rules are drawn after each page's bands and text, so a
    // banded row cannot paint over the rule above it.
    let pendingRules = [];
    const flushRules = () => {
        doc.setDrawColor(...PALETTE.rule);
        doc.setLineWidth(0.2);
        pendingRules.forEach(y => doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y));
        pendingRules = [];
    };

    // ---- Rows ----
    notesList.forEach((w, i) => {
        const r = rows[i];
        const isExTerm = i === exTermIdx;
        const isExDef  = i === exDefIdx;

        if (rowTop + r.h > bottomY) {
            flushRules();
            doc.addPage();
            drawWatermark();
            rowTop = MARGIN + 10 * pScale;
        }

        // Vertical centring: the block from the top of the capitals to the
        // last baseline sits in the middle of the band, so the space above
        // the first line equals the space below the last one.
        const base    = rowTop + (r.h - r.blockH) / 2 + capH;
        const centreY = base - capH / 2;

        // Zebra striping stays uniform across the whole table. Tinting only
        // the left half of row 1 and only the right half of row 16 broke the
        // alternating bands into a checkerboard, which read as a rendering
        // fault rather than as emphasis.
        if (i % 2 === 1) {
            doc.setFillColor(...PALETTE.band);
            doc.rect(MARGIN, rowTop, availW, r.h, 'F');
        }
        // No bounding box around the example. A fill broke the zebra bands
        // into a checkerboard and an outline clipped the row number it ran
        // through. The example is already unmistakable from its own content:
        // a blue row number, the prefilled blue answer letter, and the
        // EXAMPLE badge on the definition that answers it.

        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fontPt);
        doc.setTextColor(...(isExTerm ? PALETTE.example : PALETTE.muted));
        // Right-aligned so 9. and 10. share a column edge and a two-digit
        // number keeps the same gap to its term as a one-digit one.
        doc.text(`${i + 1}.`, numRight, base, { align: 'right' });

        if (isMatching) {
            // The box is centred on the FIRST line, never on the whole block,
            // so a two-line definition leaves its answer box level with the
            // number and term beside it.
            const boxY = centreY - boxH / 2;
            if (isExTerm) {
                doc.setFillColor(...PALETTE.exampleBg);
                doc.setDrawColor(...PALETTE.example);
                doc.setLineWidth(0.4);
                doc.rect(boxX, boxY, boxW, boxH, 'FD');
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(fontPt);
                doc.setTextColor(...PALETTE.example);
                doc.text(w.correctLetter, boxX + boxW / 2, centreY + capH / 2, { align: 'center' });
            } else {
                doc.setDrawColor(...PALETTE.muted);
                doc.setLineWidth(0.3);
                doc.rect(boxX, boxY, boxW, boxH, 'S');
            }
        }

        if (showTerm) {
            setFontSafe(doc, pdfFont, 'bold');
            doc.setFontSize(fontPt);
            doc.setTextColor(...PALETTE.ink);
            // Each line is placed on the shared leading, so a wrapped term
            // stays inside the block that is centred in the band.
            r.tLines.forEach((line, idx) => doc.text(line, termX, base + idx * lineH));
        }

        if (showDef) {
            if (r.prefix) {
                // Labels are right-aligned to one edge, so "I." and "M." both
                // leave the same gap before the definition.
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(fontPt);
                doc.setTextColor(99, 102, 241);
                doc.text(r.prefix.trimEnd(), defX + prefixCol - 1.0, base, { align: 'right' });
            }
            setFontSafe(doc, pdfFont, 'normal');
            doc.setFontSize(fontPt);
            doc.setTextColor(...PALETTE.body);
            r.dLines.forEach((line, idx) => {
                doc.text(line, defX + r.prefixW, base + idx * lineH);
            });

            if (isExDef) {
                const lastY = base + Math.max(0, r.dLines.length - 1) * lineH;
                let endX = defX + r.lastLineW;
                // Only spell out the answer when the term column is hidden —
                // otherwise the term is already sitting on the same row.
                if (!showTerm && !isMatching) {
                    setFontSafe(doc, pdfFont, 'bold');
                    doc.setFontSize(fontPt);
                    doc.setTextColor(...PALETTE.example);
                    doc.text(w.term, endX + 2, lastY);
                    endX += 2 + doc.getTextWidth(w.term);
                }
                const spot = placeExamplePill(doc, {
                    boxX: defX, boxW: defW, textEndX: endX,
                    baselineY: lastY, lineH, pScale, pdfFont,
                });
                drawExamplePill(doc, spot.x, spot.y, { pScale, pdfFont });
            }
        }

        rowTop += r.h;
        pendingRules.push(rowTop);
    });
    flushRules();

    // Adaptive flow: a short list cannot fill an A4 sheet without absurd
    // type, so hand the leftover to the student as ruled working space.
    const leftover = (startY + availH) - rowTop;
    if (leftover > 40 * pScale && doc.internal.getNumberOfPages() >= 1) {
        drawRuledArea(doc, MARGIN, rowTop + 10 * pScale, availW, leftover - 14 * pScale,
            { pScale, pdfFont, label: 'NOTES', lineGap: 9 });
    }
}

/**
 * Draw the master answer key page.
 *
 * The quadrant grid adapts to how many keys are actually on it, so two
 * keys get half a page each rather than a quarter each.
 */
export function drawMasterKeyPage(ctx, fullTitle, subText, currentPuzzleData, selections, pScale, setLabel = '') {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale, pdfFont } = ctx;
    pScale = pScale || scale;

    // The key names its set in the header banner, not just the footer: in an
    // appendix of 25 keys the teacher needs to see which one they are holding.
    const startY = drawHeader(ctx, fullTitle, subText, 'Solutions for every activity in this set.',
        true, setLabel ? setLabel.toUpperCase() : '', pScale,
        { label: 'ANSWER KEY', accent: PALETTE.key });

    const isMatching = isMatchingNotes(currentPuzzleData.notes);
    const availW = PAGE_WIDTH - 2 * MARGIN, availH = PAGE_HEIGHT - startY - MARGIN - 6;

    const panels = [];
    if (selections.ws && currentPuzzleData.ws) panels.push('ws');
    if (selections.cw && currentPuzzleData.cw) panels.push('cw');
    if (selections.scr && currentPuzzleData.scr) panels.push('scr');
    if (selections.notes && isMatching && currentPuzzleData.notes) panels.push('notes');
    if (!panels.length) return;

    const GAP = 8;
    const cols = panels.length === 1 ? 1 : 2;
    const rows = Math.ceil(panels.length / cols);
    const qW = (availW - GAP * (cols - 1)) / cols;
    const qH = (availH - GAP * (rows - 1)) / rows;
    const boxFor = (i) => ({
        x: MARGIN + (i % cols) * (qW + GAP),
        y: startY + Math.floor(i / cols) * (qH + GAP),
        w: qW, h: qH,
    });

    const drawBoxTitle = (title, box) => {
        doc.setLineDashPattern([2, 2], 0);
        doc.setDrawColor(200);
        doc.setLineWidth(0.15);
        doc.roundedRect(box.x, box.y, box.w, box.h, 4, 4, 'S');
        doc.setLineDashPattern([], 0);

        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(10 * pScale);
        doc.setTextColor(99, 102, 241);
        doc.text(title, box.x + 5 * pScale, box.y + 8 * pScale);

        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.15);
        doc.line(box.x + 5 * pScale, box.y + 11 * pScale, box.x + box.w - 5 * pScale, box.y + 11 * pScale);

        return { x: box.x + 5 * pScale, y: box.y + 15 * pScale, w: box.w - 10 * pScale, h: box.h - (15 * pScale + 5) };
    };

    panels.forEach((kind, i) => {
        const box = boxFor(i);
        if (kind === 'ws') {
            drawWordSearch(ctx, currentPuzzleData.ws, drawBoxTitle('WORD SEARCH', box), null, false, true, pScale);
        } else if (kind === 'cw') {
            drawCrossword(ctx, currentPuzzleData.cw, drawBoxTitle('CROSSWORD', box), true, pScale);
        } else if (kind === 'scr') {
            const layout = drawBoxTitle('WORD SCRAMBLE', box);
            drawScramble(ctx, currentPuzzleData.scr, { ...layout, y: layout.y + 5 * pScale, h: layout.h - 5 * pScale }, true, false, pScale);
        } else {
            drawMatchingKey(ctx, currentPuzzleData.notes, drawBoxTitle('MATCHING KEY', box), pScale);
        }
    });
}

/**
 * Matching key: "12. PHOTOSYNTHESIS ···· G".
 *
 * The answer letter owns a reserved column and the term is trimmed to
 * what is left, so a long term can never run into its answer letter
 * (the old layout produced "9. SUBSTITUTIONG").
 */
export function drawMatchingKey(ctx, notes, layout, pScale) {
    const { doc, pdfFont, scale } = ctx;
    pScale = pScale || scale;
    if (!notes?.length) return;

    const numCols = notes.length > 24 ? 3 : notes.length > 10 ? 2 : 1;
    const itemsPerCol = Math.ceil(notes.length / numCols);
    const colW = layout.w / numCols;
    const rowH = Math.max(3.6, Math.min(8 * scale, layout.h / itemsPerCol));

    const letterColW = Math.max(4.5, 4 * scale);
    const gap = 2.5;
    const labelMaxW = colW - letterColW - gap - 3;

    // Size type from the row height, then only shrink for the widest label.
    let fs = Math.max(6, Math.min(11 * pScale, rowH * 2.0));
    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(fs);
    const widest = notes.reduce((m, n, i) => Math.max(m, doc.getTextWidth(`${i + 1}. ${n.term}`)), 0);
    if (widest > labelMaxW) fs = Math.max(5.5, fs * labelMaxW / widest);

    notes.forEach((n, i) => {
        const col = Math.floor(i / itemsPerCol);
        const cx = layout.x + col * colW;
        const cy = layout.y + rowH + (i % itemsPerCol) * rowH;

        setFontSafe(doc, pdfFont, 'normal');
        doc.setFontSize(fs);
        doc.setTextColor(...PALETTE.ink);
        const label = fitLabel(doc, `${i + 1}. ${n.term}`, labelMaxW);
        doc.text(label, cx + 1, cy);

        const labelEnd = cx + 1 + doc.getTextWidth(label);
        const letterX = cx + colW - gap;
        drawLeader(doc, labelEnd + 1.5, letterX - letterColW, cy - fs * 0.12);

        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fs);
        doc.setTextColor(...PALETTE.key);
        doc.text(n.correctLetter, letterX, cy, { align: 'right' });
    });
    doc.setTextColor(...PALETTE.ink);
}
