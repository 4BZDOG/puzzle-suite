// =============================================================
// core/pageMeta.js — one identity per activity page
// =============================================================
// Dependency-free, and the ONLY place a chip label, accent colour or icon
// name is written down. The preview and the PDF used to keep their own
// copies, which drifted: page one said "MATCHING" on screen and
// "VOCABULARY" in print for the same worksheet.

/** rgb triple -> #rrggbb, so one constant serves jsPDF and CSS alike. */
export const toHex = ([r, g, b]) =>
    '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');

export const PAGE_META = {
    notes: { label: 'VOCABULARY',    accent: [99, 102, 241],  icon: 'notes' },
    ws:    { label: 'WORD SEARCH',   accent: [13, 148, 136],  icon: 'search' },
    cw:    { label: 'CROSSWORD',     accent: [124, 58, 237],  icon: 'crossword' },
    scr:   { label: 'WORD SCRAMBLE', accent: [217, 119, 6],   icon: 'scramble' },
    key:   { label: 'ANSWER KEY',    accent: [220, 20, 60],   icon: 'notes' },
};

/**
 * Page one changes identity with the shuffle toggle: a plain reference list
 * is VOCABULARY, a shuffled one is a MATCHING exercise. Both renderers must
 * ask this rather than deciding for themselves.
 */
export const MATCHING_META = {
    label: 'MATCHING', accent: PAGE_META.notes.accent, icon: 'matching',
};

/**
 * Chip identity for a page type.
 * @param {string} pageType - notes | ws | cw | scr | key
 * @param {boolean} isMatching - only meaningful for `notes`
 */
export function metaFor(pageType, isMatching = false) {
    if (pageType === 'notes' && isMatching) return MATCHING_META;
    return PAGE_META[pageType] || PAGE_META.notes;
}

/** The instruction sentence that sits beside the chip. */
export function instructionFor(pageType, isMatching = false) {
    switch (pageType) {
        case 'notes': return isMatching
            ? 'Write the letter of the definition that matches each term.'
            : 'Terms and definitions for this unit.';
        case 'ws':  return 'Find and circle each word from the list in the grid.';
        case 'cw':  return 'Use the clues to fill in the grid.';
        case 'scr': return 'Unscramble each set of letters and write the word.';
        case 'key': return 'Solutions for every activity in this set.';
        default:    return '';
    }
}
