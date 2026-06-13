// =============================================================
// test/letters.test.mjs — getLetter() bijective base-26 labels
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getLetter } from '../core/letters.js';

test('single letters A–Z map to indices 0–25', () => {
    assert.equal(getLetter(0), 'A');
    assert.equal(getLetter(1), 'B');
    assert.equal(getLetter(25), 'Z');
});

test('rolls over to two letters after Z', () => {
    assert.equal(getLetter(26), 'AA');
    assert.equal(getLetter(27), 'AB');
    assert.equal(getLetter(51), 'AZ');
    assert.equal(getLetter(52), 'BA');
});

test('rolls over to three letters after ZZ', () => {
    // ZZ is index 26*26 + 26 - 1 = 701
    assert.equal(getLetter(701), 'ZZ');
    assert.equal(getLetter(702), 'AAA');
});

test('labels are unique and ordered across a large range', () => {
    const seen = new Set();
    let prev = '';
    for (let i = 0; i < 1000; i++) {
        const label = getLetter(i);
        assert.match(label, /^[A-Z]+$/, `label ${i} should be A–Z only`);
        assert.ok(!seen.has(label), `label ${label} (index ${i}) must be unique`);
        seen.add(label);
        // Within the same length, labels sort ascending.
        if (label.length === prev.length) {
            assert.ok(label > prev, `${label} should sort after ${prev}`);
        }
        prev = label;
    }
});
