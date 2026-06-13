// =============================================================
// core/history.js — Undo / Redo for word list edits
//
// Thin wiring over the pure stack in core/historyStack.js: connects the
// stack to `state.words` (source), `setWords` (sink), and the toolbar
// button enabled-state. All stack logic and its tests live in historyStack.js.
// =============================================================
import { state, setWords } from './state.js';
import { createHistoryStack } from './historyStack.js';

const MAX_HISTORY = 50;
const stack = createHistoryStack({ max: MAX_HISTORY });

export function pushHistory() {
    stack.push(state.words);
    _updateButtons();
}

export function undo(onComplete) {
    const restored = stack.undo(state.words);
    if (restored === null) return;
    setWords(restored);
    _updateButtons();
    if (onComplete) onComplete();
}

export function redo(onComplete) {
    const restored = stack.redo();
    if (restored === null) return;
    setWords(restored);
    _updateButtons();
    if (onComplete) onComplete();
}

export function canUndo() { return stack.canUndo(); }
export function canRedo() { return stack.canRedo(); }

function _updateButtons() {
    const u = document.getElementById('btn-undo');
    const r = document.getElementById('btn-redo');
    if (u) u.disabled = !canUndo();
    if (r) r.disabled = !canRedo();
}
