// =============================================================
// pdf/pdfDrawCrossword.js
// =============================================================
// The crossword is compiled, not just drawn: grid size and clue
// typography are solved together so that the grid and its clues
// always land on ONE page, and so that a short puzzle grows to fill
// the sheet instead of floating in the top half of it.
// =============================================================
import { PALETTE, drawExamplePill, examplePillWidth, setFontSafe, drawRuledArea } from './pdfHelpers.js';
import { pickCrosswordExample } from '../core/exampleModel.js';

export { pickCrosswordExample };

const PT_CANDIDATES = [11, 10.5, 10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5];
const IDEAL_PT  = 9.5;   // below this, legibility stops improving the score
const MIN_CELL  = 4.6;   // mm — smaller than this is unwritable for a student
const MAX_CELL  = 12;
const GUTTER    = 7;     // mm between grid and clues
const MIN_COL_W = 42;    // mm — narrower than this and clues wrap to shreds

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
 *
 * Letters go down first and the number last, over a knockout chip in the
 * cell's own fill colour. A prefilled example letter used to be painted
 * over the top-left number of any Down word starting in the same cell,
 * which left students hunting for a clue number that had been swallowed by
 * the scaffolding meant to help them.
 */
function _drawGrid(ctx, cwData, ox, oy, cSize, isKey, exCells, exWord) {
    const { doc, mmToPt, pdfFont } = ctx;
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);

    const numPt = Math.max(5.5, mmToPt(cSize) * (isKey ? 0.30 : 0.38));
    // A letter sharing its cell with a clue number is set a little smaller
    // and lower, so its glyph box stays clear of the number's corner.
    const charPtPlain   = mmToPt(cSize) * (isKey ? 0.50 : 0.62);
    const charPtNumbered = charPtPlain * 0.90;

    for (let y = 0; y < cwData.rows; y++) {
        for (let x = 0; x < cwData.cols; x++) {
            const cell = cwData.grid[y][x];
            if (!cell) continue;
            const cx = ox + x * cSize, cy = oy + y * cSize;
            const isEx = exCells.has(`${x},${y}`);
            const fill = isEx ? PALETTE.exampleBg : [255, 255, 255];
            doc.setFillColor(...fill);
            doc.setDrawColor(...PALETTE.ink);
            doc.setLineWidth(0.4);
            doc.rect(cx, cy, cSize, cSize, 'FD');

            // ---- letter first ----
            const numbered = !!cell.num;
            const charPt = numbered ? charPtNumbered : charPtPlain;
            const midY = cy + cSize * (numbered ? 0.60 : 0.53);
            if (isKey) {
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(charPt);
                doc.setTextColor(...PALETTE.key);
                doc.text(cell.char, cx + cSize * 0.55, midY, { align: 'center', baseline: 'middle' });
            } else if (isEx && exWord) {
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(charPt);
                doc.setTextColor(...PALETTE.example);
                doc.text(exWord.word[x - exWord.x], cx + cSize * 0.55, midY,
                    { align: 'center', baseline: 'middle' });
            }

            // ---- number last, on a knockout chip ----
            if (numbered) {
                const label = String(cell.num);
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(numPt);
                const tw = doc.getTextWidth(label);
                const chipH = numPt * 0.36 + 0.5;
                doc.setFillColor(...fill);
                doc.rect(cx + cSize * 0.04, cy + cSize * 0.04, tw + 0.7, chipH, 'F');
                doc.setTextColor(...(isKey ? PALETTE.muted : PALETTE.ink));
                doc.text(label, cx + cSize * 0.09, cy + cSize * 0.07, { baseline: 'top' });
            }
        }
    }
}

/** Draw a single clue at (x, cy); returns the height it consumed. */
function _drawOneClue(ctx, w, isEx, x, cy, colW, fontPt, pScale) {
    const { doc, pdfFont } = ctx;
    const showLetterCount = ctx.showLetterCount !== false;
    const pillW = isEx ? examplePillWidth(doc, { pScale, pdfFont }) : 0;
    const lineH = _lineH(fontPt);
    const { numPrefix, numW, hang, lines } =
        _wrapClue(doc, w, colW, fontPt, pdfFont, showLetterCount, pillW);

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
    doc.setTextColor(...PALETTE.ink);
    return lines.length * lineH + _gapH(fontPt);
}

/** Draw a section heading at baseline y; returns the height it consumed. */
function _drawClueHead(ctx, title, x, y, colW, fontPt) {
    const { doc, pdfFont } = ctx;
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(Math.max(8.5, fontPt * 1.05));
    doc.setTextColor(...PALETTE.ink);
    doc.text(title, x, y);
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.3);
    doc.line(x, y + 1.6, x + colW - 3, y + 1.6);
    return _headH(fontPt);
}

/** Draw one ACROSS/DOWN section; returns the y it finished at. */
function _drawClueSection(ctx, title, list, x, y, colW, fontPt, pScale, exampleNum) {
    if (!list.length) return y;
    let cy = y + _drawClueHead(ctx, title, x, y, colW, fontPt);
    list.forEach(w => {
        const isEx = exampleNum !== null && w.num === exampleNum;
        cy += _drawOneClue(ctx, w, isEx, x, cy, colW, fontPt, pScale);
    });
    return cy;
}

// ---- multi-column clue flow -----------------------------------
// Two columns of ACROSS-then-DOWN is the familiar shape, but a twenty-word
// puzzle needs more vertical room than that leaves under the grid — which
// is how the grid and its clues ended up on opposite sides of one sheet.
// Flowing the same clues down three columns recovers the height, so the
// crossword stays a single page and its clue list stops being half empty.

/** Flattened head/clue items with their heights, for a given column width. */
function _clueItems(ctx, ac, dn, colW, fontPt, exampleNum, pScale) {
    const { doc, pdfFont } = ctx;
    const showLetterCount = ctx.showLetterCount !== false;
    const pillW = exampleNum !== null ? examplePillWidth(doc, { pScale, pdfFont }) : 0;
    const lineH = _lineH(fontPt), gapH = _gapH(fontPt);
    const items = [];
    [['ACROSS', ac, true], ['DOWN', dn, false]].forEach(([title, list, canHoldExample]) => {
        if (!list.length) return;
        items.push({ type: 'head', title, h: _headH(fontPt) });
        list.forEach(w => {
            const isEx = canHoldExample && exampleNum !== null && w.num === exampleNum;
            const { lines } = _wrapClue(doc, w, colW, fontPt, pdfFont, showLetterCount, isEx ? pillW : 0);
            items.push({ type: 'clue', w, isEx, h: lines.length * lineH + gapH });
        });
    });
    return items;
}

/** Greedy balanced split of clue items into `cols` columns. */
function _distribute(items, cols) {
    const total = items.reduce((s, it) => s + it.h, 0);
    const target = total / cols;
    const out = Array.from({ length: cols }, () => []);
    let c = 0, used = 0;
    items.forEach((it, i) => {
        // A heading is never left stranded at the foot of a column.
        const headOrphan = it.type === 'head' && used > 0 &&
            used + it.h + (items[i + 1]?.h || 0) > target * 1.05;
        if (c < cols - 1 && used > 0 && (used + it.h > target * 1.05 || headOrphan)) {
            c++; used = 0;
        }
        out[c].push(it);
        used += it.h;
    });
    return out;
}

const _flowCache = new Map();

/** Height of the tallest column when the clues are flowed into `cols`. */
function _flowHeight(ctx, ac, dn, colW, fontPt, cols, exampleNum, pScale) {
    const key = `${cols}|${colW.toFixed(1)}|${fontPt.toFixed(2)}|${exampleNum}`;
    const hit = _flowCache.get(key);
    if (hit !== undefined) return hit;
    const cols2 = _distribute(_clueItems(ctx, ac, dn, colW, fontPt, exampleNum, pScale), cols);
    const h = cols2.reduce((m, col) => Math.max(m, col.reduce((s, it) => s + it.h, 0)), 0);
    _flowCache.set(key, h);
    return h;
}

function _drawFlow(ctx, ac, dn, x, y, colW, gut, fontPt, cols, exampleNum, pScale) {
    const columns = _distribute(_clueItems(ctx, ac, dn, colW, fontPt, exampleNum, pScale), cols);
    columns.forEach((col, ci) => {
        const cx = x + ci * (colW + gut);
        let cy = y;
        col.forEach(it => {
            cy += it.type === 'head'
                ? _drawClueHead(ctx, it.title, cx, cy, colW, fontPt)
                : _drawOneClue(ctx, it.w, it.isEx, cx, cy, colW, fontPt, pScale);
        });
    });
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
    const exWord = showExample ? pickCrosswordExample(ac) : null;
    const exCells = new Set();
    if (exWord) for (let i = 0; i < exWord.word.length; i++) exCells.add(`${exWord.x + i},${exWord.y}`);
    const exampleNum = exWord ? exWord.num : null;
    const measure = _makeMeasurer(ctx, exampleNum, pScale);
    _flowCache.clear();

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

        // (a2) clues below the grid, flowed down three columns. Three
        // shorter columns need far less height than two, which is what
        // keeps a twenty-word puzzle off a second sheet.
        {
            const gut = 6;
            const colW = (layout.w - gut * 2) / 3;
            if (colW >= MIN_COL_W) {
                const availH = layout.h - gridH - GUTTER - bankHBelow;
                const pt = _bestPt(
                    p => _flowHeight(ctx, ac, dn, colW, p, 3, exampleNum, pScale), availH, pScale);
                if (pt) {
                    // A hair behind the classic two-column shape at equal
                    // legibility, so it only wins when it genuinely helps.
                    const score = Math.min(pt / pScale, IDEAL_PT) * 100 + cSize - 0.2;
                    if (!best || score > best.score) {
                        best = { mode: 'below3', cSize, pt, colW, gut, score, gridW, gridH };
                    }
                }
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
    if (best.mode === 'below' || best.mode === 'below3') {
        const flowed = best.mode === 'below3';
        const ox = layout.x + (layout.w - best.gridW) / 2;
        const clueBlockH = flowed
            ? _flowHeight(ctx, ac, dn, best.colW, best.pt, 3, exampleNum, pScale)
            : Math.max(
                measure(ac, 'ac', best.colW, best.pt),
                measure(dn, 'dn', best.colW, best.pt));
        // Spread leftover space above and below the grid instead of
        // stacking it all at the foot of the page.
        const slack = Math.max(0, layout.h - best.gridH - GUTTER - clueBlockH - bankHBelow);
        const oy = layout.y + slack * 0.35;

        _drawGrid(ctx, cwData, ox, oy, best.cSize, false, exCells, exWord);
        const y0 = oy + best.gridH + GUTTER + _lineH(best.pt);
        if (flowed) {
            _drawFlow(ctx, ac, dn, layout.x, y0, best.colW, best.gut, best.pt, 3, exampleNum, pScale);
        } else {
            _drawClueSection(ctx, 'ACROSS', ac, layout.x, y0, best.colW, best.pt, pScale, exampleNum);
            _drawClueSection(ctx, 'DOWN', dn, layout.x + best.colW, y0, best.colW, best.pt, pScale, null);
        }
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
    const { doc, PAGE_HEIGHT, PAGE_WIDTH, MARGIN, pdfFont } = ctx;
    pScale = pScale || ctx.scale;

    const ac = cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
    const dn = cwData.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num);

    const showExample = ctx.showExample || false;
    const exEntry = showExample ? pickCrosswordExample(ac) : null;
    const exampleNum = exEntry ? exEntry.num : null;
    const measure = _makeMeasurer(ctx, exampleNum, pScale);

    const colW = (PAGE_WIDTH - 2 * MARGIN) / 2;
    const availH = PAGE_HEIGHT - MARGIN - startY;
    const pt = _bestPt(p => Math.max(measure(ac, 'ac', colW, p), measure(dn, 'dn', colW, p)), availH, pScale)
        || PT_CANDIDATES[PT_CANDIDATES.length - 1] * pScale;

    const acEnd = _drawClueSection(ctx, 'ACROSS', ac, MARGIN, startY, colW, pt, pScale, exampleNum);
    const dnEnd = _drawClueSection(ctx, 'DOWN', dn, MARGIN + colW, startY, colW, pt, pScale, null);

    // A dedicated clue page is capped at 11pt type, so a short list used to
    // leave the bottom half of the sheet blank. Hand that back to the
    // student as working space instead.
    const bottom = Math.max(acEnd, dnEnd);
    const leftover = (PAGE_HEIGHT - MARGIN) - bottom;
    if (leftover > 45 * pScale) {
        drawRuledArea(doc, MARGIN, bottom + 12 * pScale, PAGE_WIDTH - 2 * MARGIN,
            leftover - 16 * pScale, { pScale, pdfFont, label: 'WORKING OUT', lineGap: 9 });
    }
}
