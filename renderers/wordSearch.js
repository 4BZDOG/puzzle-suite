// =============================================================
// renderers/wordSearch.js — Page 2: Word Search preview
// =============================================================

const CELL_SIZE_MIN = 15, CELL_SIZE_MAX = 60;

export function calcWSScale(wsData, isPrint = false) {
    const w = isPrint ? 750 : 640, h = 680;
    const sz = Math.max(1, wsData?.size || 1);
    return Math.min(CELL_SIZE_MAX, Math.max(CELL_SIZE_MIN, Math.floor(Math.min(w / sz, h / sz))));
}

/**
 * Render the word-search grid and word bank.
 * @param {HTMLElement} gridArea    - .p2-area container
 * @param {HTMLElement} footerArea  - .p2-footer container
 * @param {Object}      wsData      - puzzleData.ws
 * @param {Array}       words       - state.words (for clue lookups)
 * @param {Object}      settings    - state.settings
 * @param {boolean}     preview     - true = use sidebar scale slider
 */
export function renderWordSearch(gridArea, footerArea, wsData, words, settings, preview = true) {
    const z = preview
        ? (() => { const el = document.getElementById('scaleSearch'); return el ? parseInt(el.value, 10) : calcWSScale(wsData); })()
        : calcWSScale(wsData);

    if (gridArea) {
        gridArea.innerHTML = '';
        if (!wsData) { gridArea.innerHTML = '<div style="color:var(--text-muted)">No Data</div>'; return; }

        const showGrid = settings.wsInternalGrid;

        let htmlStr = `<div class="grid mode-search ${showGrid ? 'with-internal-grid' : ''}" style="grid-template-columns: repeat(${wsData.size}, ${z}px); grid-template-rows: repeat(${wsData.size}, ${z}px);">`;

        for (let y = 0; y < wsData.size; y++) {
            for (let x = 0; x < wsData.size; x++) {
                htmlStr += `<div class="cell" style="--cell-size: ${z}px;">${wsData.grid[y][x]}</div>`;
            }
        }
        htmlStr += `</div>`;
        gridArea.innerHTML = htmlStr;
    }

    if (footerArea && wsData) {
        const showClues = settings.wsUseClues;
        const maxLen = wsData.placed.reduce((m, w) => Math.max(m, w.length), 0);
        let cols = 3;
        if (showClues) cols = 2;
        else if (maxLen > 12) cols = 2;
        else if (maxLen <= 8) cols = 4;

        const items = wsData.placed.map(wStr => {
            if (showClues) {
                const match = words.find(x => x.word === wStr);
                return match
                    ? `${match.clue} <span class="notes-clue-length">(${wStr.length})</span>`
                    : wStr;
            }
            return wStr;
        });

        const gridPx = wsData.size * z;
        footerArea.innerHTML = `<div style="width:${gridPx}px; margin:0 auto;">
            <div class="word-bank-styled" style="column-count:${cols}; display:block; column-gap:20px;">
                ${items.map(w => `<div class="wb-item" style="margin-bottom:6px; break-inside:avoid;"><span class="wb-check"></span> <div>${w}</div></div>`).join('')}
            </div>
        </div>`;
    }
}
