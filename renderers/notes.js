// =============================================================
// renderers/notes.js — Page 1: Notes/vocabulary page preview
// =============================================================

import { isMatchingNotes, exampleDefIndex, stripLetterCount } from '../core/notesModel.js';

const escapeHTML = str => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));

/**
 * @param {HTMLElement} container
 * @param {Object}      puzzleData  - state.puzzleData (notes may be null before gen)
 * @param {Array}       words       - state.words
 * @param {Object}      settings    - state.settings
 * @param {Function}    onUpdateWord(index, field, value)
 */
export function renderNotes(container, puzzleData, words, settings, onUpdateWord) {
    if (!container) return;
    _updateNotesStyles(settings);

    // Use puzzleData.notes only in matching mode — it carries shuffle/matchLetter data.
    // In standard mode always derive from live words so inline clue edits are reflected
    // immediately without waiting for a full re-generate.
    const hasMatchingData = !!settings.notesConfig.shuffle && isMatchingNotes(puzzleData.notes);
    const targetData = hasMatchingData
        ? puzzleData.notes
        : words.map(w => ({ term: w.word, clue: w.clue }));

    if (targetData.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:40px;">No words added yet.</div>';
        return;
    }

    const isMatching = hasMatchingData;
    let cls = 'notes-table';
    if (!settings.notesConfig.showTerm) cls += ' hide-term';
    if (!settings.notesConfig.showDef) cls += ' hide-def';

    let htmlStr = `<div class="${cls}">
        <div class="notes-header">
            <span class="notes-num">#</span>
            ${isMatching ? '<span class="notes-box"></span>' : ''}
            <span class="notes-word-header">TERM</span>
            <span class="notes-clue-header">${isMatching ? 'DEFINITIONS (IN A DIFFERENT ORDER)' : 'DEFINITION'}</span>
        </div>`;

    const showExample = settings.showExample;
    // A letter count next to a shuffled definition leaks the answer, so it
    // is a crossword-only hint. Mirrors drawNotes() in the PDF.
    const showLetterCount = !isMatching && settings.showLetterCount !== false;
    const lenHint = (n) => showLetterCount ? `<span class="notes-clue-length">(${n})</span>` : '';

    // Term side of the example is row 1; the definition side follows the
    // shuffle to whichever row actually describes term 1.
    const exTermIdx = showExample ? 0 : -1;
    const exDefIdx  = showExample ? exampleDefIndex(targetData) : -1;

    targetData.forEach((w, i) => {
        const isExTerm = i === exTermIdx;
        const isExDef  = i === exDefIdx;
        const isExample = isExTerm || isExDef;
        htmlStr += `<div class="notes-row${isExample ? ' notes-row-example' : ''}${isExTerm ? ' ex-term' : ''}${isExDef ? ' ex-def' : ''}">`;
        htmlStr += `<span class="notes-num">${i + 1}.</span>`;
        if (isMatching) {
            const boxContent = isExTerm
                ? `<span class="match-answer-box match-answer-filled">${escapeHTML(w.correctLetter)}</span>`
                : `<span class="match-answer-box"></span>`;
            htmlStr += `<span class="notes-box">${boxContent}</span>`;
        }
        htmlStr += `<div class="notes-word"><div class="notes-editable" ${!isMatching ? 'contenteditable="true"' : ''} ${!isMatching ? `onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="window._puzzleApp.updateWord(${i}, 'word', this.innerText)"` : ''}>${escapeHTML(w.term)}</div></div>`;
        htmlStr += '<div class="notes-clue">';

        if (isMatching) {
            htmlStr += `<div class="notes-editable">${escapeHTML(w.matchLetter)}. ${escapeHTML(stripLetterCount(w.clue))}</div>`;
            if (isExDef) htmlStr += '<span class="example-pill">EXAMPLE</span>';
        } else {
            htmlStr += `<div class="notes-editable" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="window._puzzleApp.updateWord(${i}, 'clue', this.innerText)">${escapeHTML(w.clue)}</div>`;
            htmlStr += lenHint(w.term.length);
            // The term is already on this row, so the example marker is the
            // pill alone — unless the term column is hidden (a real task).
            if (isExDef) {
                if (!settings.notesConfig.showTerm) {
                    htmlStr += ` <b style="color:#2563eb">${escapeHTML(w.term)}</b>`;
                }
                htmlStr += '<span class="example-pill">EXAMPLE</span>';
            }
        }

        htmlStr += '</div></div>';
    });

    htmlStr += '</div>';
    container.innerHTML = htmlStr;
    _widenTermColumn(container, targetData);
}

/**
 * Widen the term column until no term wraps to a second line.
 *
 * Measured against the *rendered* font (read back off a real cell) rather
 * than a reconstruction of it from CSS variables — the reconstruction was
 * a few pixels optimistic, which is how "SUBSTITUTION" ended up broken
 * across two lines.
 */
function _widenTermColumn(container, targetData) {
    if (!container.offsetWidth || !targetData.length) return;
    const sample = container.querySelector('.notes-word .notes-editable');
    const cell = sample && sample.parentElement;
    if (!cell || !cell.clientWidth) return;

    const cs = getComputedStyle(sample);
    const canvas = document.createElement('canvas');
    const ctx2d = canvas.getContext('2d');
    if (!ctx2d) return;
    ctx2d.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const needed = Math.max(...targetData.map(w => ctx2d.measureText(w.term).width));

    // Compare against the text box itself — the cell and the editable inside
    // it both carry padding, and measuring the wrong one leaves a long term
    // a few pixels short of fitting.
    const innerPad = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
    const availNow = () => sample.clientWidth - innerPad;
    if (!(availNow() > 0) || needed <= availNow() - 1) return;

    // The column percentage does not map linearly to pixels (the # column and
    // cell padding sit outside it), so widen by the measured shortfall and
    // re-check, capped at 70% to keep the definition column usable.
    const root = document.documentElement;
    let pct = parseFloat(getComputedStyle(root).getPropertyValue('--notes-term-width')) || 27;
    for (let i = 0; i < 6 && pct < 70; i++) {
        const deficit = needed - (availNow() - 1);
        if (deficit <= 0) return;
        pct = Math.min(70, pct + Math.max(1, Math.ceil((deficit + 6) / container.offsetWidth * 100)));
        root.style.setProperty('--notes-term-width', pct + '%');
    }
}

/**
 * Apply CSS variables and classes that control notes column visibility.
 */
export function updateNotesStyles(settings) {
    _updateNotesStyles(settings);
}

function _updateNotesStyles(settings) {
    const cfg = settings.notesConfig;
    const tw = cfg.termWidth;
    const wVal = document.getElementById('notesWidthVal');
    if (wVal) wVal.innerText = tw + '%';
    document.documentElement.style.setProperty('--notes-term-width', tw + '%');

    const table = document.querySelector('.notes-table');
    if (table) {
        table.classList.toggle('hide-term', !cfg.showTerm);
        table.classList.toggle('hide-def', !cfg.showDef);
    }
}
