// =============================================================
// import-export/exportConfig.js — JSON config download
// =============================================================
import { state } from '../core/state.js';
import { showToast } from '../ui/toast.js';

export function downloadConfig() {
    const payload = JSON.stringify({ words: state.words });
    const a = document.createElement('a');
    a.href     = 'data:text/json;charset=utf-8,' + encodeURIComponent(payload);
    a.download = 'puzzle-config.json';
    a.click();
    showToast('Configuration saved');
}

export function loadConfigFromFile(inp, onComplete) {
    const f = inp.files[0];
    if (f) {
        // Reuse handleDroppedFile from importWords
        import('./importWords.js').then(({ handleDroppedFile }) => {
            handleDroppedFile(f, (parsed) => {
                if (onComplete) onComplete(parsed);
            });
        });
    }
    inp.value = '';
}
