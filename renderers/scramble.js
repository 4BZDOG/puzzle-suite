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
    let htmlStr = '<div class="scramble-container">';

    items.forEach((item, i) => {
        const isExample = showExample && i === 0;
        htmlStr += `<div class="scramble-item${isExample ? ' scramble-example' : ''}">
            <span class="scramble-num">${i + 1}.</span>
            <div class="scramble-text">${escapeHTML(item.scrambled)}</div>
            ${isExample
                ? `<div class="scramble-answer-filled">${escapeHTML(item.original)}</div><div class="scramble-example-label">★ example</div>`
                : `<div class="scramble-line"></div>${showHint ? `<div class="scramble-hint">(${escapeHTML(item.original[0])}...)</div>` : ''}`}
        </div>`;
    });

    htmlStr += '</div>';
    container.innerHTML = htmlStr;
}
