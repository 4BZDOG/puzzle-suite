// =============================================================
// pdf/pdfDrawCrossword.js
// =============================================================
// The crossword is compiled, not just drawn: grid size and clue
// typography are solved together so that the grid and its clues
// always land on ONE page, and so that a short puzzle grows to fill
// the sheet instead of floating in the top half of it.
// =============================================================
import { PALETTE, drawExamplePill, examplePillWidth, setFontSafe } from './pdfHelpers.js';
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
 * Smallest key-thumbnail cell that can carry a legible clue number.
 *
 * A four-up answer key squeezes the crossword into a quadrant, where a
 * two-digit number and a centred solution letter cannot both fit in ~4 mm
 * without one sitting on the other. Below this size the numbers are dropped:
 * a teacher checking a key needs the letters and the word shapes, and the
 * clue numbers are on the student's own sheet at full size.
 */
const KEY_NUM_MIN_CELL = 6;   // mm

/**
 * Draw the grid.
 *
 * The clue number owns a reserved zone in the top-left corner and the
 * letter is placed strictly below it, so the two can never share space.
 * Both are sized to their zone rather than to the cell, which is what a
 * two-digit number needs: "10" set at the one-digit size ran straight into
 * the upright of a prefilled L.
 *
 * Clue numbers are drawn on the student grid and on a full-size key, but
 * suppressed on a cramped key thumbnail (see KEY_NUM_MIN_CELL).
 */
function _drawGrid(ctx, cwData, ox, oy, cSize, isKey, exCells, exWord) {
    const { doc, mmToPt, pdfFont } = ctx;
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);

    const showNumbers = !isKey || cSize >= KEY_NUM_MIN_CELL;

    // The number's reserved corner, as fractions of the cell.
    const ZONE_W = 0.42, ZONE_H = 0.32, ZONE_X = 0.07, ZONE_Y = 0.05;
    // Letters clear that zone by sitting on a low baseline; an unnumbered
    // cell keeps its letter optically centred instead.
    const BASE_NUMBERED = 0.80, BASE_PLAIN = 0.72;

    const charPtPlain = mmToPt(cSize) * (isKey ? 0.50 : 0.62);
    const charPtNumbered = charPtPlain * 0.92;

    /** Largest point size at which `label` fits inside the number zone. */
    const numPtFor = (label) => {
        let pt = Math.max(4.4, mmToPt(cSize * ZONE_H) * 0.86);
        setFontSafe(doc, pdfFont, 'bold');
        for (let i = 0; i < 8; i++) {
            doc.setFontSize(pt);
            if (doc.getTextWidth(label) <= cSize * ZONE_W) break;
            pt *= 0.9;
        }
        return Math.max(4.2, pt);
    };

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

            const numbered = showNumbers && !!cell.num;

            // ---- letter, on a baseline that clears the number zone ----
            const charPt = numbered ? charPtNumbered : charPtPlain;
            const baseY = cy + cSize * (numbered ? BASE_NUMBERED : BASE_PLAIN);
            const glyph = isKey ? cell.char : (isEx && exWord ? exWord.word[x - exWord.x] : '');
            if (glyph) {
                setFontSafe(doc, pdfFont, 'bold');
                doc.setFontSize(charPt);
                doc.setTextColor(...(isKey ? PALETTE.key : PALETTE.example));
                doc.text(glyph, cx + cSize * 0.5, baseY, { align: 'center' });
            }

            // ---- number last, inside its own corner ----
            if (numbered) {
                const label = String(cell.num);
                doc.setFontSize(numPtFor(label));
                setFontSafe(doc, pdfFont, 'bold');
                doc.setTextColor(...(isKey ? PALETTE.muted : PALETTE.ink));
                doc.text(label, cx + cSize * ZONE_X, cy + cSize * ZONE_Y, { baseline: 'top' });
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

/**
 * Split clue items into `cols` columns, minimising the TALLEST column.
 *
 * Order is preserved (a clue list read out of order is useless), so this is
 * the classic linear-partition problem: binary-search the smallest ceiling
 * that still fits in `cols` columns, then fill to it. A plain greedy fill to
 * `total / cols` left the first column visibly short — 4, 5 and 6 clues in
 * three columns — because one early heading forced a break.
 */
function _distribute(items, cols) {
    if (cols <= 1 || !items.length) return [items.slice()];
    const total = items.reduce((s, it) => s + it.h, 0);
    const tallest = items.reduce((m, it) => Math.max(m, it.h), 0);

    /** Can every item fit in `cols` columns, none taller than `H`? */
    const fits = (H) => {
        let c = 1, used = 0;
        for (const it of items) {
            if (used > 0 && used + it.h > H + 1e-6) {
                c++; used = 0;
                if (c > cols) return false;
            }
            used += it.h;
        }
        return true;
    };

    let lo = Math.max(tallest, total / cols), hi = total, ceiling = hi;
    for (let i = 0; i < 40; i++) {
        const mid = (lo + hi) / 2;
        if (fits(mid)) { ceiling = mid; hi = mid; } else { lo = mid; }
    }

    const out = Array.from({ length: cols }, () => []);
    let c = 0, used = 0;
    items.forEach((it, i) => {
        // A heading is never left stranded at the foot of a column.
        const headOrphan = it.type === 'head' && used > 0 &&
            used + it.h + (items[i + 1]?.h || 0) > ceiling + 1e-6;
        if (c < cols - 1 && used > 0 && (used + it.h > ceiling + 1e-6 || headOrphan)) {
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

        // (a) clues below the grid, one section per column
        {
            const colW = layout.w / 2;
            const availH = layout.h - gridH - GUTTER - bankHBelow;
            const pt = _bestPt(p => Math.max(measure(ac, 'ac', colW, p), measure(dn, 'dn', colW, p)), availH, pScale);
            if (pt) {
                const score = Math.min(pt / pScale, IDEAL_PT) * 100 + cSize;
                if (!best || score > best.score) best = { mode: 'below', cSize, pt, colW, score, gridW, gridH };
            }
        }

        // (a2) / (a3) clues below the grid, FLOWED down two or three columns
        // rather than one column per section. A lopsided puzzle — nine across
        // against six down — leaves a column of dead space when each section
        // owns a column; flowing them fills both evenly and needs less height,
        // which buys either bigger type or a bigger grid.
        [2, 3].forEach(cols => {
            const gut = 6;
            const colW = (layout.w - gut * (cols - 1)) / cols;
            if (colW < MIN_COL_W) return;
            const availH = layout.h - gridH - GUTTER - bankHBelow;
            const pt = _bestPt(
                p => _flowHeight(ctx, ac, dn, colW, p, cols, exampleNum, pScale), availH, pScale);
            if (!pt) return;
            // A hair behind the classic section-per-column shape at equal
            // legibility, so it only wins when it genuinely helps.
            const score = Math.min(pt / pScale, IDEAL_PT) * 100 + cSize - 0.2;
            if (!best || score > best.score) {
                best = { mode: 'flow', cols, cSize, pt, colW, gut, score, gridW, gridH };
            }
        });

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
    if (best.mode === 'below' || best.mode === 'flow') {
        const flowed = best.mode === 'flow';
        const ox = layout.x + (layout.w - best.gridW) / 2;
        const clueBlockH = flowed
            ? _flowHeight(ctx, ac, dn, best.colW, best.pt, best.cols, exampleNum, pScale)
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
            _drawFlow(ctx, ac, dn, layout.x, y0, best.colW, best.gut, best.pt, best.cols,
                exampleNum, pScale);
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
    const { PAGE_HEIGHT, PAGE_WIDTH, MARGIN } = ctx;
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

    // No filler below the clues. A vocabulary crossword needs no calculation
    // space, and ruling the leftover only disguised the real problem, which
    // was the grid being stranded on the previous sheet. The compiler keeps
    // grid and clues together now, so this page exists only when a teacher
    // deliberately asked for it.
    _drawClueSection(ctx, 'ACROSS', ac, MARGIN, startY, colW, pt, pScale, exampleNum);
    _drawClueSection(ctx, 'DOWN', dn, MARGIN + colW, startY, colW, pt, pScale, null);
}
