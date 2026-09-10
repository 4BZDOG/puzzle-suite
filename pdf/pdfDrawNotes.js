// =============================================================
// pdf/pdfDrawNotes.js
// =============================================================
import { drawHeader, drawExamplePill, examplePillWidth, drawLeader, drawRuledArea, setFontSafe, PALETTE } from './pdfHelpers.js';
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
    const availH = PAGE_HEIGHT - MARGIN - startY;

    const isMatching = notesList[0].matchLetter !== undefined;
    const showTerm = notesConfig ? notesConfig.showTerm !== false : true;
    const showDef  = notesConfig ? notesConfig.showDef !== false : true;
    const showLetterCount = ctx.showLetterCount !== false;
    const showExample = ctx.showExample || false;

    const numColW = isMatching ? 20 : 10;
    const termFrac = (notesConfig?.termWidth || 20) / 100;
    const termX = MARGIN + numColW;

    // The term column has to be measured at the size the row will actually
    // be drawn at — the vertical fit below can grow the type, and a column
    // sized for 10pt would then wrap "COORDINATE" onto two lines.
    const termColWFor = (fontPt) => {
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fontPt);
        const widest = notesList.reduce((m, w) => Math.max(m, doc.getTextWidth(w.term)), 0);
        return Math.min(
            Math.max((availW - numColW) * termFrac, 28, widest + 5),
            (availW - numColW) * 0.70);
    };

    // Row text, per candidate scale k
    const rowText = (w) => {
        const clueBody = sanitizePDFText(w.clue);
        const letterCount = isMatching ? (w.clueTermLength ?? w.term.length) : w.term.length;
        return {
            prefix: isMatching ? `${w.matchLetter}. ` : '',
            body: showLetterCount ? `${clueBody} (${letterCount})` : clueBody,
        };
    };

    const measure = (k) => {
        const fontPt = 10 * pScale * k;
        const lineH  = 4.5 * pScale * k;
        const pad    = 3.5 * pScale * k;
        const termColW = termColWFor(fontPt);
        const defX = termX + termColW;
        const defW = availW - numColW - termColW;
        let total = 8 * pScale * k;   // header row
        const rows = notesList.map((w, i) => {
            setFontSafe(doc, pdfFont, 'bold');
            doc.setFontSize(fontPt);
            const tLines = showTerm ? doc.splitTextToSize(w.term, termColW - 4) : [];
            setFontSafe(doc, pdfFont, 'normal');
            doc.setFontSize(fontPt);
            const t = rowText(w);
            const prefixW = t.prefix ? doc.getTextWidth(t.prefix) : 0;
            const isExample = showExample && i === 0;
            const reserve = isExample ? examplePillWidth(doc, { pScale, pdfFont }) + 2 : 0;
            const dLines = showDef
                ? doc.splitTextToSize(t.body, Math.max(20, defW - prefixW - reserve))
                : [];
            const maxLines = Math.max(tLines.length, dLines.length, 1);
            const h = maxLines * lineH + pad;
            total += h;
            return { tLines, dLines, maxLines, h, prefixW, ...t };
        });
        return { rows, total, fontPt, lineH, pad, k, termColW, defX, defW };
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
    const { rows, fontPt, lineH, pad, k, defX, defW } = best;
    const ruleGap = 1.5 * pScale * k;   // text baseline → hairline rule
    // Any leftover goes half above the table, so it reads as margin.
    let cy = startY + Math.max(0, Math.min(14 * pScale, (availH - best.total) / 2));

    // ---- Header row ----
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(Math.min(11 * pScale, fontPt));
    doc.setTextColor(...PALETTE.muted);
    doc.text('#', MARGIN, cy);
    if (showTerm) doc.text('TERM', termX, cy);
    if (showDef) doc.text(isMatching ? 'DEFINITIONS (IN A DIFFERENT ORDER)' : 'DEFINITION', defX, cy);
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, cy + 2 * pScale, PAGE_WIDTH - MARGIN, cy + 2 * pScale);
    cy += 8 * pScale;

    // ---- Rows ----
    notesList.forEach((w, i) => {
        const r = rows[i];
        const isExample = showExample && i === 0;

        if (cy + r.h > PAGE_HEIGHT - MARGIN) {
            doc.addPage();
            drawWatermark();
            cy = MARGIN + 10 * pScale;
        }

        if (isExample) {
            doc.setFillColor(...PALETTE.exampleBg);
            doc.rect(MARGIN, cy - pad + 1, availW, r.h, 'F');
        } else if (i % 2 === 1) {
            doc.setFillColor(...PALETTE.band);
            doc.rect(MARGIN, cy - pad + 1, availW, r.h, 'F');
        }

        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fontPt);
        doc.setTextColor(...(isExample ? PALETTE.example : PALETTE.muted));
        const numStr = `${i + 1}.`;
        doc.text(numStr, MARGIN, cy);

        if (isMatching) {
            const boxX = MARGIN + doc.getTextWidth(numStr) + 2;
            const boxW = 8, boxH = 4.5 * pScale;
            const boxY = cy - boxH + 1.2 * pScale;
            if (isExample) {
                doc.setFillColor(...PALETTE.exampleBg);
                doc.setDrawColor(...PALETTE.example);
                doc.setLineWidth(0.4);
                doc.rect(boxX, boxY, boxW, boxH, 'FD');
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(fontPt);
                doc.setTextColor(...PALETTE.example);
                doc.text(w.correctLetter, boxX + boxW / 2, cy, { align: 'center' });
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
            doc.text(r.tLines, termX, cy);
        }

        if (showDef) {
            let lastLineW = 0;
            if (r.prefix) {
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(fontPt);
                doc.setTextColor(99, 102, 241);
                doc.text(r.prefix, defX, cy);
            }
            setFontSafe(doc, pdfFont, 'normal');
            doc.setFontSize(fontPt);
            doc.setTextColor(...PALETTE.body);
            r.dLines.forEach((line, idx) => {
                doc.text(line, defX + (idx === 0 ? r.prefixW : 0), cy + idx * lineH);
                if (idx === r.dLines.length - 1) lastLineW = doc.getTextWidth(line) + (idx === 0 ? r.prefixW : 0);
            });

            if (isExample) {
                const lastY = cy + Math.max(0, r.dLines.length - 1) * lineH;
                // Only spell out the answer when the term column is hidden —
                // otherwise the term is already sitting on the same row.
                let pillX = defX + lastLineW + 2;
                if (!showTerm && !isMatching) {
                    setFontSafe(doc, pdfFont, 'bold');
                    doc.setTextColor(...PALETTE.example);
                    doc.text(w.term, pillX, lastY);
                    pillX += doc.getTextWidth(w.term) + 2;
                }
                const pillW = examplePillWidth(doc, { pScale, pdfFont });
                drawExamplePill(doc, Math.min(pillX, MARGIN + availW - pillW), lastY, { pScale, pdfFont });
            }
        }

        cy += r.maxLines * lineH + ruleGap;
        doc.setDrawColor(...PALETTE.rule);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, cy - 1 * pScale, PAGE_WIDTH - MARGIN, cy - 1 * pScale);
        cy += pad - ruleGap;
    });

    // Adaptive flow: a short list cannot fill an A4 sheet without absurd
    // type, so hand the leftover to the student as ruled working space.
    const leftover = (startY + availH) - cy;
    if (leftover > 40 * pScale && doc.internal.getNumberOfPages() >= 1) {
        drawRuledArea(doc, MARGIN, cy + 10 * pScale, availW, leftover - 14 * pScale,
            { pScale, pdfFont, label: 'NOTES', lineGap: 9 });
    }
}

/**
 * Draw the master answer key page.
 *
 * The quadrant grid adapts to how many keys are actually on it, so two
 * keys get half a page each rather than a quarter each.
 */
export function drawMasterKeyPage(ctx, fullTitle, subText, currentPuzzleData, selections, pScale) {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale, pdfFont } = ctx;
    pScale = pScale || scale;

    const startY = drawHeader(ctx, fullTitle, subText, 'Solutions for every activity in this set.',
        true, '', pScale, { label: 'ANSWER KEY', accent: PALETTE.key });

    const isMatching = currentPuzzleData.notes?.length > 0 && currentPuzzleData.notes[0].matchLetter !== undefined;
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
