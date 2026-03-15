// =============================================================
// main.js — Application entry point
// Imports all modules, wires events, initialises the app.
// =============================================================
import { state, setWords, setPuzzleData, updateSetting, applyStateToDOM, syncSettingsFromDOM } from './core/state.js';
import { pushHistory, undo, redo } from './core/history.js';
import { saveState, saveStateNow, loadRawState, hardReset } from './core/storage.js';

import { generateAllAsync } from './workers/workerBridge.js';

import { renderWordList, renderStatus, renderStatusGenerating } from './renderers/wordList.js';
import { renderWordSearch, calcWSScale } from './renderers/wordSearch.js';
import { renderCrossword, calcCWScale } from './renderers/crossword.js';
import { renderScramble } from './renderers/scramble.js';
import { renderNotes, updateNotesStyles } from './renderers/notes.js';
import { renderKeys } from './renderers/keys.js';

import { exportPDF } from './pdf/pdfExport.js';

import { showToast } from './ui/toast.js';
import { AI_PROVIDERS, generateWords, loadSavedKeys, saveKey } from './ai/aiGenerate.js';
import { openModal, closeModal } from './ui/modal.js';
import { setupSidebarResize, toggleSidebar, switchTab } from './ui/sidebar.js';
import { toggleDarkMode } from './ui/darkMode.js';
import { adjustZoom } from './ui/zoom.js';
import { setupSortableList } from './ui/pageOrder.js';
import { setupDragAndDrop } from './ui/dropZone.js';

import { processImport, handleDroppedFile } from './import-export/importWords.js';
import { downloadConfig } from './import-export/exportConfig.js';

// =============================================================
// Constants
// =============================================================
const CELL_SIZE_MIN = 15, CELL_SIZE_MAX = 60;
const WATERMARK_MAX_BYTES = 2e6;

const escapeHTML = str => str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));

// Debounce helper
const debounceFn = (func, wait) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => func(...args), wait); };
};

// =============================================================
// Puzzle data helpers
// =============================================================
const getLetter = (i) => {
    let res = '', num = i;
    while (num >= 0) { res = String.fromCharCode(65 + (num % 26)) + res; num = Math.floor(num / 26) - 1; }
    return res;
};

async function createPuzzleData() {
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
        }));
    }
    pData.notes = notesData;
    return pData;
}

// =============================================================
// Generation
// =============================================================
let generationSequenceId = 0;

async function generateAll() {
    syncSettingsFromDOM();   // ensure state reflects current DOM before generation
    const seqId = ++generationSequenceId;
    renderStatusGenerating();

    const pData = await createPuzzleData();
    if (seqId !== generationSequenceId || !pData) return;

    setPuzzleData(pData);
    autoFit('search', true);
    autoFit('crossword', true);
    updateNotesInstruction();
    _renderWordListAndStatus();
    renderActivePage();
}

const debouncedGenerate = debounceFn(generateAll, 500);
const debouncedUpdateUI = debounceFn(() => { saveState(); updateUI(); }, 500);
const debouncedRenderActivePage = debounceFn(renderActivePage, 200);

// =============================================================
// Scale / auto-fit helpers
// =============================================================
function calcScale(type, isPrint = false) {
    const w = isPrint ? 750 : 640;
    const h = type === 'search' ? 680 : 500;
    let c, r;
    if (type === 'search') {
        c = r = Math.max(1, state.puzzleData.ws?.size || 1);
    } else {
        c = Math.max(1, state.puzzleData.cw?.cols || 1);
        r = Math.max(1, state.puzzleData.cw?.rows || 1);
    }
    return Math.min(CELL_SIZE_MAX, Math.max(CELL_SIZE_MIN, Math.floor(Math.min(w / c, h / r))));
}

function autoFit(t, silent = false) {
    const el = document.getElementById(t === 'search' ? 'scaleSearch' : 'scaleCrossword');
    if (el) {
        el.value = calcScale(t);
        if (!silent) { renderActivePage(); showToast('Auto-fitted!'); }
    }
}

// =============================================================
// Rendering
// =============================================================
function renderActivePage() {
    syncSettingsFromDOM();   // always sync DOM → state before rendering so toggles take effect immediately
    const d = state.puzzleData, s = state.settings, w = state.words;

    renderNotes(
        document.getElementById('p1-notes'), d, w, s,
        (i, field, val) => updateWord(i, field, val)
    );
    renderWordSearch(
        document.getElementById('p2-area'),
        document.getElementById('p2-footer'),
        d.ws, w, s, true
    );
    renderCrossword(
        document.getElementById('p3-area'),
        document.getElementById('p3-footer'),
        d.cw, s, true
    );
    renderScramble(document.getElementById('p4-area'), d.scr, s);
    renderKeys(document.getElementById('key-container'), d, s);
    updateGridStyles();
}

function _renderWordListAndStatus() {
    const container = document.getElementById('wordList');
    renderWordList(container, state.words, state.puzzleData, state.activePage, updateWord, delWord);
    renderStatus(state.words, state.puzzleData, state.activePage);
}

function updateUI() {
    const fsEl = document.getElementById('fontSelect');
    if (fsEl) document.documentElement.style.setProperty('--user-font', fsEl.value);
    const t = document.getElementById('titleInput')?.value || 'Vocabulary Quiz';
    const s = document.getElementById('subInput')?.value || 'Unit Review';
    document.querySelectorAll('.disp-title').forEach(el => el.innerText = t);
    document.querySelectorAll('.disp-sub').forEach(el => el.innerText = s);
    updateNotesInstruction();
}

function updateNotesInstruction() {
    const el = document.getElementById('p1-instruction');
    if (!el) return;
    const isMatching = document.getElementById('notesShuffle')?.checked ?? state.settings.notesConfig.shuffle;
    el.innerText = isMatching
        ? '🃏 VOCABULARY MATCHING - MATCH EACH TERM TO ITS CORRECT DEFINITION.'
        : '📋 LIST OF TERMS AND DEFINITIONS.';
}

function updateGridStyles() {
    const g = (id, def) => { const el = document.getElementById(id); return el ? el.value : def; };
    const wsOp = g('wsOpacity', 1), cwOp = g('cwOpacity', 1);
    const wsW = g('wsLineWidth', 1), cwW = g('cwLineWidth', 1);
    document.documentElement.style.setProperty('--ws-bg-color', `rgba(255,255,255,${wsOp})`);
    document.documentElement.style.setProperty('--cw-bg-color', `rgba(255,255,255,${cwOp})`);
    document.documentElement.style.setProperty('--ws-line-width', wsW + 'px');
    document.documentElement.style.setProperty('--cw-line-width', cwW + 'px');
    document.documentElement.style.setProperty('--ws-neg-margin', (-1 * parseFloat(wsW)) + 'px');
    document.documentElement.style.setProperty('--cw-neg-margin', (-1 * parseFloat(cwW)) + 'px');
    document.querySelectorAll('.mode-search.grid').forEach(el => {
        el.style.paddingTop = wsW + 'px'; el.style.paddingLeft = wsW + 'px';
    });
    saveState();
}

function updateGlobalFontScale() {
    const el = document.getElementById('globalFontScale');
    if (el) {
        const valDisp = document.getElementById('globalFontScaleVal');
        if (valDisp) valDisp.innerText = parseFloat(el.value).toFixed(2) + 'x';
        document.documentElement.style.setProperty('--global-font-scale', el.value);
        saveState();
    }
}

function updateTitleScale() {
    const el = document.getElementById('titleScale');
    if (!el) return;
    const v = parseFloat(el.value);
    const disp = document.getElementById('titleScaleVal');
    if (disp) disp.innerText = v.toFixed(2) + 'x';
    document.documentElement.style.setProperty('--title-scale', v);
    saveState();
}

function updatePaperSize() {
    const v = document.getElementById('paperSize')?.value || 'a4';
    const isLetter = v === 'letter';
    document.documentElement.style.setProperty('--page-width',  isLetter ? '215.9mm' : '210mm');
    document.documentElement.style.setProperty('--page-height', isLetter ? '279.4mm' : '297mm');
    saveState();
}

function focusPage(n) {
    if (state.activePage !== n) showPage(n);
}

function updatePageScales() {
    ['Notes', 'WS', 'CW', 'Scr', 'Key'].forEach(p => {
        const el = document.getElementById('scale' + p + 'Font');
        if (el) {
            const val = parseFloat(el.value).toFixed(2);
            document.getElementById('scale' + p + 'FontVal').innerText = val + 'x';
            document.documentElement.style.setProperty('--scale-' + p.toLowerCase(), val);
        }
    });
    saveState();
    renderActivePage();
}

function showPage(n) {
    state.activePage = n;
    document.querySelectorAll('.page').forEach(p => p.classList.remove('visible'));
    const pEl = document.getElementById('page' + n);
    if (pEl) pEl.classList.add('visible');
    document.querySelectorAll('.page-btn').forEach((b, i) => b.classList.toggle('active', i + 1 === n));
    renderActivePage();
    _renderWordListAndStatus();  // refresh word-list status dots to reflect the new active page
}

// =============================================================
// Word list mutations
// =============================================================
function updateWord(i, f, v) {
    if (f === 'word') {
        pushHistory();
        const val = v.toUpperCase().replace(/[^A-Z]/g, '');
        state.words[i][f] = val;
        const szEl = document.getElementById('wsGridSize');
        if (szEl) {
            const sz = parseInt(szEl.value, 10);
            if (val.length > sz) {
                const newSize = Math.min(25, val.length);
                szEl.value = newSize;
                if (val.length > 25) showToast('Word exceeds max grid size. It may not fit.', 'error');
                else showToast(`Grid resized to ${newSize}`);
            }
        }
        saveState();
        debouncedGenerate();
    } else {
        state.words[i][f] = v;
        saveState();
        debouncedRenderActivePage();
    }
}

function addWordRow() {
    pushHistory();
    state.words.push({ word: '', clue: '' });
    _renderWordListAndStatus();
    saveState();
    setTimeout(() => {
        const list = document.getElementById('wordList');
        if (list) list.scrollTop = list.scrollHeight;
        const inputs = document.querySelectorAll('.wm-word');
        if (inputs.length) inputs[inputs.length - 1].focus();
    }, 50);
}

function delWord(i) {
    pushHistory();
    state.words.splice(i, 1);
    saveState();
    generateAll();
}

function moveWordUp(i) {
    if (i <= 0 || i >= state.words.length) return;
    pushHistory();
    const temp = state.words[i];
    state.words[i] = state.words[i - 1];
    state.words[i - 1] = temp;
    _renderWordListAndStatus();
    saveState();
    debouncedGenerate();
}

function moveWordDown(i) {
    if (i < 0 || i >= state.words.length - 1) return;
    pushHistory();
    const temp = state.words[i];
    state.words[i] = state.words[i + 1];
    state.words[i + 1] = temp;
    _renderWordListAndStatus();
    saveState();
    debouncedGenerate();
}

function clearList() {
    if (confirm(`Clear all ${state.words.length} words? This cannot be undone.`)) {
        pushHistory();
        setWords([]);
        saveState();
        generateAll();
    }
}

// =============================================================
// Watermark
// =============================================================
function handleImage(inp) {
    if (!inp.files[0]) return;
    if (inp.files[0].size > WATERMARK_MAX_BYTES) {
        showToast('Image must be smaller than 2MB.', 'error');
        inp.value = ''; return;
    }
    const r = new FileReader();
    r.onload = e => {
        state.watermarkSrc = '';
        document.querySelectorAll('.watermark-img').forEach(img => { img.src = ''; img.style.display = 'none'; });
        state.watermarkSrc = e.target.result;
        document.querySelectorAll('.watermark-img').forEach(img => {
            if (!img.closest('#page5')) { img.src = state.watermarkSrc; img.style.display = 'block'; }
        });
        saveState();
        showToast('Watermark added');
    };
    r.onerror = () => { showToast('Failed to read image file.', 'error'); inp.value = ''; };
    r.readAsDataURL(inp.files[0]);
}

function updateOpacity(v) {
    document.documentElement.style.setProperty('--wm-opacity', v);
    saveState();
}

function clearWatermark() {
    state.watermarkSrc = '';
    document.querySelectorAll('.watermark-img').forEach(i => i.style.display = 'none');
    const bgU = document.getElementById('bgUpload');
    if (bgU) bgU.value = '';
    saveState();
    showToast('Watermark removed');
}

// =============================================================
// AI Word Generation Modal
// =============================================================

let _aiResults = []; // last generated results

function openAIModal() {
    const overlay = document.getElementById('ai-modal-overlay');
    if (!overlay) return;
    overlay.style.display = 'flex';

    // Restore provider + model + saveKey preference from state
    const providerEl  = document.getElementById('aiProvider');
    const saveKeyEl   = document.getElementById('aiSaveKey');
    const cfg = state.settings.aiConfig;
    if (providerEl && cfg?.provider) providerEl.value = cfg.provider;
    if (saveKeyEl  && cfg?.saveKey  !== undefined) saveKeyEl.checked = cfg.saveKey;

    _refreshAIModelList();
    _refreshAIKeyField();
}

function closeAIModal() {
    const overlay = document.getElementById('ai-modal-overlay');
    if (overlay) overlay.style.display = 'none';
    _setAIStatus(null);
    _clearAIResults();
}

function onAIProviderChange() {
    _refreshAIModelList();
    _refreshAIKeyField();
    syncSettingsFromDOM();
    saveState();
}

function _getSelectedProvider() {
    const id = document.getElementById('aiProvider')?.value || 'google';
    return AI_PROVIDERS.find(p => p.id === id) || AI_PROVIDERS[0];
}

function _refreshAIModelList() {
    const provider = _getSelectedProvider();
    const modelEl = document.getElementById('aiModel');
    if (!modelEl) return;
    modelEl.innerHTML = provider.models.map(m =>
        `<option value="${m.id}"${m.default ? ' selected' : ''}>${m.label}</option>`
    ).join('');
    // Restore saved model if applicable
    const savedModel = state.settings.aiConfig?.model;
    if (savedModel && provider.models.some(m => m.id === savedModel)) {
        modelEl.value = savedModel;
    }
}

function _refreshAIKeyField() {
    const provider = _getSelectedProvider();
    const keyInput = document.getElementById('aiKeyInput');
    const keyHint  = document.getElementById('aiKeyHint');
    const keyLink  = document.getElementById('aiKeyLink');
    if (keyInput) keyInput.placeholder = provider.keyPlaceholder || '';
    if (keyHint)  keyHint.textContent  = provider.keyHint || '';
    if (keyLink)  keyLink.href = provider.keyLink || '#';
    // Restore saved key for this provider
    const saved = loadSavedKeys();
    if (keyInput) keyInput.value = saved[provider.id] || '';
}

function toggleAIKeyVisibility() {
    const input = document.getElementById('aiKeyInput');
    const icon  = document.getElementById('aiKeyEyeIcon');
    if (!input) return;
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    if (icon) icon.className = isPass ? 'fas fa-eye-slash' : 'fas fa-eye';
}

function _setAIStatus(msg, type = 'loading') {
    const el = document.getElementById('ai-status');
    if (!el) return;
    if (!msg) { el.style.display = 'none'; el.className = 'ai-status'; el.innerHTML = ''; return; }
    el.style.display = 'block';
    el.className = `ai-status ${type}`;
    el.innerHTML = type === 'loading'
        ? `<span class="ai-spinner"></span> ${msg}`
        : msg;
}

function _clearAIResults() {
    _aiResults = [];
    const el = document.getElementById('ai-results');
    if (el) el.style.display = 'none';
}

function _renderAIResults(words) {
    _aiResults = words;
    const container = document.getElementById('ai-results');
    const list      = document.getElementById('ai-results-list');
    const count     = document.getElementById('ai-results-count');
    if (!container || !list) return;

    if (count) count.textContent = `${words.length} word${words.length !== 1 ? 's' : ''} generated`;

    list.innerHTML = words.map((w, i) => `
        <label class="ai-result-item">
            <input type="checkbox" class="ai-result-cb" data-index="${i}" checked>
            <span class="ai-result-word">${w.word}</span>
            <span class="ai-result-clue">${w.clue}</span>
        </label>
    `).join('');

    container.style.display = 'block';
}

async function runAIGenerate() {
    const provider  = _getSelectedProvider();
    const modelEl   = document.getElementById('aiModel');
    const keyInput  = document.getElementById('aiKeyInput');
    const topicEl   = document.getElementById('aiTopic');
    const gradeEl   = document.getElementById('aiGrade');
    const subjectEl = document.getElementById('aiSubject');
    const diffEl    = document.getElementById('aiDifficulty');
    const countEl   = document.getElementById('aiCount');
    const saveKeyEl = document.getElementById('aiSaveKey');
    const btn       = document.getElementById('ai-generate-btn');

    const apiKey = keyInput?.value?.trim();
    const topic  = topicEl?.value?.trim();

    if (!apiKey) { _setAIStatus('Please enter your API key.', 'error'); return; }
    if (!topic)  { _setAIStatus('Please enter a topic or context.', 'error'); return; }

    // Optionally save key
    if (saveKeyEl?.checked) saveKey(provider.id, apiKey);
    else saveKey(provider.id, ''); // clear if unchecked

    _clearAIResults();
    _setAIStatus('Generating words — this usually takes a few seconds…', 'loading');
    if (btn) btn.disabled = true;

    try {
        const words = await generateWords({
            providerId:  provider.id,
            modelId:     modelEl?.value,
            apiKey,
            topic,
            gradeLevel:  gradeEl?.value  || '3rd-5th grade',
            subject:     subjectEl?.value || 'General',
            difficulty:  diffEl?.value   || 'medium',
            count:       parseInt(countEl?.value || '10', 10),
        });

        if (words.length === 0) {
            _setAIStatus('The AI returned no valid words. Try a different topic or model.', 'error');
        } else {
            _setAIStatus(null);
            _renderAIResults(words);
        }

        // Persist chosen provider + model
        syncSettingsFromDOM();
        saveState();
    } catch (err) {
        const safe = (err.message || 'Unknown error').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        _setAIStatus(`<strong>Error:</strong> ${safe}`, 'error');
    } finally {
        if (btn) btn.disabled = false;
    }
}

function aiSelectAll() {
    document.querySelectorAll('.ai-result-cb').forEach(cb => { cb.checked = true; });
}

function aiSelectNone() {
    document.querySelectorAll('.ai-result-cb').forEach(cb => { cb.checked = false; });
}

function aiImportSelected() {
    const checked = Array.from(document.querySelectorAll('.ai-result-cb:checked'));
    if (checked.length === 0) { showToast('No words selected.', 'warning'); return; }

    const toAdd = checked.map(cb => {
        const i = parseInt(cb.dataset.index, 10);
        return _aiResults[i];
    }).filter(Boolean);

    const newWords = [...state.words, ...toAdd.map(w => ({ word: w.word, clue: w.clue }))];
    pushHistory(state.words);
    setWords(newWords);
    saveState();
    generateAll();
    closeAIModal();
    showToast(`Added ${toAdd.length} word${toAdd.length !== 1 ? 's' : ''} to your list.`, 'success');
}

// =============================================================
// Expose public API on window (called by HTML onclick attributes)
// =============================================================
// The HTML has inline onclick="..." handlers that were written before
// the modularisation. Rather than rewrite every handler in the HTML
// (a separate, mechanical task), we expose a single namespace object.
window._puzzleApp = {
    // Generation
    generateAll,
    // Word management
    addWordRow, updateWord, delWord, moveWordUp, moveWordDown, clearList,
    // Word import/export
    openModal: (el) => openModal(el),
    closeModal,
    processImport: () => processImport(generateAll),
    downloadConfig,
    loadConfigFromFile: (inp) => {
        const f = inp.files[0];
        if (f) handleDroppedFile(f, (parsed) => { applyStateToDOM(parsed); generateAll(); }, () => processImport(generateAll));
        inp.value = '';
    },
    // PDF export
    exportPDF,
    // UI controls
    toggleDarkMode,
    toggleSidebar,
    switchTab,
    adjustZoom: (d) => adjustZoom(d),
    showPage,
    autoFit,
    updateUI,
    updateGridStyles,
    updateGlobalFontScale,
    updateTitleScale,
    updatePaperSize,
    updatePageScales,
    focusPage,
    updateNotesStyles: () => { syncSettingsFromDOM(); updateNotesStyles(state.settings); saveState(); },
    updateNotesInstruction,
    handleImage,
    updateOpacity,
    clearWatermark,
    hardReset: () => hardReset(),
    undo: () => undo(() => { saveState(); generateAll(); }),
    redo: () => redo(() => { saveState(); generateAll(); }),
    // AI generation
    openAIModal,
    closeAIModal,
    onAIProviderChange,
    toggleAIKeyVisibility,
    runAIGenerate,
    aiSelectAll,
    aiSelectNone,
    aiImportSelected,
};

// Also expose functions that are called directly without namespace
// (legacy inline handlers like onclick="showPage(1)")
Object.assign(window, {
    generateAll,
    addWordRow,
    updateWord,
    delWord,
    clearList,
    openModal: (el) => openModal(el),
    closeModal,
    processImport: () => processImport(generateAll),
    downloadConfig,
    exportPDF,
    toggleDarkMode,
    toggleSidebar,
    switchTab,
    adjustZoom: (d) => adjustZoom(d),
    showPage,
    autoFit,
    updateUI,
    updateGridStyles,
    updateGlobalFontScale,
    updateTitleScale,
    updatePaperSize,
    updatePageScales,
    focusPage,
    updateNotesStyles: () => { syncSettingsFromDOM(); updateNotesStyles(state.settings); saveState(); },
    updateNotesInstruction,
    handleImage,
    updateOpacity,
    clearWatermark,
    hardReset: () => hardReset(),
    undo: () => undo(() => { saveState(); generateAll(); }),
    redo: () => redo(() => { saveState(); generateAll(); }),
    loadConfigFromFile: (inp) => window._puzzleApp.loadConfigFromFile(inp),
    // AI generation
    openAIModal,
    closeAIModal,
    onAIProviderChange,
    toggleAIKeyVisibility,
    runAIGenerate,
    aiSelectAll,
    aiSelectNone,
    aiImportSelected,
    // Called directly from HTML oninput/onchange attributes:
    debouncedGenerate,
    renderActivePage,
    debouncedUpdateUI,
    saveState,
});

// =============================================================
// Initialisation
// =============================================================
window.addEventListener('load', async () => {
    const overlay = document.getElementById('loading-overlay');
    try {
        const saved = loadRawState();
        if (saved) applyStateToDOM(saved);

        // Restore watermark images in DOM from state (applyStateToDOM set state.watermarkSrc)
        if (state.watermarkSrc) {
            document.querySelectorAll('.watermark-img').forEach(img => {
                if (!img.closest('#page5')) { img.src = state.watermarkSrc; img.style.display = 'block'; }
            });
        }

        pushHistory();
        await generateAll();
        updateGridStyles();
        updatePageScales();
        updateGlobalFontScale();
        updateTitleScale();
        updatePaperSize();
        updateUI();

        await new Promise(r => setTimeout(r, 300));
        if (overlay) overlay.style.opacity = '0';
        setTimeout(() => {
            if (overlay) { overlay.style.display = 'none'; overlay.style.opacity = '1'; }
        }, 300);
    } catch (e) {
        console.error('Init failed', e);
        if (overlay) overlay.style.display = 'none';
        showToast('Failed to load saved settings.', 'error');
    }

    // Global keyboard shortcuts
    document.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') addWordRow();
        if (e.key === 'Escape') {
            const modal = document.getElementById('modal-overlay');
            if (modal && modal.style.display === 'flex') closeModal();
            const aiModal = document.getElementById('ai-modal-overlay');
            if (aiModal && aiModal.style.display === 'flex') closeAIModal();
        }
        const tag = document.activeElement?.tagName;
        const inText = tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable;
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey && !inText) {
            e.preventDefault(); undo(() => { saveState(); generateAll(); });
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey)) && !inText) {
            e.preventDefault(); redo(() => { saveState(); generateAll(); });
        }
        // 1-5 keys: jump to page (when not in a text field)
        if (!inText && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const n = parseInt(e.key, 10);
            if (n >= 1 && n <= 5) showPage(n);
        }
    });

    setupSidebarResize();
    setupSortableList();
    setupDragAndDrop(file =>
        handleDroppedFile(
            file,
            (parsed) => { applyStateToDOM(parsed); generateAll(); },
            () => processImport(generateAll)
        )
    );
});

window.addEventListener('orientationchange', () => {
    setTimeout(() => {
        if (window.innerWidth <= 900) document.body.classList.add('sidebar-closed');
    }, 100);
});
