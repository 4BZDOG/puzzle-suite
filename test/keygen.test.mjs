// =============================================================
// test/keygen.test.mjs — license key generation & format validation
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { generateKey, isValidKeyFormat, ALPHABET } = require('../server/keygen.js');

const FORMAT = /^PSP(?:-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5}){4}$/;

test('generates keys in the canonical PSP-XXXXX-XXXXX-XXXXX-XXXXX format', () => {
    for (let i = 0; i < 200; i++) {
        const key = generateKey();
        assert.match(key, FORMAT, `generated key "${key}" should match the format`);
    }
});

test('only uses the unambiguous alphabet (no 0, O, I, 1)', () => {
    const body = generateKey().replace(/-/g, '').slice(3); // drop "PSP" + dashes
    for (const ch of body) {
        assert.ok(ALPHABET.includes(ch), `char "${ch}" must be in the alphabet`);
    }
    assert.ok(!/[01OI]/.test(generateKey()), 'must not contain 0, 1, O, or I');
});

test('generated keys are accepted by isValidKeyFormat', () => {
    for (let i = 0; i < 50; i++) {
        assert.equal(isValidKeyFormat(generateKey()), true);
    }
});

test('keys are effectively unique across many generations', () => {
    const seen = new Set();
    for (let i = 0; i < 5000; i++) seen.add(generateKey());
    assert.equal(seen.size, 5000, 'no collisions expected across 5000 keys');
});

test('isValidKeyFormat rejects malformed input', () => {
    const bad = [
        '',
        'PSP',
        'PSP-ABCDE-ABCDE-ABCDE',                 // only 3 groups
        'PSP-ABCDE-ABCDE-ABCDE-ABCDE-ABCDE',     // 5 groups
        'PSP-ABCD-ABCDE-ABCDE-ABCDE',            // short group
        'XXX-ABCDE-ABCDE-ABCDE-ABCDE',           // wrong prefix
        'PSP-ABCDE-ABCDE-ABCDE-ABCD0',           // contains 0
        'PSP-ABCDE-ABCDE-ABCDE-ABCDI',           // contains I
        'psp-abcde-abcde-abcde-abcde',           // lowercase
        'PSP-ABCDE-ABCDE-ABCDE-ABCDE ',          // trailing space
        null,
        undefined,
        12345,
    ];
    for (const v of bad) {
        assert.equal(isValidKeyFormat(v), false, `"${String(v)}" should be invalid`);
    }
});

test('isValidKeyFormat accepts a known-good key', () => {
    assert.equal(isValidKeyFormat('PSP-AB3CD-EF4GH-JK5MN-PQ6RS'), true);
});
