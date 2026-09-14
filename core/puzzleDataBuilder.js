// =============================================================
// core/puzzleDataBuilder.js — Shared puzzle data construction
// =============================================================
import { state } from './state.js';
import { generateAllAsync } from '../workers/workerBridge.js';

export const getLetter = (i) => {
    let res = '', num = i;
    while (num >= 0) { res = String.fromCharCode(65 + (num % 26)) + res; num = Math.floor(num / 26) - 1; }
    return res;
};

/**
 * Build one complete puzzle set.
 *
 * @param {number} [variantSeed] - distinct per student set, so bulk exports
 *        stop producing the same crossword topology over and over.
 */
export async function createPuzzleData(variantSeed) {
    const pData = await generateAllAsync(state.settings, variantSeed);
    if (!pData) return null;
    const isMatching = state.settings.notesConfig.shuffle;
    let notesData = state.words.map((w, i) => ({ term: w.word, clue: w.clue, origIdx: i }));
    if (isMatching) {
        let clues = [...notesData].sort(() => Math.random() - 0.5);
        notesData = notesData.map((item, i) => ({
            term: item.term, clue: clues[i].clue,
            matchLetter: getLetter(i),
            correctLetter: getLetter(clues.findIndex(c => c.origIdx === item.origIdx)),
            origIdx: item.origIdx, clueOrigIdx: clues[i].origIdx,
            clueTermLength: clues[i].term.length,
        }));
    }
    // Bind the worked example to the data rather than to a row position:
    // the term side is term 1, the definition side is whichever row ended up
    // holding term 1's definition after the shuffle.
    const exampleOrigIdx = notesData.length ? notesData[0].origIdx : -1;
    notesData.forEach(n => {
        n.isExampleTerm = n.origIdx === exampleOrigIdx;
        n.isExampleDef = isMatching
            ? n.clueOrigIdx === exampleOrigIdx
            : n.origIdx === exampleOrigIdx;
    });

    pData.notes = notesData;
    return pData;
}
