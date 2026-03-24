// =============================================================
// renderers/notes.js — Page 1: Notes/vocabulary page preview
// =============================================================
import { escapeHTML } from '../core/utils.js';

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
    const hasMatchingData = settings.notesConfig.shuffle &&
        puzzleData.notes?.length > 0 && 'matchLetter' in puzzleData.notes[0];
    const targetData = hasMatchingData
        ? puzzleData.notes
        : words.map(w => ({ term: w.word, clue: w.clue }));

    if (targetData.length === 0) {
        container.innerHTML = '<div style="text-align:center; color:var(--text-muted); padding:40px;">No words added yet.</div>';
        return;
    }

    // Auto-widen term column so no term wraps to a second line.
    // Measure terms with a temp canvas using the current resolved font.
    if (container.offsetWidth > 0) {
        const cs = getComputedStyle(document.documentElement);
        const fsBase = parseFloat(cs.getPropertyValue('--notes-font-size') || '14');
        const gScale = parseFloat(cs.getPropertyValue('--global-font-scale') || '1');
        const pScale = parseFloat(cs.getPropertyValue('--page-scale') || '1');
        const fontFamily = (cs.getPropertyValue('--user-font') || 'sans-serif').trim();
        const fontSize = fsBase * gScale * pScale;
        const canvas = document.createElement('canvas');
        const ctx2d = canvas.getContext('2d');
        ctx2d.font = `bold ${fontSize}px ${fontFamily}`;
        const maxTermPx = Math.max(...targetData.map(w => ctx2d.measureText(w.term).width));
        // +20px for padding-right; cap at 70% to preserve definition column space
        const minPct = Math.min(70, Math.ceil(((maxTermPx + 20) / container.offsetWidth) * 100));
        if (minPct > settings.notesConfig.termWidth) {
            document.documentElement.style.setProperty('--notes-term-width', minPct + '%');
        }
    }

    const isMatching = hasMatchingData;
    let cls = 'notes-table';
    if (!settings.notesConfig.showTerm) cls += ' hide-term';
    if (!settings.notesConfig.showDef) cls += ' hide-def';

    let htmlStr = `<div class="${cls}">
        <div class="notes-header">
            <span class="notes-num" style="${isMatching ? 'width:60px' : ''}">#</span>
            <span class="notes-word-header">TERM</span>
            <span class="notes-clue-header">DEFINITION</span>
        </div>`;

    const showExample = settings.showExample;

    targetData.forEach((w, i) => {
        const isExample = showExample && i === 0;
        htmlStr += `<div class="notes-row${isExample ? ' notes-row-example' : ''}">`;
        if (isMatching) {
            const numStr = isExample ? `${i + 1}. <b style="color:var(--primary)">${w.correctLetter}</b>` : `${i + 1}. ____`;
            htmlStr += `<span class="notes-num" style="width:60px">${numStr}</span>`;
        } else {
            htmlStr += `<span class="notes-num">${i + 1}.</span>`;
        }
        htmlStr += `<div class="notes-word"><div class="notes-editable" ${!isMatching ? 'contenteditable="true"' : ''} ${!isMatching ? `onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="window._puzzleApp.updateWord(${i}, 'word', this.innerText)"` : ''}>${escapeHTML(w.term)}</div></div>`;
        htmlStr += '<div class="notes-clue">';

        if (isMatching) {
            htmlStr += `<div class="notes-editable">${w.matchLetter}. ${escapeHTML(w.clue)}</div>`;
            htmlStr += `<span class="notes-clue-length">(${w.clueTermLength ?? w.term.length})</span>`;
        } else {
            htmlStr += `<div class="notes-editable" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="window._puzzleApp.updateWord(${i}, 'clue', this.innerText)">${escapeHTML(w.clue)}</div>`;
            htmlStr += `<span class="notes-clue-length">(${w.term.length})</span>`;
            if (isExample) htmlStr += `<span class="scramble-example-label" style="margin-left:6px;">★ example: <b>${escapeHTML(w.term)}</b></span>`;
        }

        htmlStr += '</div></div>';
    });

    htmlStr += '</div>';
    container.innerHTML = htmlStr;
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
