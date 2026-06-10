// =============================================================
// pdf/pdfDrawNotes.js
// =============================================================
import { drawHeader } from './pdfHelpers.js';
import { drawWordSearch } from './pdfDrawWordSearch.js';
import { drawCrossword } from './pdfDrawCrossword.js';
import { drawScramble } from './pdfDrawScramble.js';

const sanitizePDFText = (text) => {
  if (typeof text !== 'string') return '';
  return text.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '').trim();
};

/**
 * Draw the notes/vocabulary page.
 *
 * @param {Object} ctx       - buildCtx() result
 * @param {Array}  notesList - puzzleData.notes
 * @param {number} startY    - Y after the header
 * @param {number} pScale
 */
export function drawNotes(ctx, notesList, startY, pScale) {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale, pdfFont, drawWatermark, notesConfig } = ctx;
    pScale = pScale || scale;
    let cy = startY;
    const availW = PAGE_WIDTH - MARGIN * 2;

    // Determine if this is a matching exercise
    const isMatching = notesList.length > 0 && notesList[0].matchLetter !== undefined;

    // Respect showTerm / showDef from settings
    const showTerm = notesConfig ? notesConfig.showTerm !== false : true;
    const showDef = notesConfig ? notesConfig.showDef !== false : true;

    // Column positions — proportional to the user's term-width setting, not scale-dependent
    const numColW = isMatching ? 20 : 10;
    const termFrac = (notesConfig?.termWidth || 20) / 100;
    let termColW = Math.max(28, (availW - numColW) * termFrac);

    // Ensure term column is wide enough that no term needs to wrap.
    if (notesList.length > 0) {
        doc.setFont(pdfFont, 'bold');
        doc.setFontSize(10 * pScale);
        const maxTermW = notesList.reduce((m, w) => Math.max(m, doc.getTextWidth(w.term)), 0);
        const minTermColW = Math.min(maxTermW + 4, (availW - numColW) * 0.70);
        if (minTermColW > termColW) termColW = minTermColW;
    }

    const termX = MARGIN + numColW;
    const defX = termX + termColW;
    const defW = availW - numColW - termColW;

    // Header row
    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(10 * pScale);
    doc.setTextColor(100, 116, 139);
    doc.text('#', MARGIN, cy);
    if (showTerm) doc.text('TERM', termX, cy);
    if (showDef) doc.text('DEFINITION', defX, cy);

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, cy + 2 * pScale, PAGE_WIDTH - MARGIN, cy + 2 * pScale);
    cy += 8 * pScale;

    const showExample = ctx.showExample || false;
    doc.setTextColor(15, 23, 42);
    notesList.forEach((w, i) => {
        const isExample = showExample && i === 0;
        const numStr = `${i + 1}.`;
        const clueBody = sanitizePDFText(w.clue);
        const letterCount = isMatching ? (w.clueTermLength ?? w.term.length) : w.term.length;
        const cluePrefix = isMatching ? `${w.matchLetter}. ` : '';
        const clueStr = `${cluePrefix}${clueBody} (${letterCount})`;

        doc.setFont(pdfFont, 'bold');
        const tLines = showTerm ? doc.splitTextToSize(w.term, termColW - 4) : [];
        doc.setFont(pdfFont, 'normal');
        const dLines = showDef ? doc.splitTextToSize(clueStr, defW) : [];
        const maxLines = Math.max(tLines.length, dLines.length, 1);

        const rowH = maxLines * 4.5 * pScale + 4.5 * pScale;
        if (cy + rowH > PAGE_HEIGHT - MARGIN) {
            doc.addPage();
            drawWatermark();
            cy = MARGIN + 10 * pScale;
        }

        if (i % 2 === 1 && !isExample) {
            doc.setFillColor(248, 250, 252);
            doc.rect(MARGIN, cy - 3.5 * pScale, availW, rowH, 'F');
        }

        doc.setFont(pdfFont, 'bold');
        doc.setTextColor(isExample ? 37 : 100, isExample ? 99 : 116, isExample ? 235 : 139);
        doc.text(numStr, MARGIN, cy);

        if (isMatching) {
            const boxX = MARGIN + doc.getTextWidth(numStr) + 2;
            const boxW = 8;
            const boxH = 4.5 * pScale;
            const boxY = cy - boxH + 1.2 * pScale;
            if (isExample) {
                doc.setFillColor(219, 234, 254);
                doc.rect(boxX, boxY, boxW, boxH, 'FD');
                doc.setDrawColor(37, 99, 235);
                doc.rect(boxX, boxY, boxW, boxH, 'S');
                doc.setFont(pdfFont, 'bold');
                doc.setFontSize(10 * pScale);
                doc.setTextColor(37, 99, 235);
                doc.text(w.correctLetter, boxX + boxW / 2, cy, { align: 'center' });
            } else {
                doc.setDrawColor(100, 116, 139);
                doc.setLineWidth(0.3);
                doc.rect(boxX, boxY, boxW, boxH, 'S');
            }
            doc.setFontSize(10 * pScale);
        }

        doc.setTextColor(15, 23, 42);
        if (showTerm) doc.text(tLines, termX, cy);

        if (showDef) {
            if (isMatching && cluePrefix) {
                doc.setFont(pdfFont, 'bold');
                doc.setTextColor(99, 102, 241);
                doc.text(cluePrefix, defX, cy);
                const prefixW = doc.getTextWidth(cluePrefix);
                doc.setFont(pdfFont, 'normal');
                doc.setTextColor(51, 65, 85);
                const bodyWithCount = `${clueBody} (${letterCount})`;
                const bodyLines = doc.splitTextToSize(bodyWithCount, defW - prefixW);
                bodyLines.forEach((line, idx) => {
                    doc.text(line, defX + (idx === 0 ? prefixW : 0), cy + idx * 4.5 * pScale);
                });
            } else {
                doc.setFont(pdfFont, 'normal');
                doc.setTextColor(51, 65, 85);
                doc.text(dLines, defX, cy);
            }
        }
        if (isExample && !isMatching && showDef) {
            // Show answer after the clue lines in blue
            const answerY = cy + (dLines.length * 4.5 * pScale);
            doc.setFont(pdfFont, 'bold');
            doc.setFontSize(9 * pScale);
            doc.setTextColor(37, 99, 235);
            doc.text(`[EXAMPLE ANSWER: ${w.term}]`, defX, answerY);
            doc.setFont(pdfFont, 'normal');
            doc.setFontSize(10 * pScale);
            doc.setTextColor(15, 23, 42);
        }

        cy += (maxLines * 4.5 * pScale) + 2 * pScale;
        // Extra space when example answer text is appended below the definition
        if (isExample && !isMatching && showDef) cy += 5 * pScale;
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, cy - 1.5 * pScale, PAGE_WIDTH - MARGIN, cy - 1.5 * pScale);
        cy += 2.5 * pScale;
    });
}

/**
 * Draw the master answer key page (four-quadrant layout).
 *
 * @param {Object} ctx           - buildCtx() result
 * @param {string} fullTitle
 * @param {string} subText
 * @param {Object} currentPuzzleData
 * @param {Object} selections    - { ws, cw, scr, notes }
 * @param {number} pScale
 */
export function drawMasterKeyPage(ctx, fullTitle, subText, currentPuzzleData, selections, pScale) {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale, pdfFont, drawWatermark } = ctx;
    pScale = pScale || scale;

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(28 * pScale);
    doc.setTextColor(15, 23, 42);
    doc.text(fullTitle.toUpperCase(), MARGIN, MARGIN + 10 * pScale);

    doc.setFont(pdfFont, 'italic');
    doc.setFontSize(11 * pScale);
    doc.setTextColor(100, 116, 139);
    doc.text(subText, MARGIN, MARGIN + 18 * pScale);

    doc.setFont(pdfFont, 'bold');
    doc.setFontSize(12 * pScale);
    doc.setTextColor(220, 20, 60);
    doc.text('TEACHER ANSWER KEY', PAGE_WIDTH - MARGIN, MARGIN + 10 * pScale, { align: 'right' });

    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, MARGIN + 25 * pScale, PAGE_WIDTH - MARGIN, MARGIN + 25 * pScale);

    const startY = MARGIN + 35 * pScale;
    const isMatching = currentPuzzleData.notes?.length > 0 && currentPuzzleData.notes[0].matchLetter !== undefined;
    const availW = PAGE_WIDTH - 2 * MARGIN, availH = PAGE_HEIGHT - startY - MARGIN;
    const qW = (availW - 10) / 2, qH = (availH - 10) / 2;

    const boxes = [
        { x: MARGIN, y: startY, w: qW, h: qH },
        { x: MARGIN + qW + 10, y: startY, w: qW, h: qH },
        { x: MARGIN, y: startY + qH + 10, w: qW, h: qH },
        { x: MARGIN + qW + 10, y: startY + qH + 10, w: qW, h: qH },
    ];

    const drawBoxTitle = (title, box) => {
        doc.setLineDashPattern([2, 2], 0);
        doc.setDrawColor(200);
        doc.setLineWidth(0.15);
        doc.roundedRect(box.x, box.y, box.w, box.h, 4, 4, 'S');
        doc.setLineDashPattern([], 0);

        doc.setFont(pdfFont, 'bold');
        doc.setFontSize(10 * pScale);
        doc.setTextColor(99, 102, 241);
        doc.text(title, box.x + 5 * pScale, box.y + 8 * pScale);

        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.15);
        doc.line(box.x + 5 * pScale, box.y + 11 * pScale, box.x + box.w - 5 * pScale, box.y + 11 * pScale);

        return { x: box.x + 5 * pScale, y: box.y + 15 * pScale, w: box.w - 10 * pScale, h: box.h - (15 * pScale + 5) };
    };

    let bIdx = 0;
    if (selections.ws && currentPuzzleData.ws) {
        const layout = drawBoxTitle('WORD SEARCH', boxes[bIdx]);
        drawWordSearch(ctx, currentPuzzleData.ws, layout, null, false, true, pScale);
        bIdx++;
    }
    if (selections.cw && currentPuzzleData.cw) {
        const layout = drawBoxTitle('CROSSWORD', boxes[bIdx]);
        drawCrossword(ctx, currentPuzzleData.cw, layout, true, pScale);
        bIdx++;
    }
    if (selections.scr && currentPuzzleData.scr) {
        const layout = drawBoxTitle('WORD SCRAMBLE', boxes[bIdx]);
        const modLayout = { ...layout, y: layout.y + 5 * pScale, h: layout.h - 5 * pScale };
        drawScramble(ctx, currentPuzzleData.scr, modLayout, true, false, pScale);
        bIdx++;
    }
    if (selections.notes && isMatching && currentPuzzleData.notes) {
        const layout = drawBoxTitle('MATCHING KEY', boxes[bIdx]);
        const numCols = 3;
        const itemsPerCol = Math.ceil(currentPuzzleData.notes.length / numCols);
        const colW = layout.w / numCols;
        const rowH = Math.min(8 * scale, layout.h / itemsPerCol);

        // Compute font size from row height, then shrink if the longest "N. TERM"
        // label overflows the column (leaves 6 mm for the bold correct-letter).
        let fs = Math.max(8, rowH * 1.5 * pScale);
        doc.setFont(pdfFont, 'normal');
        doc.setFontSize(fs);
        const maxLabelW = currentPuzzleData.notes.reduce(
            (m, n, i) => Math.max(m, doc.getTextWidth(`${i + 1}. ${n.term}`)), 0);
        const letterColW = 6 * scale;
        if (maxLabelW > colW - letterColW) {
            fs = Math.max(5, fs * (colW - letterColW) / maxLabelW);
            doc.setFontSize(fs);
        }

        let cx = layout.x, cy = layout.y + rowH;
        currentPuzzleData.notes.forEach((n, i) => {
            if (i > 0 && i % itemsPerCol === 0) { cx += colW; cy = layout.y + rowH; }
            doc.setFont(pdfFont, 'normal');
            doc.setTextColor(15, 23, 42);
            doc.text(`${i + 1}. ${n.term}`, cx + 2, cy);
            doc.setFont(pdfFont, 'bold');
            doc.setTextColor(220, 20, 60);
            doc.text(n.correctLetter, cx + colW - 4, cy, { align: 'right' });
            doc.setFont(pdfFont, 'normal');
            cy += rowH;
        });
    }
}
