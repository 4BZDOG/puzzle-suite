// =============================================================
// core/notesModel.js — shared reading of the notes/matching data
// =============================================================
// Deliberately dependency-free: imported by both the HTML renderers and
// the PDF drawers (and therefore by the Node test harness), so it must not
// reach for the DOM, the worker, or application state.

/**
 * Matching mode is a property of the DATA, never of the settings.
 * `settings.notesConfig.shuffle` can be on before anything is generated,
 * at which point the notes array has no shuffle fields at all.
 */
export function isMatchingNotes(notes) {
    return !!(notes && notes.length && notes[0].matchLetter !== undefined);
}

/**
 * Row index carrying the worked example on the DEFINITION side.
 *
 * The term side is always row 0 — "1. [M] CARTESIAN" — but in matching mode
 * the definition sitting in row 0 belongs to some other term, because the
 * definitions are shuffled. The EXAMPLE badge has to follow the definition
 * that actually describes term 1, otherwise it marks a definition that is
 * not the answer to the example and teaches the student the wrong pairing.
 */
export function exampleDefIndex(notes) {
    if (!notes || !notes.length) return -1;
    if (!isMatchingNotes(notes)) return 0;
    const i = notes.findIndex(n => n.clueOrigIdx === notes[0].origIdx);
    return i >= 0 ? i : 0;
}

/**
 * Drop a trailing "(12)" letter count from a definition.
 *
 * Clue strings are written once and shared with the crossword, which wants
 * the count. A matching sheet must not carry it: with one 3-letter and one
 * 12-letter word in the list, the count alone answers the question.
 */
export function stripLetterCount(clue) {
    return String(clue == null ? '' : clue).replace(/\s*\(\s*\d+\s*\)\s*$/, '').trim();
}
