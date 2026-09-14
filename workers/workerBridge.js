// =============================================================
// workers/workerBridge.js
// Manages the generation Worker: lifecycle, sequencing,
// and the public generateAllAsync() API.
// Stale-result rejection is handled at main.js level via generationSequenceId.
// =============================================================
import { state } from '../core/state.js';

// ---- Worker setup --------------------------------------------
// Worker code is inlined as a Blob URL so it works everywhere:
// file://, http://, bundled IIFE — no external file needed.

const _workerScript = `
const PROFANITY = ["FUCK","SHIT","BITCH","ASS","CUNT","DICK","COCK","PUSSY","SLUT","WHORE","CRAP","PISS","CUM","TWAT","TIT","CLIT"];
const WS_MAX_ATTEMPTS = 2000;

// -------------------------------------------------------------
// Seeded randomness.
//
// Every set used to be generated from Math.random() with a greedy
// placement loop that always took the single best-scoring move, so the
// crossword collapsed onto the same handful of topologies no matter how
// many sets a teacher printed (sets 2, 6, 7 and 23 came out identical).
// A per-set seed drives every random choice below, so two sets differ by
// construction and a given seed always reproduces the same puzzle.
// -------------------------------------------------------------
function mulberry32(a) {
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffleInPlace(arr, rnd) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
}

/**
 * Index of the word that should carry the worked example.
 *
 * Example words used to be "whichever word happened to be placed first",
 * which meant a 12-letter SUBSTITUTION solved a tenth of the puzzle in one
 * set and a 4-letter PLOT gave almost nothing away in the next. Prefer a
 * moderate 5-7 letters, then fall back to whatever is closest to 6.
 */
function pickExampleIndex(list, lenOf) {
    if (!list.length) return -1;
    const ideal = [];
    for (let i = 0; i < list.length; i++) {
        const n = lenOf(list[i]);
        if (n >= 5 && n <= 7) ideal.push(i);
    }
    if (ideal.length) return ideal[0];
    let best = 0, bestD = Infinity;
    for (let i = 0; i < list.length; i++) {
        const d = Math.abs(lenOf(list[i]) - 6);
        if (d < bestD) { bestD = d; best = i; }
    }
    return best;
}

function generateWS(sz, wordList, useDiag, useBack, useHard, customFillers, rnd) {
    let g = Array(sz).fill(null).map(() => Array(sz).fill(''));
    let solArray = [];
    let p = [];
    let l = JSON.parse(JSON.stringify(wordList))
        .filter(w => w.word && w.word.length <= sz)
        .sort((a, b) => b.word.length - a.word.length);

    const dirs = [[1, 0], [0, 1]];
    if (useDiag) dirs.push([1, 1]);
    if (useBack) dirs.push([-1, 0], [0, -1]);
    if (useDiag && useBack) dirs.push([-1, -1], [1, -1], [-1, 1]);

    let wp = [];

    // Try to drop one word into the grid along one of \`allowed\`.
    const place = (o, allowed, isExample) => {
        const w = o.word;
        let t = 0;
        while (t < WS_MAX_ATTEMPTS) {
            const d = allowed[Math.floor(rnd() * allowed.length)];
            const x = Math.floor(rnd() * sz);
            const y = Math.floor(rnd() * sz);
            if (
                x + (w.length - 1) * d[0] >= 0 && x + (w.length - 1) * d[0] < sz &&
                y + (w.length - 1) * d[1] >= 0 && y + (w.length - 1) * d[1] < sz
            ) {
                let ok = true;
                for (let i = 0; i < w.length; i++) {
                    const cell = g[y + i * d[1]][x + i * d[0]];
                    if (cell !== '' && cell !== w[i]) ok = false;
                }
                if (ok) {
                    const cells = [];
                    for (let i = 0; i < w.length; i++) {
                        g[y + i * d[1]][x + i * d[0]] = w[i];
                        solArray.push((x + i * d[0]) + ',' + (y + i * d[1]));
                        cells.push({ x: x + i * d[0], y: y + i * d[1] });
                    }
                    p.push(w);
                    wp.push({ word: w, cells, dir: [d[0], d[1]], isExample: !!isExample });
                    return true;
                }
            }
            t++;
        }
        return false;
    };

    // The worked example goes down first, forwards left-to-right. A Year 8
    // student meeting the idea of a word search for the first time should
    // not have their one worked example spelled backwards.
    const exIdx = pickExampleIndex(l, o => o.word.length);
    let exampleWord = null;
    if (exIdx >= 0) {
        const cand = l.splice(exIdx, 1)[0];
        if (place(cand, [[1, 0]], true)) exampleWord = cand.word;
        else l.unshift(cand);
    }

    l.forEach(o => { place(o, dirs, false); });

    let pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (useHard) {
        const j = wordList.map(x => x.word).join('');
        if (j.length >= 5) pool = j;
    }
    if (customFillers && customFillers.trim().length > 0) {
        pool = customFillers.toUpperCase().replace(/\\s/g, '');
        if (pool.length === 0) pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
            if (g[y][x] === '') g[y][x] = pool[Math.floor(rnd() * pool.length)];
        }
    }
    return {
        grid: g, size: sz, solutionArray: solArray, placed: p.sort(),
        wordPositions: wp, exampleWord,
    };
}

function checkCW(g, w, x, y, d) {
    const dx = d === 'across' ? 1 : 0, dy = d === 'across' ? 0 : 1;
    if (x < 0 || y < 0 || x + w.length * dx > g[0].length || y + w.length * dy > g.length) return false;
    for (let i = 0; i < w.length; i++) {
        const c = g[y + i * dy][x + i * dx];
        if (c !== null && c !== w[i]) return false;
        if (c === null) {
            if (
                (g[y + i * dy + dx] && g[y + i * dy + dx][x + i * dx + dy] !== null) ||
                (g[y + i * dy - dx] && g[y + i * dy - dx][x + i * dx - dy] !== null)
            ) return false;
        }
    }
    if (x - dx >= 0 && y - dy >= 0 && g[y - dy][x - dx] !== null) return false;
    if (
        x + w.length * dx < g[0].length &&
        y + w.length * dy < g.length &&
        g[y + w.length * dy][x + w.length * dx] !== null
    ) return false;
    return true;
}

function generateCW(wordList, seedIndex, rnd) {
    seedIndex = seedIndex || 0;
    let l = JSON.parse(JSON.stringify(wordList)).filter(w => w.word && w.word.length > 1);
    if (!l.length) return { grid: [], rows: 0, cols: 0, placed: [] };

    // A proper shuffle, then a stable length sort: equal-length words keep
    // the shuffled order, so the packing order genuinely varies per seed.
    shuffleInPlace(l, rnd);
    l.sort((a, b) => b.word.length - a.word.length);

    if (seedIndex > 0 && seedIndex < l.length) {
        const seedWord = l.splice(seedIndex, 1)[0];
        l.unshift(seedWord);
    }

    const MAX = 150, MID = 75;
    let g = Array(MAX).fill(null).map(() => Array(MAX).fill(null));
    let p = [];

    // Starting the seed word down instead of across transposes the whole
    // topology — the cheapest way to make two sets look different.
    const f = l.shift();
    const firstDir = rnd() < 0.5 ? 'across' : 'down';
    const fdx = firstDir === 'across' ? 1 : 0, fdy = firstDir === 'across' ? 0 : 1;
    const fc = MID - Math.floor(f.word.length / 2);
    const fx = firstDir === 'across' ? fc : MID;
    const fy = firstDir === 'across' ? MID : fc;
    for (let i = 0; i < f.word.length; i++) g[fy + i * fdy][fx + i * fdx] = f.word[i];
    p.push({ ...f, x: fx, y: fy, dir: firstDir });

    let placedCount;
    const startTime = Date.now();

    do {
        if (Date.now() - startTime > 1500) break;
        placedCount = 0;
        // Best placement for each remaining word, so a near-best move can be
        // taken instead of always the single global optimum.
        let candidates = [];

        for (let i = 0; i < l.length; i++) {
            const w = l[i].word;
            let possiblePlacements = [];

            for (const pl of p) {
                for (let j = 0; j < w.length; j++) {
                    for (let k = 0; k < pl.word.length; k++) {
                        if (w[j] === pl.word[k]) {
                            const ia = pl.dir === 'across', nd = ia ? 'down' : 'across';
                            const sx = (pl.x + (ia ? k : 0)) - (nd === 'across' ? j : 0);
                            const sy = (pl.y + (ia ? 0 : k)) - (nd === 'down'   ? j : 0);

                            if (checkCW(g, w, sx, sy, nd)) {
                                let intersections = 0;
                                for (let z = 0; z < w.length; z++) {
                                    if (g[sy + (nd === 'down' ? z : 0)][sx + (nd === 'across' ? z : 0)] !== null) intersections++;
                                }
                                let minX = MAX, maxX = 0, minY = MAX, maxY = 0;
                                for (const existing of p) {
                                    minX = Math.min(minX, existing.x); minY = Math.min(minY, existing.y);
                                    maxX = Math.max(maxX, existing.x + (existing.dir === 'across' ? existing.word.length - 1 : 0));
                                    maxY = Math.max(maxY, existing.y + (existing.dir === 'down'   ? existing.word.length - 1 : 0));
                                }
                                minX = Math.min(minX, sx); minY = Math.min(minY, sy);
                                maxX = Math.max(maxX, sx + (nd === 'across' ? w.length - 1 : 0));
                                maxY = Math.max(maxY, sy + (nd === 'down' ? w.length - 1 : 0));

                                const area   = (maxX - minX + 1) * (maxY - minY + 1);
                                const aspect = Math.abs((maxX - minX) - (maxY - minY));
                                const score  = (intersections * 1000) - area - (aspect * 10);
                                possiblePlacements.push({ x: sx, y: sy, dir: nd, score, wordIdx: i });
                            }
                        }
                    }
                }
            }

            if (possiblePlacements.length > 0) {
                possiblePlacements.sort((a, b) => b.score - a.score);
                candidates.push(possiblePlacements[0]);
            }
        }

        if (candidates.length > 0) {
            // Take a random move from the near-best band rather than the
            // single best one. The band is narrow, so grid quality holds,
            // but the topology stops being a pure function of the word list.
            candidates.sort((a, b) => b.score - a.score);
            const topScore = candidates[0].score;
            const band = Math.max(40, Math.abs(topScore) * 0.05);
            const pool = candidates.filter(c => c.score >= topScore - band);
            const bestMove = pool[Math.floor(rnd() * pool.length)];

            const wObj = l.splice(bestMove.wordIdx, 1)[0];
            const dx = bestMove.dir === 'across' ? 1 : 0, dy = bestMove.dir === 'across' ? 0 : 1;
            for (let z = 0; z < wObj.word.length; z++) {
                g[bestMove.y + z * dy][bestMove.x + z * dx] = wObj.word[z];
            }
            p.push({ ...wObj, x: bestMove.x, y: bestMove.y, dir: bestMove.dir });
            placedCount++;
        }
    } while (placedCount > 0 && l.length > 0);

    if (!p.length) return { grid: [], rows: 0, cols: 0, placed: [] };

    let mx = MAX, Mx = 0, my = MAX, My = 0;
    p.forEach(z => {
        const len = z.word.length, isa = z.dir === 'across';
        mx = Math.min(mx, z.x); my = Math.min(my, z.y);
        Mx = Math.max(Mx, z.x + (isa ? len - 1 : 0));
        My = Math.max(My, z.y + (isa ? 0 : len - 1));
    });

    const w = Mx - mx + 1, h = My - my + 1;
    const fg = Array(h).fill(null).map(() => Array(w).fill(null));
    p.forEach(z => { z.x -= mx; z.y -= my; });

    p.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    let n = 1;
    p.forEach((z, idx) => {
        const ex = p.slice(0, idx).find(e => e.x === z.x && e.y === z.y);
        z.num = ex ? ex.num : n++;
        const dx = z.dir === 'across' ? 1 : 0, dy = z.dir === 'across' ? 0 : 1;
        for (let i = 0; i < z.word.length; i++) {
            const r = z.y + i * dy, c = z.x + i * dx;
            if (!fg[r][c]) fg[r][c] = { char: z.word[i], num: null };
            if (i === 0) fg[r][c].num = z.num;
        }
    });

    return { grid: fg, rows: h, cols: w, placed: p };
}

function generateScramble(wordList, rnd) {
    return wordList.map(w => {
        let arr = w.word.split('');
        let tries = 0, scrambled;
        do {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
            }
            scrambled = arr.join('');
            tries++;
        } while (
            (scrambled === w.word || PROFANITY.some(bw => scrambled.includes(bw))) &&
            tries < 50 &&
            w.word.length > 1
        );
        return { original: w.word, scrambled };
    });
}

self.onmessage = function (e) {
    const { id, words, wsSize, wsDiag, wsBack, wsHard, wsCustomFillers, cwMaxWords, variantSeed } = e.data;

    const seed = (variantSeed === undefined || variantSeed === null)
        ? ((Math.random() * 4294967296) >>> 0)
        : (variantSeed >>> 0);
    const rnd = mulberry32(seed);

    const ws = generateWS(wsSize, words, wsDiag, wsBack, wsHard, wsCustomFillers, rnd);

    const CW_CAP = cwMaxWords || 15;
    let cwInput = words.filter(w => w.word && w.word.length > 1);
    if (cwInput.length > CW_CAP) {
        cwInput = [...cwInput].sort((a, b) => b.word.length - a.word.length).slice(0, CW_CAP);
    }

    let bestCW = null, bestScore = Infinity;
    for (let i = 0; i < Math.min(5, cwInput.length); i++) {
        const attempt = generateCW(cwInput, i, rnd);
        const area    = attempt.cols * attempt.rows;
        const aspect  = Math.abs(attempt.cols - attempt.rows) * 10;
        const unplaced = cwInput.length - attempt.placed.length;
        const score   = (unplaced * 10000) + area + aspect;
        if (score < bestScore) { bestCW = attempt; bestScore = score; }
    }
    if (!bestCW) bestCW = { grid: [], rows: 0, cols: 0, placed: [] };
    bestCW.signature = bestCW.placed
        .map(z => z.word + '@' + z.x + ',' + z.y + z.dir[0])
        .sort().join('|');

    const scr = generateScramble(words, rnd);

    self.postMessage({ id, result: { ws, cw: bestCW, scr, seed } });
};
`;

let _worker = null;
let _msgId = 0;
const _pendingPromises = {};

function getWorker() {
    if (_worker) return _worker;

    try {
        const blob = new Blob([_workerScript], { type: 'application/javascript' });
        _worker = new Worker(URL.createObjectURL(blob));
    } catch (_) {
        console.warn('Worker creation failed — running without generation worker.');
        _worker = null;
        return null;
    }

    _worker.onmessage = (e) => {
        const { id, result, error } = e.data;
        if (error) {
            console.error('Worker generation error:', error);
            if (_pendingPromises[id]) { _pendingPromises[id](null); delete _pendingPromises[id]; }
            return;
        }
        if (result && result.ws) result.ws.solution = new Set(result.ws.solutionArray);
        if (_pendingPromises[id]) {
            _pendingPromises[id](result);
            delete _pendingPromises[id];
        }
    };

    _worker.onerror = (err) => {
        console.error('Worker error:', err);
        for (const id in _pendingPromises) {
            _pendingPromises[id](null);
            delete _pendingPromises[id];
        }
    };

    return _worker;
}

// ---- Public API ----------------------------------------------

/**
 * Dispatch a generation request to the worker.
 * Returns a Promise that resolves to { ws, cw, scr, seed } or null
 * if a newer request superseded this one, or if no worker is available.
 *
 * @param {Object} settings
 * @param {number} [variantSeed] - per-set seed; omit for a random one.
 *        Bulk export passes a distinct seed per set so two students never
 *        get the same crossword topology.
 */
export function generateAllAsync(settings, variantSeed) {
    const worker = getWorker();
    if (!worker) return Promise.resolve(null);

    return new Promise(resolve => {
        const id = ++_msgId;
        _pendingPromises[id] = resolve;

        const s = settings || state.settings;

        worker.postMessage({
            id,
            words: state.words,
            wsSize: s.wsSize || 15,
            wsDiag: s.wsDiag ?? true,
            wsBack: s.wsBack ?? true,
            wsHard: s.wsHardFiller || false,
            wsCustomFillers: s.wsCustomFillers || '',
            cwMaxWords: s.cwSeparateClues ? 999 : 15,
            variantSeed,
        });
    });
}

/**
 * Transpose a crossword: across becomes down and the grid is reflected
 * about its leading diagonal.
 *
 * This is the only rigid transformation available to a crossword — a
 * rotation or a mirror would leave every word reading backwards. It is the
 * last-resort diversifier when two sets still come out with the same
 * topology after re-seeding.
 *
 * @returns {Object} a new crossword object; the input is not mutated.
 */
export function transposeCrossword(cw) {
    if (!cw || !cw.placed?.length) return cw;

    const placed = cw.placed.map(z => ({
        ...z, x: z.y, y: z.x,
        dir: z.dir === 'across' ? 'down' : 'across',
    }));

    const rows = cw.cols, cols = cw.rows;
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));

    // Renumber with the generator's own rule: reading order, shared start
    // cells share a number.
    placed.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    let n = 1;
    placed.forEach((z, idx) => {
        const ex = placed.slice(0, idx).find(e => e.x === z.x && e.y === z.y);
        z.num = ex ? ex.num : n++;
        const dx = z.dir === 'across' ? 1 : 0, dy = z.dir === 'across' ? 0 : 1;
        for (let i = 0; i < z.word.length; i++) {
            const r = z.y + i * dy, c = z.x + i * dx;
            if (!grid[r][c]) grid[r][c] = { char: z.word[i], num: null };
            if (i === 0) grid[r][c].num = z.num;
        }
    });

    return {
        ...cw, grid, rows, cols, placed,
        signature: placed.map(z => z.word + '@' + z.x + ',' + z.y + z.dir[0]).sort().join('|'),
    };
}

/**
 * Terminate the worker and reset state.
 * Call this only if you need to fully reset (e.g., hard reset).
 */
export function terminateWorker() {
    if (_worker) {
        _worker.terminate();
        _worker = null;
    }
    _msgId = 0;
    for (const id in _pendingPromises) {
        _pendingPromises[id](null);
        delete _pendingPromises[id];
    }
}
