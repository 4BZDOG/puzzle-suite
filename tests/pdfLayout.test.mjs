// =============================================================
// tests/pdfLayout.test.mjs — PDF layout regression tests
// =============================================================
// Runs the real PDF drawers against real generated puzzle data in Node
// (no browser), then asserts on where things actually landed on the page.
// These cover the defects reported in the March 2026 worksheet review:
// split crossword pages, wasted whitespace, colliding answer-key text,
// missing crossword key numbers, and the Times-italic font fallback.
//
//   npm run test:pdf            # assertions only
//   npm run test:pdf -- --write # also write sample PDFs to tests/__out__/
// =============================================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jsPDF } from 'jspdf';

import { buildCtx, drawHeader, drawFooter } from '../pdf/pdfHelpers.js';
import { drawWordSearch } from '../pdf/pdfDrawWordSearch.js';
import { drawCrosswordPage, drawCrosswordClues } from '../pdf/pdfDrawCrossword.js';
import { drawScramble } from '../pdf/pdfDrawScramble.js';
import { drawNotes, drawMasterKeyPage } from '../pdf/pdfDrawNotes.js';

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

function generate(words, wsSize = 15) {
    workerSelf.onmessage({ data: {
        id: 1, words, wsSize, wsDiag: true, wsBack: true,
        wsHard: false, wsCustomFillers: '', cwMaxWords: 15,
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
    const page = () => doc.internal.getNumberOfPages();
    const origText = doc.text.bind(doc);
    doc.text = function (txt, x, y, o) {
        (Array.isArray(txt) ? txt : [txt]).forEach(t => log.push({
            kind: 'text', page: page(), text: String(t), x, y,
            align: (o && o.align) || 'left',
            font: `${doc.getFont().fontName}-${doc.getFont().fontStyle}`,
            size: doc.getFontSize(),
            w: doc.getTextWidth(String(t)),
        }));
        return origText(txt, x, y, o);
    };
    const origRect = doc.rect.bind(doc);
    doc.rect = function (x, y, w, h, s) { log.push({ kind: 'rect', page: page(), x, y, w, h }); return origRect(x, y, w, h, s); };
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
    cwShowBank = false, cwSeparateClues = false, label = 'run',
} = {}) {
    const cpd = generate(words);
    cpd.notes = buildNotes(words, matching);
    const { doc, log } = makeDoc();
    const ctx = buildCtx(doc, 'helvetica', null, 1,
        { PAGE_WIDTH: PAGE.W, PAGE_HEIGHT: PAGE.H, MARGIN: PAGE.MARGIN },
        {
            notesConfig: { showTerm: true, showDef: true, shuffle: matching, termWidth: 20 },
            showExample, showLetterCount, cwShowBank, wsInternalGrid: false, titleScale: 1,
            title: 'Linear Relationships & Coordinate Geometry',
        });

    const title = 'Linear Relationships', sub = 'Year 8 Mathematics — Unit 4';
    const box = (sy) => ({ x: PAGE.MARGIN, y: sy, w: PAGE.W - 2 * PAGE.MARGIN, h: PAGE.H - sy - PAGE.MARGIN - PAGE.FOOTER });
    let first = true;
    const addPage = () => { if (!first) doc.addPage(); first = false; };

    addPage();
    let sy = drawHeader(ctx, title, sub, 'Terms and definitions.', false, '', 1, { label: 'VOCABULARY', accent: [99, 102, 241] });
    drawNotes(ctx, cpd.notes, sy, 1);
    drawFooter(ctx, 1, { right: 'VOCABULARY' });

    addPage();
    sy = drawHeader(ctx, title, sub, 'Find each word.', false, '', 1, { label: 'WORD SEARCH', accent: [13, 148, 136] });
    drawWordSearch(ctx, cpd.ws, box(sy), words, false, false, 1);
    drawFooter(ctx, 1, { right: 'WORD SEARCH' });

    addPage();
    sy = drawHeader(ctx, title, sub, 'Fill in the grid.', false, '', 1, { label: 'CROSSWORD', accent: [124, 58, 237] });
    const res = drawCrosswordPage(ctx, cpd.cw, box(sy), 1, cwSeparateClues);
    drawFooter(ctx, 1, { right: 'CROSSWORD' });
    if (res.splitNeeded) {
        addPage();
        const cluesSy = drawHeader(ctx, title, sub, 'Clues.', false, '', 1, { label: 'CROSSWORD', accent: [124, 58, 237] });
        drawCrosswordClues(ctx, cpd.cw, cluesSy, 1);
        drawFooter(ctx, 1, { right: 'CROSSWORD CLUES' });
    }

    addPage();
    sy = drawHeader(ctx, title, sub, 'Unscramble.', false, '', 1, { label: 'WORD SCRAMBLE', accent: [217, 119, 6] });
    drawScramble(ctx, cpd.scr, box(sy), false, false, 1);
    drawFooter(ctx, 1, { right: 'WORD SCRAMBLE' });

    addPage();
    drawMasterKeyPage(ctx, title, sub, cpd, { ws: true, cw: true, scr: true, notes: true }, 1);
    drawFooter(ctx, 1, { right: 'TEACHER KEY' });

    if (WRITE) {
        const dir = path.join(ROOT, 'tests/__out__');
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, `${label}.pdf`), Buffer.from(doc.output('arraybuffer')));
    }
    return { cpd, log, doc, pages: doc.internal.getNumberOfPages(), splitNeeded: res.splitNeeded };
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

check('crossword key keeps its clue numbers',
    keyText.filter(t => /^\d+$/.test(t.text) && t.size < 6).length > 3);
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

const split = exportRun({ cwSeparateClues: true, label: 'separate-clues' });
check('an explicitly separate clue page still works', split.pages === 6, `got ${split.pages}`);

[['six-word', small], ['no-scaffolding', plain], ['scaffolded', scaffolded],
 ['word-bank', banked], ['separate-clues', split]].forEach(([name, run]) => {
    const c = collisions(run.log);
    check(`nothing overlaps in the ${name} export`, c.length === 0, c.slice(0, 3).join(' | '));
});

console.log(failed ? `\n${failed} failing check(s)` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
