// =============================================================
// renderers/wordList.js — Sidebar word list & status badge
// =============================================================

const escapeHTML = str => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));

/**
 * Render the interactive word-list rows in the sidebar.
 * @param {HTMLElement} container
 * @param {Array}       words        - state.words
 * @param {Object}      puzzleData   - state.puzzleData
 * @param {number}      activePage   - state.activePage (1-5)
 * @param {Function}    onUpdateWord(index, field, value)
 * @param {Function}    onDeleteWord(index)
 */
export function renderWordList(container, words, puzzleData, activePage, onUpdateWord, onDeleteWord) {
    if (!container) return;
    container.innerHTML = '';

    if (words.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-feather-alt"></i><br>No words yet. Add some or import!</div>';
        return;
    }

    let htmlStr = '';
    words.forEach((w, i) => {
        const pWS  = puzzleData.ws?.placed.includes(w.word);
        const pCW  = puzzleData.cw?.placed.some(x => x.word === w.word);
        const pSCR = puzzleData.scr?.some(x => x.original === w.word);

        // Status dot reflects placement in the currently-visible puzzle page
        let statusClass;
        if (activePage === 2) {
            statusClass = pWS ? 'placed' : 'failed';
        } else if (activePage === 3) {
            statusClass = pCW ? 'placed' : 'failed';
        } else if (activePage === 4) {
            statusClass = pSCR ? 'placed' : 'failed';
        } else {
            // Notes (1), Key (5), or unset: green if placed in any puzzle
            statusClass = (pWS || pCW) ? 'placed' : 'failed';
        }

        htmlStr += `<div class="wm-row">
            <div class="wm-status ${statusClass}"></div>
            <div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0; padding-right:2px;">
                <button class="wm-btn" style="height:16px; width:16px; font-size:10px; padding:0" onclick="window._puzzleApp.moveWordUp(${i})" ${i === 0 ? 'disabled' : ''} aria-label="Move Up">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button class="wm-btn" style="height:16px; width:16px; font-size:10px; padding:0" onclick="window._puzzleApp.moveWordDown(${i})" ${i === words.length - 1 ? 'disabled' : ''} aria-label="Move Down">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div style="flex:1">
                <input class="wm-input wm-word" value="${escapeHTML(w.word)}"
                    onchange="window._puzzleApp.updateWord(${i},'word',this.value)"
                    placeholder="WORD" aria-label="Word ${i + 1}">
            </div>
            <div style="flex:2">
                <input class="wm-input wm-clue" value="${escapeHTML(w.clue)}"
                    oninput="window._puzzleApp.updateWord(${i},'clue',this.value)"
                    placeholder="Clue" aria-label="Clue for word ${i + 1}">
            </div>
            <button class="wm-btn" onclick="window._puzzleApp.delWord(${i})"
                aria-label="Delete word ${escapeHTML(w.word) || (i + 1)}">
                <i class="fas fa-times"></i>
            </button>
        </div>`;
    });
    container.innerHTML = htmlStr;
}

/**
 * Update the placed-count badge and status icon.
 * @param {number} activePage - current page (1-5); drives which puzzle's count is shown
 */
export function renderStatus(words, puzzleData, activePage) {
    let placed = 0;
    words.forEach(w => {
        if (activePage === 2) {
            if (puzzleData.ws?.placed.includes(w.word)) placed++;
        } else if (activePage === 3) {
            if (puzzleData.cw?.placed.some(x => x.word === w.word)) placed++;
        } else if (activePage === 4) {
            if (puzzleData.scr?.some(x => x.original === w.word)) placed++;
        } else {
            if (puzzleData.ws?.placed.includes(w.word) ||
                puzzleData.cw?.placed.some(x => x.word === w.word)) placed++;
        }
    });

    const pc = document.getElementById('placed-count');
    if (pc) pc.innerText = `${placed}/${words.length}`;

    const icon = document.getElementById('status-icon');
    if (icon) {
        if (placed === words.length && words.length > 0) {
            icon.className = 'status-icon icon-success';
            icon.innerHTML = '<i class="fas fa-check"></i>';
        } else {
            icon.className = 'status-icon icon-warning';
            icon.innerHTML = '<i class="fas fa-exclamation"></i>';
        }
    }
}

export function renderStatusGenerating() {
    const icon = document.getElementById('status-icon');
    if (icon) {
        icon.className = 'status-icon icon-generating';
        icon.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    }
}
