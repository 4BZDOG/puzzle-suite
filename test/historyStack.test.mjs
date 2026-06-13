// =============================================================
// test/historyStack.test.mjs — pure undo/redo stack state machine
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHistoryStack } from '../core/historyStack.js';

// Mirror the real wiring (core/history.js): pushHistory() snapshots the
// PRE-mutation state, then the app mutates; undo/redo only replace the live
// state when the stack returns a non-null snapshot.
function harness(opts) {
    const s = createHistoryStack(opts);
    let live = null;
    return {
        set: (v) => { live = v; },                 // initial state, no history
        edit: (v) => { s.push(live); live = v; },  // pushHistory() then mutate
        undo: () => { const r = s.undo(live); if (r !== null) live = r; return r; },
        redo: () => { const r = s.redo(); if (r !== null) live = r; return r; },
        get: () => live,
        canUndo: () => s.canUndo(),
        canRedo: () => s.canRedo(),
        introspect: () => s._state(),
    };
}

test('undo walks back through prior states', () => {
    const h = harness();
    h.set('A');
    h.edit('B');
    h.edit('C');
    assert.equal(h.get(), 'C');

    h.undo();
    assert.equal(h.get(), 'B');
    h.undo();
    assert.equal(h.get(), 'A');
});

test('cannot undo past the initial state', () => {
    const h = harness();
    h.set('A');
    h.edit('B');
    h.undo();                       // -> A
    assert.equal(h.get(), 'A');
    assert.equal(h.undo(), null);   // nothing earlier
    assert.equal(h.get(), 'A');
});

test('redo recovers the post-mutation state (the original redo bug)', () => {
    const h = harness();
    h.set('A');
    h.edit('B');
    h.edit('C');     // live = C, most recent edit

    h.undo();        // -> B
    assert.equal(h.get(), 'B');
    h.redo();        // -> C must be reachable again
    assert.equal(h.get(), 'C');
});

test('full round trip: undo to start, redo to end', () => {
    const h = harness();
    h.set('A');
    h.edit('B');
    h.edit('C');

    h.undo(); h.undo();             // C -> B -> A
    assert.equal(h.get(), 'A');
    h.redo(); h.redo();             // A -> B -> C
    assert.equal(h.get(), 'C');
    assert.equal(h.redo(), null);   // can't go past newest
    assert.equal(h.get(), 'C');
});

test('a new edit after undo truncates the redo tail (branching)', () => {
    const h = harness();
    h.set('A');
    h.edit('B');
    h.edit('C');
    h.undo();          // -> B, with C reachable via redo
    assert.equal(h.canRedo(), true);

    h.edit('D');       // branch off B
    assert.equal(h.get(), 'D');
    assert.equal(h.canRedo(), false, 'C is no longer reachable');
    assert.equal(h.redo(), null);

    h.undo();          // -> B
    assert.equal(h.get(), 'B');
    h.redo();          // -> D (not C)
    assert.equal(h.get(), 'D');
});

test('pushing right after undo does not duplicate the snapshot', () => {
    const h = harness();
    h.set('A');
    h.edit('B');
    h.edit('C');
    h.undo();                       // -> B, mutatedSinceSnap = false
    const before = h.introspect().length;

    h.edit('B2');                   // push(B): dedup guard skips re-snapshotting B
    // length should not grow from the no-op snapshot; the redo tail (C) is
    // truncated, so it stays the same, not larger.
    assert.ok(h.introspect().length <= before, 'no duplicate entry added');

    h.undo();
    assert.equal(h.get(), 'B');     // undo from B2 still lands on B
});

test('canUndo / canRedo reflect position', () => {
    const h = harness();
    h.set('A');
    assert.equal(h.canUndo(), false);
    assert.equal(h.canRedo(), false);

    h.edit('B');                    // live=B, snapshot A on stack, mutated
    assert.equal(h.canUndo(), true);
    assert.equal(h.canRedo(), false);

    h.undo();                       // -> A, B saved for redo
    assert.equal(h.canRedo(), true);
});

test('respects the max cap, dropping oldest entries', () => {
    const s = createHistoryStack({ max: 3 });
    for (let i = 0; i < 10; i++) s.push(i);
    assert.equal(s._state().length, 3, 'never retains more than max entries');
});

test('uses the provided clone so callers cannot mutate stored snapshots', () => {
    const h = harness();
    const obj = [{ word: 'APPLE' }];
    h.set(obj);
    h.edit([{ word: 'BANANA' }]);

    const restored = h.undo();      // deep clone of the snapshot of `obj`
    assert.notEqual(restored, obj, 'must be a clone, not the same reference');
    assert.deepEqual(restored, [{ word: 'APPLE' }]);
});
