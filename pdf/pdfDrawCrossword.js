// =============================================================
// pdf/pdfDrawCrossword.js
// =============================================================
// The crossword is compiled, not just drawn: grid size and clue
// typography are solved together so that the grid and its clues
// always land on ONE page, and so that a short puzzle grows to fill
// the sheet instead of floating in the top half of it.
// =============================================================
import { PALETTE, drawExamplePill, examplePillWidth, setFontSafe } from './pdfHelpers.js';

const PT_CANDIDATES = [11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5];
const IDEAL_PT  = 9.5;   // below this, legibility stops improving the score
const MIN_CELL  = 4.6;   // mm — smaller than this is unwritable for a student
const MAX_CELL  = 12;
const GUTTER    = 7;     // mm between grid and clues

// ---- clue text + wrapping (shared by the measurer and the drawer) ----

function _clueStr(w, showLetterCount) {
    return showLetterCount ? `${w.clue} (${w.word.length})` : String(w.clue || '');
}

function _wrapClue(doc, w, colW, fontPt, pdfFont, showLetterCount, reserve = 0) {
    const numPrefix = `${w.num}. `;
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(fontPt);
    const numW = doc.getTextWidth(numPrefix);
    const hang = numW;
    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(fontPt);
    // `reserve` keeps the EXAMPLE pill from landing on top of the clue text.
    const lines = doc.splitTextToSize(_clueStr(w, showLetterCount), Math.max(12, colW - 3 - hang - reserve));
    return { numPrefix, numW, hang, lines };
}

const _lineH = fontPt => fontPt * 0.46;
const _gapH  = fontPt => fontPt * 0.18;
const _headH = fontPt => fontPt * 0.55 + 4;

/** Height a clue section (title + clues) needs, in mm. Memoised per call. */
function _makeMeasurer(ctx, exampleNum, pScale) {
    const { doc, pdfFont } = ctx;
    const showLetterCount = ctx.showLetterCount !== false;
    const cache = new Map();
    const pillW = exampleNum !== null ? examplePillWidth(doc, { pScale, pdfFont }) : 0;
    return function measure(list, listId, colW, fontPt) {
        if (!list.length) return 0;
        const key = `${listId}|${colW.toFixed(1)}|${fontPt.toFixed(2)}`;
        const hit = cache.get(key);
        if (hit !== undefined) return hit;
        let h = _headH(fontPt);
        list.forEach(w => {
            const reserve = w.num === exampleNum ? pillW : 0;
            const { lines } = _wrapClue(doc, w, colW, fontPt, pdfFont, showLetterCount, reserve);
            h += lines.length * _lineH(fontPt) + _gapH(fontPt);
        });
        cache.set(key, h);
        return h;
    };
}

/** Largest candidate point size whose block fits `availH`. null if none. */
function _bestPt(measureFn, availH, pScale) {
    if (!(availH > 0)) return null;
    for (const base of PT_CANDIDATES) {
        const pt = base * pScale;
        if (measureFn(pt) <= availH) return pt;
    }
    return null;
}

/**
 * Word-bank geometry. Column count comes from the width actually available
 * and the widest word — a bank in the narrow "clues beside the grid" column
 * has room for one or two columns, not the four a 4-letter word list allows.
 */
function _bankLayout(ctx, cwData, availW, pScale) {
    const { doc, pdfFont } = ctx;
    const words = cwData.placed.map(v => v.word).sort();
    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(9 * pScale);
    const widest = words.reduce((m, v) => Math.max(m, doc.getTextWidth(v)), 0) + 5;
    const cols = Math.max(1, Math.min(4, Math.floor(availW / Math.max(widest, 1))));
    const rows = Math.ceil(words.length / cols);
    return { words, cols, rows, colW: availW / cols, height: 6 * pScale + rows * 5 * pScale + 4 };
}

function _bankHeight(ctx, cwData, availW, pScale) {
    if (!ctx.cwShowBank || !cwData.placed.length) return 0;
    return _bankLayout(ctx, cwData, availW, pScale).height;
}

function _drawBank(ctx, cwData, x, y, w, pScale) {
    const { doc, pdfFont } = ctx;
    const { words, rows, colW } = _bankLayout(ctx, cwData, w, pScale);

    doc.setDrawColor(...PALETTE.rule);
    doc.setLineWidth(0.2);
    doc.line(x, y - 3, x + w, y - 3);
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(8 * pScale);
    doc.setTextColor(...PALETTE.muted);
    doc.text('WORD BANK', x, y + 1);

    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(9 * pScale);
    doc.setTextColor(...PALETTE.ink);
    words.forEach((word, i) => {
        const c = Math.floor(i / rows), r = i % rows;
        doc.text(word, x + c * colW, y + 6 * pScale + r * 5 * pScale);
    });
}

// ---- drawing ----

/**
 * Draw the grid. Clue numbers are drawn in BOTH student and key mode —
 * a teacher fielding "where's 12 Down?" needs them on the key too.
 */
function _drawGrid(ctx, cwData, ox, oy, cSize, isKey, exCells, exWord) {
    const { doc, mmToPt, pdfFont } = ctx;
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);

    const numPt  = Math.max(5.5, mmToPt(cSize) * (isKey ? 0.30 : 0.38));
    const charPt = mmToPt(cSize) * (isKey ? 0.50 : 0.62);

    for (let y = 0; y < cwData.rows; y++) {
        for (let x = 0; x < cwData.cols; x++) {
            const cell = cwData.grid[y][x];
            if (!cell) continue;
            const cx = ox + x * cSize, cy = oy + y * cSize;
            const isEx = exCells.has(`${x},${y}`);
            doc.setFillColor(...(isEx ? PALETTE.exampleBg : [255, 255, 255]));
            doc.setDrawColor(...PALETTE.ink);
            doc.setLineWidth(0.4);
            doc.rect(cx, cy, cSize, cSize, 'FD');

            if (cell.num) {
                setFontSafe(doc, pdfFont, 'normal');
                doc.setFontSize(numPt);
                doc.setTextColor(...(isKey ? PALETTE.muted : PALETTE.ink));
                doc.text(String(cell.num), cx + cSize * 0.09, cy + cSize * 0.07, { baseline: 'top' });
            }
            if (isKey) {
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(charPt);
                doc.setTextColor(...PALETTE.key);
                // Nudged down so the solution letter clears the clue number.
                doc.text(cell.char, cx + cSize * 0.55, cy + cSize * 0.68, { align: 'center', baseline: 'middle' });
            } else if (isEx && exWord) {
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(charPt);
                doc.setTextColor(...PALETTE.example);
                doc.text(exWord.word[x - exWord.x], cx + cSize / 2, cy + cSize / 2 + cSize * 0.05, { align: 'center', baseline: 'middle' });
            }
        }
    }
}

/** Draw one ACROSS/DOWN section; returns the y it finished at. */
function _drawClueSection(ctx, title, list, x, y, colW, fontPt, pScale, exampleNum) {
    const { doc, pdfFont } = ctx;
    if (!list.length) return y;
    const showLetterCount = ctx.showLetterCount !== false;
    const pillW = exampleNum !== null ? examplePillWidth(doc, { pScale, pdfFont }) : 0;

    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(Math.max(8.5, fontPt * 1.05));
    doc.setTextColor(...PALETTE.ink);
    doc.text(title, x, y);
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.3);
    doc.line(x, y + 1.6, x + colW - 3, y + 1.6);
    let cy = y + _headH(fontPt);

    const lineH = _lineH(fontPt), gapH = _gapH(fontPt);
    list.forEach(w => {
        const isEx = exampleNum !== null && w.num === exampleNum;
        const { numPrefix, numW, hang, lines } = _wrapClue(doc, w, colW, fontPt, pdfFont, showLetterCount, isEx ? pillW : 0);

        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(fontPt);
        doc.setTextColor(...(isEx ? PALETTE.example : PALETTE.ink));
        doc.text(numPrefix, x, cy);

        setFontSafe(doc, pdfFont, 'normal');
        doc.setTextColor(...(isEx ? PALETTE.example : PALETTE.body));
        lines.forEach((line, idx) => {
            doc.text(line, x + (idx === 0 ? numW : hang), cy + idx * lineH);
        });
        if (isEx) {
            setFontSafe(doc, pdfFont, 'normal');
            doc.setFontSize(fontPt);
            const lastW = doc.getTextWidth(lines[lines.length - 1] || '');
            const pillX = Math.min(
                x + (lines.length === 1 ? numW : hang) + lastW + 2,
                x + colW - pillW - 1);
            drawExamplePill(doc, pillX, cy + (lines.length - 1) * lineH, { pScale, pdfFont });
        }
        cy += lines.length * lineH + gapH;
    });
    doc.setTextColor(...PALETTE.ink);
    return cy;
}

// ---- public API ----

/**
 * Compile and draw a complete crossword page: grid + clues together.
 *
 * Tries two arrangements — clues beneath the grid, and clues in a
 * column beside it (which suits tall, narrow grids and soaks up the
 * whitespace a portrait grid leaves) — over a range of cell sizes, and
 * keeps the combination with the most legible clue type and the
 * biggest grid.
 *
 * @returns {{ splitNeeded: boolean }} splitNeeded=true when the clues
 *          genuinely cannot share the page even at minimum size; the
 *          caller should then draw drawCrosswordClues() on a new page.
 */
export function drawCrosswordPage(ctx, cwData, layout, pScale, forceSplit = false) {
    if (!cwData || !cwData.placed.length) return { splitNeeded: false };
    const { doc } = ctx;
    pScale = pScale || ctx.scale;

    const ac = cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
    const dn = cwData.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num);

    const showExample = ctx.showExample || false;
    const exWord = showExample ? (ac[0] || null) : null;
    const exCells = new Set();
    if (exWord) for (let i = 0; i < exWord.word.length; i++) exCells.add(`${exWord.x + i},${exWord.y}`);
    const exampleNum = exWord ? exWord.num : null;
    const measure = _makeMeasurer(ctx, exampleNum, pScale);

    // Grid-only mode (user opted into a dedicated clue page).
    if (forceSplit) {
        const cSize = Math.min(layout.w / cwData.cols, (layout.h * 0.95) / cwData.rows, MAX_CELL + 2);
        const gridW = cSize * cwData.cols, gridH = cSize * cwData.rows;
        _drawGrid(ctx, cwData, layout.x + (layout.w - gridW) / 2, layout.y + (layout.h - gridH) / 2,
            cSize, false, exCells, exWord);
        return { splitNeeded: true };
    }

    // ---- Search the layout space ----
    let best = null;
    const bankW = layout.w;
    const bankHBelow = _bankHeight(ctx, cwData, bankW, pScale);

    for (let cSize = MAX_CELL; cSize >= MIN_CELL - 0.001; cSize -= 0.25) {
        const gridW = cSize * cwData.cols, gridH = cSize * cwData.rows;
        if (gridW > layout.w || gridH > layout.h) continue;

        // (a) clues below the grid, two columns
        {
            const colW = layout.w / 2;
            const availH = layout.h - gridH - GUTTER - bankHBelow;
            const pt = _bestPt(p => Math.max(measure(ac, 'ac', colW, p), measure(dn, 'dn', colW, p)), availH, pScale);
            if (pt) {
                const score = Math.min(pt / pScale, IDEAL_PT) * 100 + cSize;
                if (!best || score > best.score) best = { mode: 'below', cSize, pt, colW, score, gridW, gridH };
            }
        }

        // (b) clues beside the grid, one column (good for tall grids)
        {
            const colW = layout.w - gridW - GUTTER;
            if (colW >= 58) {
                const bankHSide = ctx.cwShowBank ? _bankHeight(ctx, cwData, colW, pScale) : 0;
                const availH = layout.h - bankHSide;
                const pt = _bestPt(p => measure(ac, 'ac', colW, p) + measure(dn, 'dn', colW, p) + 3, availH, pScale);
                if (pt) {
                    // Slight preference for 'below' at equal legibility: a
                    // centred grid is the familiar worksheet shape.
                    const score = Math.min(pt / pScale, IDEAL_PT) * 100 + cSize - 0.4;
                    if (!best || score > best.score) best = { mode: 'beside', cSize, pt, colW, score, gridW, gridH };
                }
            }
        }
    }

    if (!best) {
        // Physically impossible on one page — fall back to a clue page.
        const cSize = Math.max(MIN_CELL, Math.min(layout.w / cwData.cols, (layout.h * 0.95) / cwData.rows, MAX_CELL));
        const gridW = cSize * cwData.cols, gridH = cSize * cwData.rows;
        _drawGrid(ctx, cwData, layout.x + (layout.w - gridW) / 2, layout.y + (layout.h - gridH) / 2,
            cSize, false, exCells, exWord);
        return { splitNeeded: true };
    }

    // ---- Draw the winning arrangement ----
    if (best.mode === 'below') {
        const ox = layout.x + (layout.w - best.gridW) / 2;
        const cluesTop = layout.y + best.gridH + GUTTER + _lineH(best.pt);
        const clueBlockH = Math.max(
            measure(ac, 'ac', best.colW, best.pt),
            measure(dn, 'dn', best.colW, best.pt));
        // Spread leftover space above and below the grid instead of
        // stacking it all at the foot of the page.
        const slack = Math.max(0, layout.h - best.gridH - GUTTER - clueBlockH - bankHBelow);
        const oy = layout.y + slack * 0.35;

        _drawGrid(ctx, cwData, ox, oy, best.cSize, false, exCells, exWord);
        const y0 = oy + best.gridH + GUTTER + _lineH(best.pt);
        _drawClueSection(ctx, 'ACROSS', ac, layout.x, y0, best.colW, best.pt, pScale, exampleNum);
        _drawClueSection(ctx, 'DOWN', dn, layout.x + best.colW, y0, best.colW, best.pt, pScale, null);
        if (ctx.cwShowBank) _drawBank(ctx, cwData, layout.x, layout.y + layout.h - bankHBelow + 6, bankW, pScale);
    } else {
        const oy = layout.y + Math.max(0, (layout.h - best.gridH) * 0.12);
        _drawGrid(ctx, cwData, layout.x, oy, best.cSize, false, exCells, exWord);
        const cx = layout.x + best.gridW + GUTTER;
        let y = layout.y + _lineH(best.pt);
        y = _drawClueSection(ctx, 'ACROSS', ac, cx, y, best.colW, best.pt, pScale, exampleNum);
        y = _drawClueSection(ctx, 'DOWN', dn, cx, y + 3, best.colW, best.pt, pScale, null);
        if (ctx.cwShowBank) {
            const bh = _bankHeight(ctx, cwData, best.colW, pScale);
            _drawBank(ctx, cwData, cx, Math.min(y + 6, layout.y + layout.h - bh + 6), best.colW, pScale);
        }
    }
    return { splitNeeded: false };
}

/**
 * Draw a crossword grid on its own (answer key quadrant, or the grid
 * half of an explicit two-page crossword).
 */
export function drawCrossword(ctx, cwData, layout, isKey, pScale, separateClues = false) {
    if (!cwData || !cwData.placed.length) return;
    pScale = pScale || ctx.scale;

    if (!isKey) {
        drawCrosswordPage(ctx, cwData, layout, pScale, separateClues);
        return;
    }

    const cSize = Math.min(layout.w / cwData.cols, layout.h / cwData.rows, 7.5);
    const gridW = cSize * cwData.cols, gridH = cSize * cwData.rows;
    _drawGrid(ctx, cwData, layout.x + (layout.w - gridW) / 2, layout.y + (layout.h - gridH) / 2,
        cSize, true, new Set(), null);
}

/**
 * Draw crossword clues on a dedicated page (used only when the teacher
 * explicitly asks for a separate clue page, or when a puzzle genuinely
 * cannot fit on one). ACROSS and DOWN sit side by side.
 */
export function drawCrosswordClues(ctx, cwData, startY, pScale) {
    if (!cwData || !cwData.placed.length) return;
    const { PAGE_HEIGHT, PAGE_WIDTH, MARGIN } = ctx;
    pScale = pScale || ctx.scale;

    const ac = cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
    const dn = cwData.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num);

    const showExample = ctx.showExample || false;
    const exampleNum = showExample && ac.length ? ac[0].num : null;
    const measure = _makeMeasurer(ctx, exampleNum, pScale);

    const colW = (PAGE_WIDTH - 2 * MARGIN) / 2;
    const availH = PAGE_HEIGHT - MARGIN - startY;
    const pt = _bestPt(p => Math.max(measure(ac, 'ac', colW, p), measure(dn, 'dn', colW, p)), availH, pScale)
        || PT_CANDIDATES[PT_CANDIDATES.length - 1] * pScale;

    _drawClueSection(ctx, 'ACROSS', ac, MARGIN, startY, colW, pt, pScale, exampleNum);
    _drawClueSection(ctx, 'DOWN', dn, MARGIN + colW, startY, colW, pt, pScale, null);
}
