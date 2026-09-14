// =============================================================
// renderers/crossword.js — Page 3: Crossword preview
// =============================================================

import { pickCrosswordExample } from '../core/exampleModel.js';

const escapeHTML = str => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));

const CELL_SIZE_MIN = 15, CELL_SIZE_MAX = 60;

export function calcCWScale(cwData, isPrint = false) {
    const w = isPrint ? 750 : 640, h = 500;
    const cols = Math.max(1, cwData?.cols || 1);
    const rows = Math.max(1, cwData?.rows || 1);
    return Math.min(CELL_SIZE_MAX, Math.max(CELL_SIZE_MIN, Math.floor(Math.min(w / cols, h / rows))));
}

/**
 * @param {HTMLElement} gridArea
 * @param {HTMLElement} footerArea
 * @param {Object}      cwData     - puzzleData.cw
 * @param {Object}      settings   - state.settings
 * @param {boolean}     preview
 */
export function renderCrossword(gridArea, footerArea, cwData, settings, preview = true) {
    const z = preview
        ? (() => { const el = document.getElementById('scaleCrossword'); return el ? parseInt(el.value, 10) : calcCWScale(cwData); })()
        : calcCWScale(cwData);

    // Compute example word at function level so both grid and clue blocks can use it
    // Same picker as the PDF, so preview and print prefill the same word.
    const firstAcross = settings.showExample && cwData?.placed?.length
        ? pickCrosswordExample(cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num))
        : null;

    if (gridArea) {
        gridArea.innerHTML = '';
        if (!cwData || cwData.placed.length === 0) {
            gridArea.innerHTML = `<div style="color:var(--danger); text-align:center; padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:12px; display:block;"></i>
                <h3 style="margin:0 0 8px 0;">Crossword Generation Incomplete</h3>
                <p style="color:var(--text-muted); margin:0;">Words could not connect well. Try adding more or longer words.</p>
            </div>`;
            if (footerArea) footerArea.innerHTML = '';
            return;
        }

        const exCells = new Set();
        if (firstAcross) {
            for (let i = 0; i < firstAcross.word.length; i++) exCells.add(`${firstAcross.x + i},${firstAcross.y}`);
        }

        let htmlStr = `<table class="mode-cw" style="--cell-size: ${z}px;">`;

        for (let y = 0; y < cwData.rows; y++) {
            htmlStr += `<tr>`;
            for (let x = 0; x < cwData.cols; x++) {
                const v = cwData.grid[y][x];
                if (v) {
                    const isEx = exCells.has(`${x},${y}`);
                    const letterIdx = firstAcross ? x - firstAcross.x : -1;
                    const letter = isEx ? firstAcross.word[letterIdx] : '';
                    // Size comes from --cell-size on the table so the page
                    // fitter below can rescale the grid in one assignment.
                    htmlStr += `<td class="cell${isEx ? ' cell-example' : ''}">
                        <span class="cell-num">${v.num || ''}</span>${isEx ? `<span class="cell-example-letter">${letter}</span>` : ''}
                    </td>`;
                } else {
                    htmlStr += `<td class="cell empty"></td>`;
                }
            }
            htmlStr += `</tr>`;
        }
        htmlStr += `</table>`;
        gridArea.innerHTML = htmlStr;
    }

    if (footerArea && cwData && cwData.placed.length) {
        const ac = cwData.placed.filter(w => w.dir === 'across').sort((a, b) => a.num - b.num);
        const dn = cwData.placed.filter(w => w.dir === 'down').sort((a, b) => a.num - b.num);

        const exampleNum = firstAcross ? firstAcross.num : -1;
        const showLetterCount = settings.showLetterCount !== false;
        const makeClueRows = (list) =>
            list.map(w => {
                const isEx = settings.showExample && w.num === exampleNum && w.dir === 'across';
                const len = showLetterCount ? ` <span class="notes-clue-length">(${w.word.length})</span>` : '';
                return `<div class="clue-row${isEx ? ' clue-example' : ''}"><span class="clue-num-bold">${w.num}.</span><span>${escapeHTML(w.clue)}${len}${isEx ? '<span class="example-pill">EXAMPLE</span>' : ''}</span></div>`;
            }).join('');

        const separateClues = settings.cwSeparateClues;
        let html = '';
        if (separateClues) {
            html += '<div class="cw-separate-clues-badge"><i class="fas fa-file-alt"></i> Clues will appear on a separate page in PDF</div>';
        }
        html += '<div class="clues-two-col">';
        if (ac.length) html += `<div class="clue-col"><div class="clue-group-title first">ACROSS</div>${makeClueRows(ac)}</div>`;
        if (dn.length) html += `<div class="clue-col"><div class="clue-group-title first">DOWN</div>${makeClueRows(dn)}</div>`;
        html += '</div>';

        if (settings.cwShowBank) {
            const bk = cwData.placed.map(x => x.word).sort();
            const ml = bk.reduce((m, w) => Math.max(m, w.length), 0);
            let c = 4;
            if (ml > 10) c = 3;
            if (ml > 15) c = 2;
            html += `<div style="border-top:1px solid #cbd5e1; margin-top:20px; padding-top:20px;">
                <div class="word-bank-styled" style="column-count:${c}; display:block; column-gap:20px;">
                    ${bk.map(w => `<div class="wb-item" style="margin-bottom:6px"><span class="wb-check"></span> ${escapeHTML(w)}</div>`).join('')}
                </div>
            </div>`;
        }
        footerArea.innerHTML = html;
        if (preview) _fitCrosswordPage(footerArea, z);
    }
}

/**
 * Keep the whole crossword page on one sheet — the preview counterpart of
 * the PDF's single-page compiler.
 *
 * Clue type, the word bank and the grid all give way together: scaling
 * only the clues used to drive them to 5.5pt while the word bank still
 * hung off the bottom of the page. The Grid Scale slider becomes the
 * requested maximum rather than a hard size.
 */
function _fitCrosswordPage(footerEl, z) {
    const pageEl = footerEl.closest('.page');
    if (!pageEl) return;
    const table = pageEl.querySelector('table.mode-cw');
    const texts = ['.clues-two-col', '.word-bank-styled']
        .map(sel => footerEl.querySelector(sel))
        .filter(Boolean);

    texts.forEach(t => { t.style.fontSize = ''; });
    if (table) table.style.setProperty('--cell-size', z + 'px');

    const minH = parseFloat(getComputedStyle(pageEl).minHeight);
    const fits = () => pageEl.scrollHeight <= minH + 2;
    if (fits()) return;

    const basePx = texts.map(t => parseFloat(getComputedStyle(t).fontSize));
    const MIN_TEXT = 0.6, MIN_GRID = 0.5;
    let tf = 1, gf = 1;
    for (let i = 0; i < 40 && !fits(); i++) {
        if (tf > MIN_TEXT && (i % 2 === 0 || gf <= MIN_GRID)) {
            tf -= 0.04;
            texts.forEach((t, k) => { t.style.fontSize = (basePx[k] * tf).toFixed(2) + 'px'; });
        } else if (gf > MIN_GRID && table) {
            gf -= 0.04;
            table.style.setProperty('--cell-size', (z * gf).toFixed(2) + 'px');
        } else {
            break;
        }
    }
}
