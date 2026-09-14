// =============================================================
// core/exampleModel.js — which word carries the worked example
// =============================================================
// Dependency-free so the HTML renderers, the PDF drawers and the Node test
// harness all pick the SAME example word. When the preview and the print
// disagree about the example, a teacher checks the wrong thing on screen.

/** Length that makes a good worked example: enough to show the idea, not
 *  enough to solve the puzzle. */
const MIN_LEN = 5, MAX_LEN = 7, IDEAL_LEN = 6;

function nearestToIdeal(list, lenOf) {
    return list.reduce((best, w) =>
        Math.abs(lenOf(w) - IDEAL_LEN) < Math.abs(lenOf(best) - IDEAL_LEN) ? w : best, list[0]);
}

/**
 * The across word that carries the crossword's worked example.
 *
 * Taking the first-numbered across word meant the example varied wildly in
 * length between sets: one prefilled a 12-letter SUBSTITUTION, solving over
 * a tenth of the grid outright, the next prefilled a 4-letter AXIS.
 *
 * @param {Array} acrossWords - placed words with dir === 'across'
 */
export function pickCrosswordExample(acrossWords) {
    if (!acrossWords?.length) return null;
    const moderate = acrossWords.filter(w => w.word.length >= MIN_LEN && w.word.length <= MAX_LEN);
    if (moderate.length) return moderate[0];
    return nearestToIdeal(acrossWords, w => w.word.length);
}

/**
 * The word-search position that carries the worked example.
 *
 * The generator marks one word — moderate length, placed forwards
 * left-to-right — as the example. Falling back to `wordPositions[0]` gave
 * whichever word was placed first, which in several sets meant the single
 * worked example was spelled backwards, with no direction indicator.
 *
 * @param {Object} wsData - puzzleData.ws
 */
export function pickWSExample(wsData) {
    const wp = wsData?.wordPositions;
    if (!wp?.length) return null;
    return wp.find(w => w.isExample)
        || wp.find(w => w.dir && w.dir[0] === 1 && w.dir[1] === 0)
        || wp[0];
}
