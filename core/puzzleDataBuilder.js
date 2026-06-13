// =============================================================
// core/puzzleDataBuilder.js — Shared puzzle data construction
// =============================================================
import { state } from './state.js';
import { generateAllAsync } from '../workers/workerBridge.js';
import { getLetter } from './letters.js';

// Re-export so existing importers of getLetter from this module keep working.
export { getLetter };

export async function createPuzzleData() {
    const pData = await generateAllAsync(state.settings);
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
    pData.notes = notesData;
    return pData;
}
