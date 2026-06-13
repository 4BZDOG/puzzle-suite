// =============================================================
// core/letters.js — Spreadsheet-style letter labels
//
// Pure, dependency-free so it is unit-testable under Node and reusable
// across the browser app. getLetter(0) → 'A', getLetter(25) → 'Z',
// getLetter(26) → 'AA', etc. (bijective base-26, like spreadsheet columns).
// =============================================================

export const getLetter = (i) => {
    let res = '', num = i;
    while (num >= 0) { res = String.fromCharCode(65 + (num % 26)) + res; num = Math.floor(num / 26) - 1; }
    return res;
};
