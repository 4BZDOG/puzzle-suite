// =============================================================
// core/historyStack.js — Pure undo/redo stack state machine
//
// Extracted from core/history.js so the (subtle) stack logic is
// dependency-free and unit-testable — no `state`, no `document`.
//
// Convention: pushHistory() is called BEFORE a mutation, snapshotting the
// pre-mutation state. `mutatedSinceSnap` tracks whether the live state has
// diverged from the top-of-stack snapshot, so undo can recover the current
// (post-mutation) state for redo before stepping back. This is what makes
// redo work correctly when undoing from a freshly-mutated position.
//
// The factory is parameterized only by `max` (cap on retained entries) and
// a `clone` function (defaults to structured deep-copy via JSON).
// =============================================================

const jsonClone = (x) => JSON.parse(JSON.stringify(x));

export function createHistoryStack({ max = 50, clone = jsonClone } = {}) {
    let entries = [];
    let index = -1;
    let mutatedSinceSnap = false;

    /**
     * Snapshot `current` before a mutation. Truncates any redo tail. Only
     * records a new entry if the state diverged since the last snapshot (or
     * the stack is empty), preventing duplicate entries.
     */
    function push(current) {
        entries = entries.slice(0, index + 1);
        if (mutatedSinceSnap || entries.length === 0) {
            entries.push(clone(current));
        }
        index = entries.length - 1;
        if (entries.length > max) { entries.shift(); index = entries.length - 1; }
        mutatedSinceSnap = true;
    }

    /**
     * Step back one entry. If the live state was mutated since the last
     * snapshot, first save it (so it's reachable via redo). Returns the
     * state to restore, or null if there's nothing earlier to undo to.
     */
    function undo(current) {
        if (mutatedSinceSnap && index >= 0) {
            entries = entries.slice(0, index + 1);
            entries.push(clone(current));
            index = entries.length - 1;
            mutatedSinceSnap = false;
        }
        if (index <= 0) return null;
        index--;
        return clone(entries[index]);
    }

    /**
     * Step forward one entry. Returns the state to restore, or null if
     * already at the newest entry.
     */
    function redo() {
        if (index >= entries.length - 1) return null;
        index++;
        return clone(entries[index]);
    }

    function canUndo() { return index > 0 || (index >= 0 && mutatedSinceSnap); }
    function canRedo() { return index < entries.length - 1 && !mutatedSinceSnap; }

    // Test/debug introspection — not used by the app.
    function _state() { return { length: entries.length, index, mutatedSinceSnap }; }

    return { push, undo, redo, canUndo, canRedo, _state };
}
