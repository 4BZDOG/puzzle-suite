// =============================================================
// renderers/scramble.js — Page 4: Word Scramble preview
// =============================================================

const escapeHTML = str => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));

/**
 * @param {HTMLElement} container
 * @param {Array}       scrData    - puzzleData.scr
 * @param {Object}      settings   - state.settings
 */
export function renderScramble(container, scrData, settings) {
    if (!container) return;

    if (!scrData || !scrData.length) {
        container.innerHTML = '<div style="color:var(--text-muted)">No Data</div>';
        return;
    }

    const items = scrData;
    const showHint = settings.scrShowHint;
    const showExample = settings.showExample;
    // Same rule as the PDF: as few columns as will fit, so answer lines stay
    // long, then spread the rows down the page instead of leaving a gap.
    const cols = items.length > 14 ? 2 : 1;
    const rows = Math.ceil(items.length / cols);
    let htmlStr = `<div class="scramble-container" style="--scr-cols:${cols}; --scr-rows:${rows}">`;

    items.forEach((item, i) => {
        const isExample = showExample && i === 0;
        htmlStr += `<div class="scramble-item${isExample ? ' scramble-example' : ''}">
            <span class="scramble-num">${i + 1}.</span>
            <div class="scramble-text">${escapeHTML(item.scrambled)}</div>
            ${isExample
                ? `<div class="scramble-answer-filled">${escapeHTML(item.original)}</div><span class="example-pill">EXAMPLE</span>`
                : `<div class="scramble-line"></div>${showHint ? `<div class="scramble-hint">(${escapeHTML(item.original[0])}...)</div>` : ''}`}
        </div>`;
    });

    htmlStr += '</div>';
    container.innerHTML = htmlStr;

    // Cap how tall a row may grow, then centre the leftover — a six-word
    // scramble should not stretch to six 100px bands.
    const el = container.querySelector('.scramble-container');
    const avail = container.clientHeight;
    if (el && avail > 0) {
        const MAX_ROW_PX = 86;
        const rowPx = Math.min(avail / rows, MAX_ROW_PX);
        if (rowPx < avail / rows) {
            el.style.gridTemplateRows = `repeat(${rows}, ${rowPx}px)`;
            el.style.alignContent = 'center';
        }
    }
}
