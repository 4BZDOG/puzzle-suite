// =============================================================
// test/parseWordList.test.mjs — import parsing + A-Z sanitization
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWordList } from '../import-export/parseWordList.js';

test('parses "word - clue" pairs', () => {
    const out = parseWordList('APPLE - a fruit\nDOG - an animal');
    assert.deepEqual(out, [
        { word: 'APPLE', clue: 'a fruit' },
        { word: 'DOG', clue: 'an animal' },
    ]);
});

test('accepts :, comma, and tab separators', () => {
    const out = parseWordList('CAT: feline\nFOX, sly\nOWL\tbird');
    assert.deepEqual(out.map(w => w.word), ['CAT', 'FOX', 'OWL']);
    assert.deepEqual(out.map(w => w.clue), ['feline', 'sly', 'bird']);
});

test('bare words get the default clue', () => {
    const out = parseWordList('TIGER\nBEAR');
    assert.deepEqual(out, [
        { word: 'TIGER', clue: 'Find the word' },
        { word: 'BEAR', clue: 'Find the word' },
    ]);
});

test('upper-cases and strips non-A-Z from the word (XSS layer 1)', () => {
    const out = parseWordList(`ap<ple>3 - a fruit`);
    assert.equal(out.length, 1);
    assert.equal(out[0].word, 'APPLE', 'angle brackets and digits stripped');
});

test('drops words shorter than two letters', () => {
    const out = parseWordList('A - article\nOK - fine\nB');
    assert.deepEqual(out.map(w => w.word), ['OK']);
});

test('dedupes against existing words and within the input', () => {
    const out = parseWordList('APPLE - first\nAPPLE - dup\nPEAR - new', ['PEAR']);
    assert.deepEqual(out, [{ word: 'APPLE', clue: 'first' }]);
});

test('ignores blank lines and trims whitespace', () => {
    const out = parseWordList('\n\n  DOG  -  loyal  \n   \n');
    assert.deepEqual(out, [{ word: 'DOG', clue: 'loyal' }]);
});

test('handles empty / nullish input without throwing', () => {
    assert.deepEqual(parseWordList(''), []);
    assert.deepEqual(parseWordList(null), []);
    assert.deepEqual(parseWordList(undefined), []);
});
