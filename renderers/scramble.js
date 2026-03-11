// =============================================================
// renderers/scramble.js — Page 4: Word Scramble preview
// =============================================================

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
    let htmlStr = '<div class="scramble-container">';

    items.forEach(item => {
        htmlStr += `<div class="scramble-item">
            <div class="scramble-text">${item.scrambled}</div>
            <div class="scramble-line"></div>
            ${showHint ? `<div class="scramble-hint">(${item.original[0]}...)</div>` : ''}
        </div>`;
    });

    htmlStr += '</div>';
    container.innerHTML = htmlStr;
}
