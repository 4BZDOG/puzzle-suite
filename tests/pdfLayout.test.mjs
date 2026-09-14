// =============================================================
// tests/pdfLayout.test.mjs — PDF layout regression tests
// =============================================================
// Runs the real PDF drawers against real generated puzzle data in Node
// (no browser), then asserts on where things actually landed on the page.
// These cover the defects reported in the March 2026 worksheet review:
// split crossword pages, wasted whitespace, colliding answer-key text,
// missing crossword key numbers, and the Times-italic font fallback.
//
// They also cover the September 2026 layout review's verification plan:
// the vocabulary shuffling invariant, definition strings free of letter
// counts, the crossword single-page budget, and per-set pagination.
//
//   npm run test:pdf            # assertions only
//   npm run test:pdf -- --write # also write sample PDFs to tests/__out__/
// =============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

import { buildCtx, drawHeader, drawFooter, drawBlankFiller } from '../pdf/pdfHelpers.js';
import { drawWordSearch } from '../pdf/pdfDrawWordSearch.js';
import { drawCrosswordPage, drawCrosswordClues } from '../pdf/pdfDrawCrossword.js';
import { drawScramble } from '../pdf/pdfDrawScramble.js';
import { drawNotes, drawMasterKeyPage } from '../pdf/pdfDrawNotes.js';
import { exampleDefIndex } from '../core/notesModel.js';
import { pickWSExample } from '../pdf/pdfDrawWordSearch.js';
import { pickCrosswordExample } from '../pdf/pdfDrawCrossword.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const PAGE = { W: 210, H: 297, MARGIN: 15, FOOTER: 10 };
const BODY_TOP = 53;          // first line below the header, in mm
const FOOTER_BAND = 281;      // the running footer lives below this

// ---- puzzle generation: run the worker script in-process ----
const workerSrc = fs.readFileSync(path.join(ROOT, 'workers/workerBridge.js'), 'utf8');
const OPEN = 'const _workerScript = `';
const script = workerSrc.slice(
    workerSrc.indexOf(OPEN) + OPEN.length,
    workerSrc.indexOf('\n`;\n', workerSrc.indexOf(OPEN)));
const workerSelf = { onmessage: null, postMessage: (m) => { workerSelf._out = m; } };
new Function('self', script)(workerSelf);

function generate(words, wsSize = 15, variantSeed) {
    workerSelf.onmessage({ data: {
        id: 1, words, wsSize, wsDiag: true, wsBack: true,
        wsHard: false, wsCustomFillers: '', cwMaxWords: 15, variantSeed,
    } });
    const r = workerSelf._out.result;
    r.ws.solution = new Set(r.ws.solutionArray);
    return r;
}

const getLetter = (i) => {
    let res = '', n = i;
    while (n >= 0) { res = String.fromCharCode(65 + (n % 26)) + res; n = Math.floor(n / 26) - 1; }
    return res;
};

function buildNotes(words, matching) {
    const notes = words.map((w, i) => ({ term: w.word, clue: w.clue, origIdx: i }));
    if (!matching) return notes;
    const clues = [...notes].sort(() => Math.random() - 0.5);
    return notes.map((item, i) => ({
        term: item.term, clue: clues[i].clue,
        matchLetter: getLetter(i),
        correctLetter: getLetter(clues.findIndex(c => c.origIdx === item.origIdx)),
        origIdx: item.origIdx, clueOrigIdx: clues[i].origIdx,
        clueTermLength: clues[i].term.length,
    }));
}

// ---- an instrumented jsPDF that records what was drawn where ----
function makeDoc() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
    const log = [];
    // The *current* sheet, not the document total: footers are drawn in a
    // second pass with doc.setPage(), so getNumberOfPages() would file every
    // one of them against the last sheet.
    const page = () => {
        try { return doc.internal.getCurrentPageInfo().pageNumber; }
        catch (_) { return doc.internal.getNumberOfPages(); }
    };
    const origText = doc.text.bind(doc);
    doc.text = function (txt, x, y, o) {
        (Array.isArray(txt) ? txt : [txt]).forEach(t => log.push({
            kind: 'text', page: page(), text: String(t), x, y,
            align: (o && o.align) || 'left',
            font: `${doc.getFont().fontName}-${doc.getFont().fontStyle}`,
            size: doc.getFontSize(),
            color: (() => { try { return doc.getTextColor(); } catch (_) { return ''; } })(),
            w: doc.getTextWidth(String(t)),
        }));
        return origText(txt, x, y, o);
    };
    const origImage = doc.addImage.bind(doc);
    doc.addImage = function (...args) {
        log.push({ kind: 'image', page: page(), x: args[2], y: args[3] });
        return origImage(...args);
    };
    const origRect = doc.rect.bind(doc);
    doc.rect = function (x, y, w, h, s) { log.push({ kind: 'rect', page: page(), x, y, w, h }); return origRect(x, y, w, h, s); };
    // roundedRect draws through lines() internally, which loses its width and
    // height — an example outline drawn with it was invisible to the log.
    const origRounded = doc.roundedRect.bind(doc);
    doc.roundedRect = function (x, y, w, h, rx, ry, st) {
        log.push({ kind: 'rect', page: page(), x, y, w, h, rounded: true });
        return origRounded(x, y, w, h, rx, ry, st);
    };
    const origLine = doc.line.bind(doc);
    doc.line = function (x1, y1, x2, y2, s) { log.push({ kind: 'line', page: page(), x: x1, y: y1, x2, y2 }); return origLine(x1, y1, x2, y2, s); };
    const origLines = doc.lines.bind(doc);
    doc.lines = function (l, x, y, sc, st, cl) { log.push({ kind: 'lines', page: page(), x, y }); return origLines(l, x, y, sc, st, cl); };
    return { doc, log };
}

// ---- a full five-page export, the same sequence pdfExport.js runs ----
const WORDS = [
    ['COORDINATE', 'A pair of numbers giving a position on the plane'],
    ['GRADIENT', 'The steepness of a line, rise over run'],
    ['INTERCEPT', 'Where a line crosses an axis'],
    ['HORIZONTAL', 'Running left to right, parallel to the x-axis'],
    ['VERTICAL', 'Running up and down, parallel to the y-axis'],
    ['SUBSTITUTION', 'Replacing a variable with a known value'],
    ['ORIGIN', 'The point where both axes meet, (0,0)'],
    ['QUADRANT', 'One of four regions of the Cartesian plane'],
    ['LINEAR', 'Forming a straight line when graphed'],
    ['PLOT', 'To mark a point on a set of axes'],
    ['AXIS', 'A reference line on a graph'],
    ['SLOPE', 'Another word for gradient'],
    ['EQUATION', 'A statement that two expressions are equal'],
    ['VARIABLE', 'A letter standing for an unknown number'],
    ['TABLE', 'An organised set of values used before plotting'],
    ['RULE', 'The relationship between x and y in a pattern'],
    ['PATTERN', 'A repeating or predictable arrangement'],
    ['GRAPH', 'A visual display of a relationship'],
    ['NEGATIVE', 'Less than zero'],
    ['POSITIVE', 'Greater than zero'],
].map(([word, clue]) => ({ word, clue }));

function exportRun({
    matching = false, words = WORDS, showExample = true, showLetterCount = true,
    cwShowBank = false, forceSplitFallback = false, sets = 1, label = 'run',
    keysAtEnd = true, duplexSafe = true, withKey = true,
} = {}) {
    const { doc, log } = makeDoc();
    const ctx = buildCtx(doc, 'helvetica', null, 1,
        { PAGE_WIDTH: PAGE.W, PAGE_HEIGHT: PAGE.H, MARGIN: PAGE.MARGIN },
        {
            notesConfig: { showTerm: true, showDef: true, shuffle: matching, termWidth: 27 },
            showExample, showLetterCount, cwShowBank, wsInternalGrid: false, titleScale: 1,
            title: 'Linear Relationships & Coordinate Geometry',
        });

    const title = 'Linear Relationships', sub = 'Year 8 Mathematics — Unit 4';
    const box = (sy) => ({ x: PAGE.MARGIN, y: sy, w: PAGE.W - 2 * PAGE.MARGIN, h: PAGE.H - sy - PAGE.MARGIN - PAGE.FOOTER });

    let first = true;
    const footerQueue = [];
    const cpds = [];
    const keyQueue = [];
    const pageKind = {};          // page number -> 'student' | 'key' | 'filler'
    const pageSet = {};           // page number -> set index (-1 for appendix)
    let splitNeeded = false;

    for (let si = 0; si < sets; si++) {
        const cpd = generate(words, 15, (si * 2654435761) >>> 0);
        cpd.notes = buildNotes(words, matching);
        cpds.push(cpd);

        let pageInSet = 0;
        const addPage = (kind = 'student') => {
            if (!first) doc.addPage();
            first = false;
            pageInSet++;
            pageKind[doc.internal.getNumberOfPages()] = kind;
            pageSet[doc.internal.getNumberOfPages()] = si;
            return pageInSet === 1;
        };
        const queueFooter = (right) => footerQueue.push({
            page: doc.internal.getNumberOfPages(), setIdx: si, pageInSet, right,
            setLabel: `Set ${si + 1}`,
        });
        const setIndicator = `SET ${si + 1}`;

        let fos = addPage();
        let sy = drawHeader(ctx, title, sub, 'Terms and definitions.', false, setIndicator, 1,
            { label: 'VOCABULARY', accent: [99, 102, 241], icon: matching ? 'matching' : 'notes', firstOfSet: fos });
        drawNotes(ctx, cpd.notes, sy, 1);
        queueFooter('VOCABULARY');

        fos = addPage();
        sy = drawHeader(ctx, title, sub, 'Find each word.', false, setIndicator, 1,
            { label: 'WORD SEARCH', accent: [13, 148, 136], icon: 'search', firstOfSet: fos });
        drawWordSearch(ctx, cpd.ws, box(sy), words, false, false, 1);
        queueFooter('WORD SEARCH');

        fos = addPage();
        sy = drawHeader(ctx, title, sub, 'Fill in the grid.', false, setIndicator, 1,
            { label: 'CROSSWORD', accent: [124, 58, 237], icon: 'crossword', firstOfSet: fos });
        const res = drawCrosswordPage(ctx, cpd.cw, box(sy), 1, forceSplitFallback);
        queueFooter('CROSSWORD');
        if (res.splitNeeded) {
            splitNeeded = true;
            const cf = addPage();
            const cluesSy = drawHeader(ctx, title, sub, 'Clues.', false, setIndicator, 1,
                { label: 'CROSSWORD', accent: [124, 58, 237], icon: 'crossword', firstOfSet: cf });
            drawCrosswordClues(ctx, cpd.cw, cluesSy, 1);
            queueFooter('CROSSWORD CLUES');
        }

        fos = addPage();
        sy = drawHeader(ctx, title, sub, 'Unscramble.', false, setIndicator, 1,
            { label: 'WORD SCRAMBLE', accent: [217, 119, 6], icon: 'scramble', firstOfSet: fos });
        drawScramble(ctx, cpd.scr, box(sy), false, false, 1);
        queueFooter('WORD SCRAMBLE');

        if (withKey && !keysAtEnd) {
            addPage('key');
            drawMasterKeyPage(ctx, title, sub, cpd, { ws: true, cw: true, scr: true, notes: true }, 1);
            queueFooter('TEACHER KEY');
        }

        // Pad the packet to an even length so it occupies whole sheets.
        if (duplexSafe && pageInSet % 2 === 1) {
            addPage('filler');
            drawBlankFiller(ctx, 1);
            queueFooter('');
        }

        if (withKey && keysAtEnd) keyQueue.push({ cpd, setIdx: si });
    }

    // Answer-key appendix, after every student set.
    keyQueue.forEach((entry, k) => {
        if (!first) doc.addPage();
        first = false;
        pageKind[doc.internal.getNumberOfPages()] = 'key';
        pageSet[doc.internal.getNumberOfPages()] = -1;
        const setLabel = `Set ${entry.setIdx + 1}`;
        drawMasterKeyPage(ctx, title, sub, entry.cpd,
            { ws: true, cw: true, scr: true, notes: true }, 1, setLabel);
        footerQueue.push({
            page: doc.internal.getNumberOfPages(), setIdx: -1, pageInSet: 0,
            right: 'TEACHER KEY', setLabel: '',
            pageText: keyQueue.length > 1
                ? `Set ${entry.setIdx + 1} — Answer key ${k + 1} of ${keyQueue.length}`
                : `Set ${entry.setIdx + 1} — Answer key`,
        });
    });

    // Footer pass, exactly as pdfExport.js runs it: page counts per set are
    // only known once every set has been laid out.
    const setTotals = footerQueue.reduce((a, f) => {
        a[f.setIdx] = Math.max(a[f.setIdx] || 0, f.pageInSet); return a;
    }, {});
    const footers = footerQueue.map(f => {
        doc.setPage(f.page);
        drawFooter(ctx, 1, {
            right: f.right, setLabel: f.setLabel, pageText: f.pageText,
            pageInSet: f.pageInSet, pagesInSet: setTotals[f.setIdx],
        });
        return { ...f, pagesInSet: setTotals[f.setIdx] };
    });

    if (WRITE) {
        const dir = path.join(ROOT, 'tests/__out__');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${label}.pdf`), Buffer.from(doc.output('arraybuffer')));
    }
    return {
        cpd: cpds[0], cpds, log, doc, footers, pageKind, pageSet,
        pages: doc.internal.getNumberOfPages(), splitNeeded,
    };
}

// ---- helpers over the draw log ----
/** Deepest y a page draws to, ignoring the running footer. */
function deepest(log) {
    const out = {};
    log.forEach(l => {
        const y = Math.max(l.y || 0, l.y2 || 0, l.kind === 'rect' ? l.y + l.h : 0);
        if (y >= FOOTER_BAND) return;
        if (!out[l.page] || y > out[l.page]) out[l.page] = y;
    });
    return out;
}
const fillRatio = (bottom) => (bottom - BODY_TOP) / (PAGE.H - PAGE.MARGIN - BODY_TOP);

/** Text runs that overlap another run on the same baseline. */
function collisions(log) {
    const rows = new Map();
    log.filter(l => l.kind === 'text' && l.text.trim()).forEach(l => {
        const left = l.align === 'right' ? l.x - l.w : l.align === 'center' ? l.x - l.w / 2 : l.x;
        const key = `p${l.page} y${(Math.round(l.y * 2) / 2).toFixed(1)}`;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push({ ...l, left, right: left + l.w });
    });
    const bad = [];
    rows.forEach((runs, key) => {
        runs.sort((a, b) => a.left - b.left);
        for (let i = 1; i < runs.length; i++) {
            if (runs[i].left < runs[i - 1].right - 0.4) bad.push(`${key}: "${runs[i - 1].text}" x "${runs[i].text}"`);
        }
    });
    return bad;
}

// ---- assertions ----
let failed = 0;
const check = (name, cond, extra = '') => {
    if (!cond) failed++;
    console.log(`${cond ? 'ok  ' : 'FAIL'}  ${name}${extra ? `  — ${extra}` : ''}`);
};

const r = exportRun({ matching: true, label: 'matching' });

check('crossword grid and clues share one page', !r.splitNeeded);
check('five selected pages produce five sheets', r.pages === 5, `got ${r.pages}`);

const bottoms = deepest(r.log);
[[1, 'vocabulary'], [3, 'crossword'], [4, 'scramble']].forEach(([p, name]) => {
    check(`${name} page uses more than 80% of the body`, fillRatio(bottoms[p]) > 0.8,
        `${(fillRatio(bottoms[p]) * 100).toFixed(0)}%`);
});

const keyText = r.log.filter(l => l.kind === 'text' && l.page === r.pages);
const labels = keyText.filter(t => /^\d+\. [A-Z…]/.test(t.text));
const letters = keyText.filter(t => t.align === 'right' && /^[A-Z]{1,2}$/.test(t.text));
check('matching key lists every term', labels.length === WORDS.length, `${labels.length}/${WORDS.length}`);
let worst = Infinity, worstPair = '';
labels.forEach(l => {
    const letter = letters.filter(t => Math.abs(t.y - l.y) < 0.6 && t.x > l.x).sort((a, b) => a.x - b.x)[0];
    if (!letter) return;
    const gap = (letter.x - letter.w) - (l.x + l.w);
    if (gap < worst) { worst = gap; worstPair = `${l.text} / ${letter.text}`; }
});
check('matching key term never runs into its answer letter', worst > 0.5, `min gap ${worst.toFixed(2)}mm (${worstPair})`);

// A four-up key squeezes the crossword into a quadrant, where a two-digit
// number cannot share ~4mm with a solution letter. The numbers are dropped
// there; the student's own full-size grid still carries them.
check('a cramped answer-key thumbnail drops its clue numbers',
    keyText.filter(t => /^\d+$/.test(t.text) && t.size < 6).length === 0,
    `${keyText.filter(t => /^\d+$/.test(t.text) && t.size < 6).length} tiny numbers`);
check('the student crossword grid still carries its clue numbers',
    r.log.filter(l => l.kind === 'text' && l.page === 3 && /^\d+$/.test(l.text)).length > 3);
check('no Times fallback anywhere in the document',
    r.log.filter(l => l.kind === 'text' && /times/i.test(l.font)).length === 0);
check('word search highlights are vector capsules',
    r.log.filter(l => l.kind === 'lines').length > 0);
check('nothing overlaps on a shared baseline', collisions(r.log).length === 0,
    collisions(r.log).slice(0, 3).join(' | '));

// Short lists: grow the type, then put the slack to work.
const small = exportRun({ words: WORDS.slice(0, 6), label: 'six-words' });
check('six-word crossword still fits one page', !small.splitNeeded);
check('six-word vocabulary page is filled', fillRatio(deepest(small.log)[1]) > 0.7,
    `${(fillRatio(deepest(small.log)[1]) * 100).toFixed(0)}%`);
check('leftover space becomes ruled writing space', small.log.some(l => l.text === 'NOTES'));

// Scaffolding toggles.
const plain = exportRun({ showLetterCount: false, showExample: false, label: 'no-scaffolding' });
check('letter-count hints can be switched off', !plain.log.some(l => l.kind === 'text' && /\(\d+\)$/.test(l.text)));
check('the worked example can be switched off', !plain.log.some(l => l.text === 'EXAMPLE'));

const scaffolded = exportRun({ label: 'scaffolded' });
check('the worked example uses one shared EXAMPLE pill',
    scaffolded.log.filter(l => l.text === 'EXAMPLE').length >= 3);

const banked = exportRun({ cwShowBank: true, label: 'word-bank' });
check('the crossword word bank reaches the PDF', banked.log.some(l => l.text === 'WORD BANK'));
check('the crossword still fits one page with a word bank', !banked.splitNeeded);

// The separate-clue page is no longer a teacher-facing option — it survives
// only as the fallback for a puzzle that genuinely cannot fit at minimum cell
// size, so the drawer still has to work. 5 student pages -> padded to 6 whole
// sheets -> plus the appendix key.
const split = exportRun({ forceSplitFallback: true, label: 'split-fallback' });
check('the unfittable-puzzle fallback still draws its clue page', split.pages === 7, `got ${split.pages}`);
check('the fallback clue page carries no filler ruling',
    !split.log.some(l => l.kind === 'text' && l.text === 'WORKING OUT'));

[['six-word', small], ['no-scaffolding', plain], ['scaffolded', scaffolded],
 ['word-bank', banked], ['split-fallback', split]].forEach(([name, run]) => {
    const c = collisions(run.log);
    check(`nothing overlaps in the ${name} export`, c.length === 0, c.slice(0, 3).join(' | '));
});


// =============================================================
// September 2026 layout review — verification plan
// =============================================================

// --- BUG-VOC-01: vocabulary shuffling invariant, 100 iterations ---
// The EXAMPLE badge must track the definition describing terms[0], not
// whatever definition happened to land in row A after the shuffle.
{
    let bound = 0, letterAgrees = 0;
    for (let i = 0; i < 100; i++) {
        const notes = buildNotes(WORDS, true);
        const idx = exampleDefIndex(notes);
        if (notes[idx].clueOrigIdx === notes[0].origIdx) bound++;
        // The badge's row letter must be the answer prefilled in row 1's box.
        if (notes[idx].matchLetter === notes[0].correctLetter) letterAgrees++;
    }
    check('example badge binds to the definition of term 1 (100 shuffles)', bound === 100, `${bound}/100`);
    check('example badge letter matches the prefilled answer (100 shuffles)', letterAgrees === 100, `${letterAgrees}/100`);
}

// --- BUG-VOC-02: the badge never lands on the text it annotates ---
function pillCollisions(log) {
    const bad = [];
    log.filter(l => l.kind === 'text' && l.text === 'EXAMPLE').forEach(p => {
        const pl = p.x, pr = p.x + p.w;
        log.filter(l => l.kind === 'text' && l !== p && l.text.trim() && l.page === p.page
                     && Math.abs(l.y - p.y) < 1.6)
           .forEach(l => {
               const ll = l.align === 'right' ? l.x - l.w : l.align === 'center' ? l.x - l.w / 2 : l.x;
               if (ll < pr - 0.4 && ll + l.w > pl + 0.4) bad.push(`p${p.page}: "${l.text}"`);
           });
    });
    return bad;
}
{
    // Long definitions are the case that used to clamp the badge back over
    // the words ("mathemat[EXAMPLE]ene Descartes").
    const longClues = WORDS.map(w => ({
        word: w.word,
        clue: `${w.clue}, named after the French mathematician and philosopher Rene Descartes`,
    }));
    const runs = [
        ['matching', exportRun({ matching: true, label: 'vp-matching' })],
        ['long definitions', exportRun({ matching: true, words: longClues, label: 'vp-long' })],
        ['standard', exportRun({ label: 'vp-standard' })],
    ];
    runs.forEach(([name, r]) => {
        const c = pillCollisions(r.log);
        check(`the EXAMPLE badge never overlaps text (${name})`, c.length === 0, c.slice(0, 3).join(' | '));
    });
}

// --- BUG-VOC-03: no letter counts on a matching sheet ---
{
    const r = exportRun({ matching: true, showLetterCount: true, label: 'vp-count' });
    const notesPage = r.log.filter(l => l.kind === 'text' && l.page === 1);
    const leaked = notesPage.filter(l => /\(\s*\d+\s*\)\s*$/.test(l.text));
    check('matching definitions carry no letter count', leaked.length === 0,
        leaked.slice(0, 2).map(l => l.text).join(' | '));
    // …while the crossword, where the hint belongs, keeps it.
    const cwPage = r.log.filter(l => l.kind === 'text' && l.page === 3);
    check('crossword clues keep their letter count', cwPage.some(l => /\(\d+\)$/.test(l.text)));
}

// --- BUG-XWD-01: single-page crossword budget across word counts ---
{
    const bank = WORDS.concat([
        ['FUNCTION', 'A rule pairing each input with exactly one output'],
        ['DOMAIN', 'The set of allowed input values'],
        ['RANGE', 'The set of resulting output values'],
        ['PARALLEL', 'Lines with the same gradient that never meet'],
        ['MIDPOINT', 'The point halfway between two others'],
    ].map(([word, clue]) => ({ word, clue })));
    let splits = 0;
    [8, 12, 15, 20, 25].forEach(n => {
        const r = exportRun({ words: bank.slice(0, n), label: `vp-cw-${n}` });
        if (r.splitNeeded) splits++;
    });
    check('crossword fits one page at 8/12/15/20/25 words', splits === 0, `${splits} split`);
}

// --- BUG-XWD-02 / BUG-XWD-06: numbers and letters never share space ---
// The clue number owns a reserved top-left zone and the letter sits strictly
// below it. Checked geometrically rather than by draw order: "10" set at the
// one-digit size used to run into the upright of a prefilled L even though
// it was drawn on top.
{
    const boxesOf = (page) => {
        const squares = page.filter(l => l.kind === 'rect' && Math.abs(l.w - l.h) < 0.01 && l.w > 3);
        if (!squares.length) return null;
        const tally = {};
        squares.forEach(l => { tally[l.w.toFixed(2)] = (tally[l.w.toFixed(2)] || 0) + 1; });
        const cSize = parseFloat(Object.entries(tally).sort((a, b) => b[1] - a[1])[0][0]);
        const cells = squares.filter(l => Math.abs(l.w - cSize) < 0.01);
        const ox = Math.min(...cells.map(l => l.x)), oy = Math.min(...cells.map(l => l.y));
        const maxX = Math.max(...cells.map(l => l.x)) + cSize;
        const maxY = Math.max(...cells.map(l => l.y)) + cSize;

        const byCell = new Map();
        page.forEach(l => {
            if (l.kind !== 'text') return;
            const gx = l.align === 'center' ? l.x : l.x + l.w / 2;
            if (gx < ox || gx > maxX || l.y < oy - cSize || l.y > maxY + cSize) return;
            const key = `${Math.floor((gx - ox) / cSize)},${Math.floor((l.y - oy) / cSize)}`;
            if (!byCell.has(key)) byCell.set(key, []);
            // Rough glyph box: jsPDF cap height is ~0.72 of the point size.
            const capMm = (l.size / 2.83465) * 0.72;
            const left = l.align === 'center' ? l.x - l.w / 2 : l.x;
            const isNum = /^\d+$/.test(l.text);
            byCell.get(key).push({
                ...l, isNum,
                left, right: left + l.w,
                // numbers are drawn baseline:'top', letters on their baseline
                top: isNum ? l.y : l.y - capMm,
                bottom: isNum ? l.y + capMm : l.y,
            });
        });
        return { byCell, cSize };
    };

    const overlap = (a, b) =>
        a.left < b.right - 0.05 && b.left < a.right - 0.05 &&
        a.top < b.bottom - 0.05 && b.top < a.bottom - 0.05;

    let pairs = 0, collisions = 0, worstPair = '';
    for (let iter = 0; iter < 6; iter++) {
        const r = exportRun({ label: `vp-cwnum-${iter}` });
        const got = boxesOf(r.log.filter(l => l.page === 3));
        if (!got) continue;
        got.byCell.forEach(glyphs => {
            const nums = glyphs.filter(g => g.isNum);
            const letters = glyphs.filter(g => !g.isNum && /^[A-Z]$/.test(g.text));
            nums.forEach(n => letters.forEach(l => {
                pairs++;
                if (overlap(n, l)) { collisions++; worstPair = `${n.text}/${l.text}`; }
            }));
        });
    }
    check('clue numbers never overlap a prefilled letter on the student grid',
        pairs > 0 && collisions === 0, `${collisions}/${pairs} collide ${worstPair}`);

    // Two-digit numbers are the case that failed: make sure some were tested.
    const r2 = exportRun({ label: 'vp-cw2digit' });
    const twoDigit = r2.log.filter(l => l.kind === 'text' && l.page === 3 && /^\d{2}$/.test(l.text));
    check('the grid actually exercised two-digit clue numbers', twoDigit.length > 0,
        `${twoDigit.length} found`);
}

// --- BUG-XWD-03: distinct crossword topologies across a class set ---
{
    const sigs = new Set();
    for (let i = 0; i < 25; i++) {
        sigs.add(generate(WORDS, 15, (i * 2654435761) >>> 0).cw.signature);
    }
    check('25 student sets produce 25 distinct crossword topologies', sigs.size === 25, `${sigs.size}/25`);
}

// --- BUG-XWD-04 / BUG-WSR-02: a standard, forwards worked example ---
{
    let cwOk = 0, cwShortest = 0, wsOk = 0, wsForward = 0, longest = 0;
    for (let i = 0; i < 25; i++) {
        const g = generate(WORDS, 15, (i * 40503) >>> 0);
        const ac = g.cw.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
        const ex = pickCrosswordExample(ac);
        const lens = ac.map(w => w.word.length);
        const inRange = lens.some(n => n >= 5 && n <= 7);
        // 5-7 letters when the grid offers one; otherwise the closest to 6,
        // which must never be the longest word on the grid (a prefilled
        // 12-letter SUBSTITUTION used to solve a tenth of the puzzle).
        if (!inRange || (ex.word.length >= 5 && ex.word.length <= 7)) cwOk++;
        // The fallback branch only: with nothing in range, take the across
        // word nearest 6, which on these lists is the shortest one going.
        if (inRange || ex.word.length <= Math.min(...lens)) cwShortest++;
        longest = Math.max(longest, ex.word.length);
        const wex = pickWSExample(g.ws);
        if (wex && wex.word.length >= 5 && wex.word.length <= 7) wsOk++;
        if (wex && wex.dir[0] === 1 && wex.dir[1] === 0) wsForward++;
    }
    check('the crossword example is 5-7 letters whenever the grid offers one', cwOk === 25, `${cwOk}/25`);
    check('with none in range it falls back to the nearest-to-six across word', cwShortest === 25, `${cwShortest}/25`);
    check('the crossword example is never a long give-away word', longest <= 8, `longest ${longest}`);
    check('the word-search example word is a moderate 5-7 letters', wsOk === 25, `${wsOk}/25`);
    check('the word-search example always reads left to right', wsForward === 25, `${wsForward}/25`);
}

// --- BUG-DOC-01: pagination is per set, never document-wide ---
{
    const r = exportRun({ sets: 4, label: 'vp-sets' });
    check('four sets produce twenty sheets', r.pages === 20, `got ${r.pages}`);
    // Appendix pages belong to no packet and name themselves instead.
    const bad = r.footers.filter(f => !f.pageText &&
        (f.pageInSet > f.pagesInSet || f.pageInSet < 1));
    check('no footer numbers a page beyond its set', bad.length === 0, `${bad.length} bad`);
    const firstPages = r.footers.filter(f => !f.pageText && f.pageInSet === 1).length;
    check('page numbering restarts with every set', firstPages === 4, `${firstPages} sets start at page 1`);
    // The document-wide counter must not survive anywhere in a footer.
    const footerText = r.log.filter(l => l.kind === 'text' && l.y > FOOTER_BAND).map(l => l.text);
    const global = footerText.filter(t => /Page (\d+)$/.test(t));
    check('no global "Page N" counter in any footer', global.length === 0, global.slice(0, 2).join(' | '));
    check('footers name the set they belong to',
        footerText.some(t => /Set 3 — Page \d+ of \d+/.test(t)), footerText.slice(0, 2).join(' | '));
}

// --- BUG-DOC-02: the metadata block belongs to sheet one of a set ---
{
    const r = exportRun({ sets: 2, label: 'vp-header' });
    const labelsOn = (p) => r.log.filter(l => l.kind === 'text' && l.page === p)
        .map(l => l.text).filter(t => ['NAME:', 'DATE:', 'CLASS:'].includes(t));
    check('sheet one of a set carries the full name block',
        ['NAME:', 'DATE:', 'CLASS:'].every(t => labelsOn(1).includes(t)), labelsOn(1).join(','));
    check('later sheets drop to a single slim name line',
        labelsOn(2).length === 1 && labelsOn(2)[0] === 'NAME:', labelsOn(2).join(','));
    const firstPageOfSet = (si) =>
        Math.min(...Object.keys(r.pageSet).filter(p => r.pageSet[p] === si).map(Number));
    check('the next set starts its own full name block',
        ['NAME:', 'DATE:', 'CLASS:'].every(t => labelsOn(firstPageOfSet(1)).includes(t)),
        `p${firstPageOfSet(1)}: ${labelsOn(firstPageOfSet(1)).join(',')}`);
    // Every rule on the metadata block shares a start column, so no two
    // underlines come out visibly different lengths.
    const rules = r.log.filter(l => l.kind === 'line' && l.page === 1
        && l.y < 50 && (l.x2 - l.x) > 10 && (l.x2 - l.x) < PAGE.W * 0.4);
    const lens = rules.map(l => +(l.x2 - l.x).toFixed(2));
    check('name, date and class rules are all the same length',
        lens.length === 3 && new Set(lens).size === 1, lens.join(' / '));
}

// --- BUG-DOC-03: no raster emoji reaches the PDF ---
{
    const r = exportRun({ matching: true, sets: 2, label: 'vp-emoji' });
    const emoji = /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u;
    const bad = r.log.filter(l => l.kind === 'text' && emoji.test(l.text));
    check('no emoji character reaches the PDF', bad.length === 0, bad.slice(0, 2).map(l => l.text).join(' | '));
    check('no rasterised text image is embedded', r.log.filter(l => l.kind === 'image').length === 0);
}


// =============================================================
// v2 review — duplex packaging
// =============================================================

// --- BUG-DUP-01: a teacher key must never back onto a student page ---
// Duplex printing bonds pages 2k-1 and 2k onto one physical sheet. A six-page
// packet put the answer key on the reverse of the student's crossword clues,
// so the teacher could not hand the sheet over without giving away the answers.
{
    const sheetOf = (p) => Math.ceil(p / 2);
    const runs = [
        ['default packet', exportRun({ sets: 4, label: 'dup-default' })],
        ['with the split fallback', exportRun({ sets: 4, forceSplitFallback: true, label: 'dup-split' })],
        ['single set', exportRun({ sets: 1, label: 'dup-single' })],
    ];
    runs.forEach(([name, r]) => {
        const sheets = {};
        Object.entries(r.pageKind).forEach(([p, kind]) => {
            const sh = sheetOf(Number(p));
            (sheets[sh] = sheets[sh] || []).push({ p: Number(p), kind, set: r.pageSet[p] });
        });
        const leaking = Object.values(sheets).filter(sides =>
            sides.some(s => s.kind === 'key') && sides.some(s => s.kind === 'student'));
        check(`no sheet backs a teacher key onto a student page (${name})`,
            leaking.length === 0,
            leaking.slice(0, 2).map(s => s.map(x => `p${x.p}:${x.kind}`).join('/')).join(' | '));

        const mixed = Object.values(sheets).filter(sides => {
            const sets = [...new Set(sides.filter(s => s.set >= 0).map(s => s.set))];
            return sets.length > 1;
        });
        check(`no sheet carries two students' work (${name})`, mixed.length === 0,
            mixed.slice(0, 2).map(s => s.map(x => `p${x.p}:set${x.set}`).join('/')).join(' | '));
    });
}

// --- every student packet begins on the front of a fresh sheet ---
{
    const r = exportRun({ sets: 4, forceSplitFallback: true, label: 'dup-fronts' });
    const firsts = [0, 1, 2, 3].map(si =>
        Math.min(...Object.keys(r.pageSet).filter(p => r.pageSet[p] === si).map(Number)));
    check('each set starts on the front of a sheet', firsts.every(p => p % 2 === 1),
        firsts.join(','));
}

// --- the appendix names which set each key belongs to ---
{
    const r = exportRun({ sets: 3, label: 'dup-appendix' });
    const footerText = r.log.filter(l => l.kind === 'text' && l.y > FOOTER_BAND).map(l => l.text);
    check('appendix keys are numbered and name their set',
        footerText.some(t => /Set 2 — Answer key 2 of 3/.test(t)),
        footerText.filter(t => /Answer key/.test(t)).slice(0, 2).join(' | '));
    const keyPages = Object.keys(r.pageKind).filter(p => r.pageKind[p] === 'key').map(Number);
    check('all three keys land after every student set',
        keyPages.length === 3 && Math.min(...keyPages) >
            Math.max(...Object.keys(r.pageSet).filter(p => r.pageSet[p] >= 0).map(Number)),
        keyPages.join(','));
    // The banner has to say which set, not just the footer.
    const banners = r.log.filter(l => l.kind === 'text'
        && /^TEACHER ANSWER KEY — SET \d+$/.test(l.text) && keyPages.includes(l.page));
    check('each appendix key names its set in the header', banners.length === 3,
        `${banners.length}/3`);
}

// --- keysAtEnd off restores the old inline behaviour ---
{
    const r = exportRun({ sets: 2, keysAtEnd: false, label: 'dup-inline' });
    const keyPages = Object.keys(r.pageKind).filter(p => r.pageKind[p] === 'key').map(Number);
    check('keys can still be placed inline when asked for', keyPages.length === 2, keyPages.join(','));
}


// --- BUG-HDR-01: the header must not jump when a student turns the page ---
{
    const r = exportRun({ sets: 2, label: 'hdr-consistency' });
    const studentPages = Object.keys(r.pageKind)
        .filter(p => r.pageKind[p] === 'student').map(Number);

    // The SET badge is right-aligned on the title line of every page, rather
    // than hiding in the top margin on some and inside the NAME row on others.
    const badges = studentPages.map(p => r.log.find(l =>
        l.kind === 'text' && l.page === p && /^SET \d+$/.test(l.text)));
    check('every student page carries the SET badge', badges.every(Boolean),
        `${badges.filter(Boolean).length}/${studentPages.length}`);
    const badgeYs = [...new Set(badges.filter(Boolean).map(b => +b.y.toFixed(1)))];
    const badgeRight = [...new Set(badges.filter(Boolean)
        .map(b => +(b.align === 'right' ? b.x : b.x + b.w).toFixed(1)))];
    check('the SET badge keeps one right edge on every page', badgeRight.length === 1,
        badgeRight.join(','));
    // Sheet one is taller (it carries the subtitle), so at most two Y positions:
    // the full header and the slim running header.
    check('the SET badge sits at no more than two heights', badgeYs.length <= 2,
        badgeYs.join(','));

    // The name row is always below the divider rule, never beside the title.
    let checkedRows = 0, aboveDivider = 0;
    studentPages.forEach(p => {
        const nameLabel = r.log.find(l => l.kind === 'text' && l.page === p && l.text === 'NAME:');
        const divider = r.log.filter(l => l.kind === 'line' && l.page === p
            && Math.abs((l.x2 - l.x) - (PAGE.W - 2 * PAGE.MARGIN)) < 0.5 && l.y < 50)
            .sort((a, b) => a.y - b.y)[0];
        if (!nameLabel || !divider) return;
        checkedRows++;
        if (nameLabel.y <= divider.y) aboveDivider++;
    });
    check('the name row sits below the divider on every page',
        checkedRows === studentPages.length && aboveDivider === 0,
        `${aboveDivider} above, ${checkedRows}/${studentPages.length} checked`);
}


// --- BUG-SCR-01: two columns and a word bank on the scramble ---
{
    const r = exportRun({ label: 'scr-bank' });
    const scrPage = r.log.filter(l => l.page === 4);

    check('the scramble page carries a word bank',
        scrPage.some(l => l.kind === 'text' && l.text === 'WORD BANK'));
    // Every answer has to be in it, or it is not a bank.
    const banked = WORDS.filter(w =>
        scrPage.some(l => l.kind === 'text' && l.text === w.word && l.y > 200));
    check('the word bank lists every answer', banked.length === WORDS.length,
        `${banked.length}/${WORDS.length}`);

    // Twenty items down one column left a 12cm rule beside a 3-letter word.
    const numbers = scrPage.filter(l => l.kind === 'text' && /^\d+\.$/.test(l.text));
    const columnXs = [...new Set(numbers.map(l => Math.round(l.x)))];
    check('scramble items run in two columns', columnXs.length === 2, columnXs.join(','));

    // Writing lines are sized for a word, not for the rest of the column.
    // Answer lines only: skip the full-width header divider and footer rule.
    const rules = scrPage.filter(l => l.kind === 'line' && l.y > BODY_TOP && l.y < 240
        && (l.x2 - l.x) > 5 && (l.x2 - l.x) < PAGE.W - 2 * PAGE.MARGIN - 1);
    const longest = Math.max(...rules.map(l => l.x2 - l.x));
    check('no answer line is longer than 55mm', longest <= 55, `longest ${longest.toFixed(1)}mm`);

    const off = exportRun({ label: 'scr-nobank', words: WORDS });
    check('the scramble example still fits beside its pill',
        pillCollisions(off.log).length === 0, pillCollisions(off.log).slice(0, 2).join(' | '));
}


// =============================================================
// v3 review
// =============================================================

// --- BUG-REG-01: the set identifier appears on every page, always ---
// It used to be suppressed whenever only one set was generated, so a teacher
// with a marked sheet and an answer key had no way to pair them.
{
    [['single set', 1], ['four sets', 4]].forEach(([name, sets]) => {
        const r = exportRun({ sets, label: `reg-set-${sets}` });
        const studentPages = Object.keys(r.pageKind)
            .filter(p => r.pageKind[p] === 'student').map(Number);
        const badged = studentPages.filter(p => r.log.some(l =>
            l.kind === 'text' && l.page === p && /^SET \d+$/.test(l.text)));
        check(`every student page shows its SET badge (${name})`,
            badged.length === studentPages.length,
            `${badged.length}/${studentPages.length}`);

        const footerText = r.log.filter(l => l.kind === 'text' && l.y > FOOTER_BAND)
            .map(l => l.text);
        const setless = footerText.filter(t => /Page \d+ of \d+/.test(t) && !/Set \d+/.test(t));
        check(`every paginated footer names its set (${name})`, setless.length === 0,
            setless.slice(0, 2).join(' | '));

        const keyPages = Object.keys(r.pageKind).filter(p => r.pageKind[p] === 'key').map(Number);
        const keyBanners = keyPages.filter(p => r.log.some(l => l.kind === 'text'
            && l.page === p && /TEACHER ANSWER KEY — SET \d+/.test(l.text)));
        check(`every answer key names its set (${name})`,
            keyBanners.length === keyPages.length, `${keyBanners.length}/${keyPages.length}`);
        check(`answer-key footers name their set (${name})`,
            footerText.filter(t => /Answer key/.test(t)).every(t => /Set \d+/.test(t)),
            footerText.filter(t => /Answer key/.test(t)).slice(0, 2).join(' | '));
    });
}

// --- BUG-XWD-07 / BUG-DOC-04: exactly four student pages, no filler ---
{
    const r = exportRun({ sets: 4, label: 'v3-budget' });
    const perSet = [0, 1, 2, 3].map(si =>
        Object.keys(r.pageSet).filter(p => r.pageSet[p] === si).length);
    check('each student packet is exactly four pages', perSet.every(n => n === 4),
        perSet.join(','));
    check('no packet needs a blank filler page',
        !Object.values(r.pageKind).includes('filler'),
        Object.entries(r.pageKind).filter(([, k]) => k === 'filler').map(([p]) => p).join(','));
    check('no "intentionally blank" page is printed',
        !r.log.some(l => l.kind === 'text' && /intentionally blank/i.test(l.text)));
    check('four sets plus four keys is twenty sheets', r.pages === 20, `got ${r.pages}`);

    // Grid and clues have to be on the same sheet, not merely the same packet.
    const cwPages = [0, 1, 2, 3].map(si => {
        const pages = Object.keys(r.pageSet).filter(p => r.pageSet[p] === si).map(Number).sort((a, b) => a - b);
        return pages.find(p => r.log.some(l => l.kind === 'text' && l.page === p && l.text === 'ACROSS'));
    });
    const gridOnSamePage = cwPages.every(p => p !== undefined &&
        r.log.some(l => l.kind === 'rect' && l.page === p && Math.abs(l.w - l.h) < 0.01 && l.w > 3));
    check('the crossword grid shares its page with ACROSS and DOWN', gridOnSamePage,
        cwPages.join(','));
}

// --- BUG-KEY-02: the key names itself once, not twice ---
{
    const r = exportRun({ sets: 2, label: 'v3-keyhdr' });
    const keyPages = Object.keys(r.pageKind).filter(p => r.pageKind[p] === 'key').map(Number);
    keyPages.forEach(p => {
        const banners = r.log.filter(l => l.kind === 'text' && l.page === p
            && /TEACHER ANSWER KEY/.test(l.text));
        check(`the answer key header says TEACHER ANSWER KEY once (p${p})`,
            banners.length === 1, banners.map(b => b.text).join(' | '));
    });
}

// --- BUG-VOC-06: no bounding box to clip the row number ---
{
    const r = exportRun({ matching: true, label: 'v3-outline' });
    const notesPage = r.log.filter(l => l.page === 1);
    const num = notesPage.find(l => l.kind === 'text' && l.text === '1.');
    check('the vocabulary page still numbers its first row', !!num);
    // Any stroked box starting at or left of the number column would run
    // through the glyph, which is what clipped "1.".
    const boxesOverNumber = notesPage.filter(l => l.kind === 'rect'
        && l.w > 20 && num && l.x <= num.x + 1 && l.y < num.y && l.y + l.h > num.y);
    check('no outline box runs through the row number', boxesOverNumber.length === 0,
        `${boxesOverNumber.length} boxes`);
    // The example is still findable from its own content.
    check('the example is still marked by its badge',
        notesPage.some(l => l.kind === 'text' && l.text === 'EXAMPLE'));
}

console.log(failed ? `\n${failed} failing check(s)` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
