// =============================================================
// import-export/importWords.js
// Word list import: text parsing + dropped file handling
// =============================================================
import { state, setWords } from '../core/state.js';
import { pushHistory } from '../core/history.js';
import { showToast } from '../ui/toast.js';
import { closeModal } from '../ui/modal.js';

/**
 * Parse and import words from the import textarea.
 * Calls generateAll callback on success.
 */
export function processImport(onComplete) {
    const imp = document.getElementById('import-text');
    if (!imp) return;
    const text = imp.value;
    if (!text.trim()) return;

    pushHistory();
    const newWords = [...state.words];
    const existingWordSet = new Set(newWords.map(w => w.word));

    text.split('\n').forEach(l => {
        if (!l.trim()) return;

        // Match a word followed by a separator (-, :, ,, or multiple spaces/tabs) and then a clue
        const match = l.match(/^([^-:,\t\s]+)[-:,\t\s]+(.*)$/);

        let w, clue;

        if (match && match[1]) {
            w = match[1].trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            clue = match[2].trim() || 'Find the word';
        } else {
            // Fallback for just a word on a line without separators
            w = l.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
            clue = 'Find the word';
        }

        if (w && w.length > 1 && !existingWordSet.has(w)) {
            newWords.push({ word: w, clue: clue });
            existingWordSet.add(w);
        }
    });

    setWords(newWords);
    closeModal();
    imp.value = '';
    showToast('Import successful');
    if (onComplete) onComplete();
}

/**
 * Handle a file dropped onto the page or selected via input.
 * Delegates to processImport (text) or applyState (JSON).
 */
export function handleDroppedFile(file, onApplyJSON, onTextImport) {
    const r = new FileReader();
    r.onload = e => {
        const text = e.target.result;
        if (file.name.endsWith('.json')) {
            try {
                const parsed = JSON.parse(text);
                if (onApplyJSON) onApplyJSON(parsed);
                showToast('Loaded config!');
            } catch (_) {
                showToast('Invalid JSON config', 'error');
            }
        } else {
            const imp = document.getElementById('import-text');
            if (imp) {
                imp.value = text;
                if (onTextImport) onTextImport();
                else processImport();
            }
        }
    };
    r.readAsText(file);
}
