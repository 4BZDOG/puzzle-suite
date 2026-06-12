// =============================================================
// core/history.js — Undo / Redo stack for word list edits
// =============================================================
import { state, setWords } from './state.js';

const MAX_HISTORY = 50;
let wordHistory  = [];
let historyIndex = -1;
let _mutatedSinceSnap = false;

export function pushHistory() {
    wordHistory = wordHistory.slice(0, historyIndex + 1);
    if (_mutatedSinceSnap || wordHistory.length === 0) {
        wordHistory.push(JSON.parse(JSON.stringify(state.words)));
    }
    historyIndex = wordHistory.length - 1;
    if (wordHistory.length > MAX_HISTORY) { wordHistory.shift(); historyIndex = wordHistory.length - 1; }
    _mutatedSinceSnap = true;
    _updateButtons();
}

export function undo(onComplete) {
    if (_mutatedSinceSnap && historyIndex >= 0) {
        wordHistory = wordHistory.slice(0, historyIndex + 1);
        wordHistory.push(JSON.parse(JSON.stringify(state.words)));
        historyIndex = wordHistory.length - 1;
        _mutatedSinceSnap = false;
    }
    if (historyIndex <= 0) return;
    historyIndex--;
    setWords(JSON.parse(JSON.stringify(wordHistory[historyIndex])));
    _updateButtons();
    if (onComplete) onComplete();
}

export function redo(onComplete) {
    if (historyIndex >= wordHistory.length - 1) return;
    historyIndex++;
    setWords(JSON.parse(JSON.stringify(wordHistory[historyIndex])));
    _updateButtons();
    if (onComplete) onComplete();
}

export function canUndo() { return historyIndex > 0 || (historyIndex >= 0 && _mutatedSinceSnap); }
export function canRedo() { return historyIndex < wordHistory.length - 1 && !_mutatedSinceSnap; }

function _updateButtons() {
    const u = document.getElementById('btn-undo');
    const r = document.getElementById('btn-redo');
    if (u) u.disabled = !canUndo();
    if (r) r.disabled = !canRedo();
}
