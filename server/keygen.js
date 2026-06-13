/**
 * keygen.js — License key generation & format validation
 *
 * Pure (depends only on Node's crypto), so it carries no SQLite/filesystem
 * side effects and is unit-testable without standing up the database.
 *
 * Key format: PSP-XXXXX-XXXXX-XXXXX-XXXXX
 * 32-character unambiguous alphabet (no 0, O, I, 1) to avoid transcription
 * errors when a customer types a key by hand.
 */

const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const GROUP_LEN = 5;
const GROUPS = 4;

// Anchored pattern matching exactly what generateKey() produces.
const KEY_PATTERN = new RegExp(
  `^PSP(?:-[${ALPHABET}]{${GROUP_LEN}}){${GROUPS}}$`,
);

/**
 * Generate a cryptographically-random license key.
 * @returns {string} e.g. "PSP-AB3CD-EF4GH-JK5MN-PQ6RS"
 */
function generateKey() {
  let key = 'PSP';
  for (let g = 0; g < GROUPS; g++) {
    key += '-';
    for (let c = 0; c < GROUP_LEN; c++) {
      key += ALPHABET[crypto.randomInt(0, ALPHABET.length)];
    }
  }
  return key;
}

/**
 * Check whether a string matches the canonical key format.
 * Case-sensitive: callers should upper-case input first (keys are uppercase).
 * @param {string} key
 * @returns {boolean}
 */
function isValidKeyFormat(key) {
  return typeof key === 'string' && KEY_PATTERN.test(key);
}

module.exports = { generateKey, isValidKeyFormat, KEY_PATTERN, ALPHABET };
