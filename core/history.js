// =============================================================
// core/history.js — Undo / Redo stack for word list edits
// =============================================================
import { state, setWords } from './state.js';

const MAX_HISTORY = 50;
let wordHistory  = [];
let historyIndex = -1;

export function pushHistory() {
    wordHistory = wordHistory.slice(0, historyIndex + 1);
    wordHistory.push(JSON.parse(JSON.stringify(state.words)));
    if (wordHistory.length > MAX_HISTORY) wordHistory.shift();
    else historyIndex++;
    _updateButtons();
}

export function undo(onComplete) {
    if (historyIndex < 0) return;
    setWords(JSON.parse(JSON.stringify(wordHistory[historyIndex])));
    historyIndex--;
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

export function canUndo() { return historyIndex >= 0; }
export function canRedo() { return historyIndex < wordHistory.length - 1; }

function _updateButtons() {
    const u = document.getElementById('btn-undo');
    const r = document.getElementById('btn-redo');
    if (u) u.disabled = !canUndo();
    if (r) r.disabled = !canRedo();
}
