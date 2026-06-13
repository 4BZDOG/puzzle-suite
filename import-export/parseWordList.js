// =============================================================
// import-export/parseWordList.js — Pure word-list text parsing
//
// Extracted from processImport() so the parsing + sanitization rules are
// dependency-free and unit-testable. Enforces the A-Z-only charset
// (XSS defense layer 1) consistent with updateWord() and the JSON importer.
// =============================================================

/**
 * Parse newline-separated "word - clue" text into word objects.
 * Accepts separators: -, :, ,, tab, or whitespace. Bare words (no
 * separator) get a default clue. Words are upper-cased and stripped to
 * A-Z; entries shorter than 2 letters or already present are dropped.
 *
 * @param {string}   text          - raw textarea contents
 * @param {string[]} existingWords - already-present word strings (for dedupe)
 * @returns {{word: string, clue: string}[]} new words to append
 */
export function parseWordList(text, existingWords = []) {
    const seen = new Set(existingWords);
    const added = [];

    String(text ?? '').split('\n').forEach((rawLine) => {
        // Trim the whole line first so leading whitespace doesn't defeat the
        // separator match (which anchors on a non-space first character).
        const line = rawLine.trim();
        if (!line) return;

        // word + separator (-, :, ,, tab, whitespace) + clue
        const match = line.match(/^([^-:,\t\s]+)[-:,\t\s]+(.*)$/);

        let word, clue;
        if (match && match[1]) {
            word = match[1].toUpperCase().replace(/[^A-Z]/g, '');
            clue = match[2].trim() || 'Find the word';
        } else {
            // Bare word on a line, no separator.
            word = line.toUpperCase().replace(/[^A-Z]/g, '');
            clue = 'Find the word';
        }

        if (word && word.length > 1 && !seen.has(word)) {
            added.push({ word, clue });
            seen.add(word);
        }
    });

    return added;
}
