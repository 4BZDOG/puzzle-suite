// =============================================================
// renderers/wordSearch.js — Page 2: Word Search preview
// =============================================================

const escapeHTML = str => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));

const CELL_SIZE_MIN = 15, CELL_SIZE_MAX = 60;

export function calcWSScale(wsData, isPrint = false) {
    const w = isPrint ? 750 : 640, h = 680;
    const sz = Math.max(1, wsData?.size || 1);
    return Math.min(CELL_SIZE_MAX, Math.max(CELL_SIZE_MIN, Math.floor(Math.min(w / sz, h / sz))));
}


/**
 * Stadium ("capsule") outlines tracing each word path, as an SVG overlay.
 *
 * A per-cell tint reads as scattered specks once a word runs diagonally or
 * backwards; one continuous ring reads as a word. Outline only, so the
 * letters underneath stay legible. Mirrors drawCapsule() in the PDF.
 */
export function capsuleOverlay(wordPositions, z, gridPx, { stroke = '#2563eb', width = 1.6 } = {}) {
    if (!wordPositions?.length) return '';
    const STEPS = 10;
    const polys = wordPositions.map(wp => {
        if (!wp.cells?.length) return '';
        const a0 = wp.cells[0], a1 = wp.cells[wp.cells.length - 1];
        const x1 = a0.x * z + z / 2, y1 = a0.y * z + z / 2;
        const x2 = a1.x * z + z / 2, y2 = a1.y * z + z / 2;
        const r = z * 0.45;
        const th = Math.atan2(y2 - y1, x2 - x1);
        const pts = [];
        for (let i = 0; i <= STEPS; i++) {
            const a = th - Math.PI / 2 + (Math.PI * i) / STEPS;
            pts.push(`${(x2 + r * Math.cos(a)).toFixed(2)},${(y2 + r * Math.sin(a)).toFixed(2)}`);
        }
        for (let i = 0; i <= STEPS; i++) {
            const a = th + Math.PI / 2 + (Math.PI * i) / STEPS;
            pts.push(`${(x1 + r * Math.cos(a)).toFixed(2)},${(y1 + r * Math.sin(a)).toFixed(2)}`);
        }
        return `<polygon points="${pts.join(' ')}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round"/>`;
    }).join('');
    return `<svg class="ws-capsules" width="${gridPx}" height="${gridPx}" viewBox="0 0 ${gridPx} ${gridPx}" aria-hidden="true">${polys}</svg>`;
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
        const exWordPos = settings.showExample && wsData.wordPositions?.length ? wsData.wordPositions[0] : null;
        const exCells = new Set(exWordPos?.cells ? exWordPos.cells.map(c => `${c.x},${c.y}`) : []);

        let htmlStr = `<div class="ws-grid-wrap"><div class="grid mode-search ${showGrid ? 'with-internal-grid' : ''}" style="grid-template-columns: repeat(${wsData.size}, ${z}px); grid-template-rows: repeat(${wsData.size}, ${z}px);">`;

        for (let y = 0; y < wsData.size; y++) {
            for (let x = 0; x < wsData.size; x++) {
                const isEx = exCells.has(`${x},${y}`);
                htmlStr += `<div class="cell${isEx ? ' cell-example' : ''}" style="--cell-size: ${z}px;">${wsData.grid[y][x]}</div>`;
            }
        }
        htmlStr += `</div>`;
        if (exWordPos) htmlStr += capsuleOverlay([exWordPos], z, wsData.size * z);
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

        const showLetterCount = settings.showLetterCount !== false;
        const items = wsData.placed.map(wStr => {
            if (showClues) {
                const match = words.find(x => x.word === wStr);
                const clue = match?.clue?.trim();
                if (clue) {
                    const len = showLetterCount ? ` <span class="notes-clue-length">(${wStr.length})</span>` : '';
                    return `${escapeHTML(clue)}${len}`;
                }
            }
            return escapeHTML(wStr);
        });

        const gridPx = wsData.size * z;
        const exWord = settings.showExample && wsData.wordPositions?.length ? wsData.wordPositions[0].word : null;
        // Distribute items top-to-bottom per column using CSS Grid
        const itemsPerCol = Math.ceil(items.length / cols);
        footerArea.innerHTML = `<div style="width:${gridPx}px; margin:8px auto 0;">
            <div class="word-bank-styled" style="display:grid; grid-template-columns: repeat(${cols}, 1fr); grid-template-rows: repeat(${itemsPerCol}, auto); grid-auto-flow: column; column-gap:28px; row-gap:0;">
                ${wsData.placed.map((wStr, i) => {
                    const isEx = exWord === wStr;
                    const display = items[i];
                    return `<div class="wb-item${isEx ? ' wb-item-example' : ''}">${isEx ? '<span class="wb-check-done" style="font-size:13px;line-height:1;color:var(--primary);flex-shrink:0;">&#10003;</span>' : '<span class="wb-check"></span>'}<div${isEx ? ' style="text-decoration:line-through; color:var(--primary); opacity:0.75;"' : ''}>${display}</div>${isEx ? '<span class="example-pill">EXAMPLE</span>' : ''}</div>`;
                }).join('')}
            </div>
        </div>`;
    }
}
