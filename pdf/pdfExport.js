// =============================================================
// pdf/pdfExport.js — PDF export orchestrator
// Lazy-loads jsPDF, runs the bulk loop, drives progress UI.
// =============================================================
import { state, syncSettingsFromDOM } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { createPuzzleData } from '../core/puzzleDataBuilder.js';
import { loadJSPDF, loadFontForPDF, FONT_SELECT_MAP } from './pdfFonts.js';
import { buildCtx, drawHeader } from './pdfHelpers.js';
import { drawWordSearch } from './pdfDrawWordSearch.js';
import { drawCrossword, drawCrosswordClues } from './pdfDrawCrossword.js';
import { drawScramble } from './pdfDrawScramble.js';
import { drawNotes, drawMasterKeyPage } from './pdfDrawNotes.js';

let isExporting = false;

export async function exportPDF() {
    if (isExporting) return;
    if (state.words.length === 0) { showToast('Please add words first.', 'error'); return; }

    syncSettingsFromDOM();  // flush any unsaved DOM changes into state.settings before reading cfg
    isExporting = true;
    const exportBtn = document.getElementById('export-btn-main');
    if (exportBtn) exportBtn.disabled = true;

    // --- Gather export settings from DOM ---
    const cfg = state.settings;
    const pageOrder = cfg.pageOrder || ['notes', 'ws', 'cw', 'scr', 'key'];
    const selections = cfg.opts;
    const selectedPages = pageOrder.filter(p => selections[p]);

    if (selectedPages.length === 0) {
        showToast('Select at least one page.', 'error');
        isExporting = false;
        if (exportBtn) exportBtn.disabled = false;
        return;
    }

    const L = document.getElementById('loading-overlay');
    const T = document.getElementById('loading-text');
    const B = document.getElementById('loading-progress');

    const title = cfg.title || 'Puzzle';
    const sub = cfg.sub || '';
    const count = (() => { const el = document.getElementById('bulkCount'); return el ? parseInt(el.value, 10) : 1; })();
    const filename = ((() => { const el = document.getElementById('exportFilename'); return el ? el.value.trim() : ''; })()
        .replace(/[^a-z0-9-_]/gi, '_') || 'MyPuzzle');
    const scrShowHint = cfg.scrShowHint;

    if (L) { L.style.display = 'flex'; L.style.opacity = '1'; }
    if (T) T.innerText = 'Starting Export...';

    try {
        if (T) T.innerText = 'Loading PDF Engine...';
        const jspdfModule = await loadJSPDF();
        const { jsPDF } = jspdfModule;

        const paperSize = cfg.paperSize || 'a4';
        const isLetter  = paperSize === 'letter';
        const PAGE_WIDTH  = isLetter ? 215.9 : 210;
        const PAGE_HEIGHT = isLetter ? 279.4 : 297;
        const doc = new jsPDF({ unit: 'mm', format: paperSize, orientation: 'portrait' });
        const MARGIN = 15;

        const scale = parseFloat(cfg.globalFontScale) || 1;
        const getPScale = (key) => {
            const val = cfg.scales?.[key.toLowerCase()];
            return scale * (val !== undefined ? parseFloat(val) || 1 : 1);
        };

        let pdfFont = 'helvetica';

        // Pre-load watermark image
        let wmImg = null;
        if (state.watermarkSrc) {
            wmImg = await new Promise(res => {
                const img = new Image();
                img.onload = () => res(img);
                img.onerror = () => res(null);
                img.src = state.watermarkSrc;
            });
        }

        // Build a reusable context object
        let ctx = buildCtx(doc, pdfFont, wmImg, scale, { PAGE_WIDTH, PAGE_HEIGHT, MARGIN }, cfg);

        // Load custom font
        const fontSelectVal = cfg.font || "'Inter', sans-serif";
        const fontName = FONT_SELECT_MAP[fontSelectVal];
        if (fontName) {
            if (T) T.innerText = 'Loading fonts...';
            try {
                const ok = await loadFontForPDF(doc, fontName, 400);
                if (ok) { await loadFontForPDF(doc, fontName, 700); pdfFont = fontName; }
            } catch (_) { }
        }
        // Rebuild ctx with final pdfFont
        ctx = buildCtx(doc, pdfFont, wmImg, scale, { PAGE_WIDTH, PAGE_HEIGHT, MARGIN }, cfg);

        let isFirstPage = true;

        for (let i = 0; i < count; i++) {
            if (T) T.innerText = `Generating Set ${i + 1}/${count}`;
            if (B) B.style.width = Math.round((i / count) * 100) + '%';
            await new Promise(r => setTimeout(r, 10));

            let cpd = null, attempts = 0;
            while (!cpd && attempts++ < 3) cpd = await createPuzzleData();
            if (!cpd) { showToast('Puzzle generation failed. Try again.', 'error'); break; }

            const setIndicator = count > 1 ? `SET ${i + 1}` : '';

            const addPage = () => {
                if (!isFirstPage) doc.addPage();
                isFirstPage = false;
                ctx.drawWatermark();
            };

            for (const pType of selectedPages) {
                // Yield to main thread so progress bar updates and browser does not crash
                await new Promise(r => setTimeout(r, 0));

                if (pType === 'notes') {
                    addPage();
                    const ps = getPScale('notes');
                    const isMatchingMode = cfg.notesConfig?.shuffle;
                    const notesInstruction = isMatchingMode
                        ? '🃏 VOCABULARY MATCHING - MATCH EACH TERM TO ITS CORRECT DEFINITION.'
                        : '📋 LIST OF TERMS AND DEFINITIONS.';
                    const sy = drawHeader(ctx, title, sub, notesInstruction, false, setIndicator, ps);
                    drawNotes(ctx, cpd.notes, sy, ps);

                } else if (pType === 'ws') {
                    addPage();
                    const ps = getPScale('ws');
                    const sy = drawHeader(ctx, title, sub, '🔍 WORD SEARCH - HIGHLIGHT THE WORDS LISTED IN THE GRID.', false, setIndicator, ps);
                    const layout = { x: MARGIN, y: sy, w: PAGE_WIDTH - 2 * MARGIN, h: PAGE_HEIGHT - sy - 30 * ps };
                    drawWordSearch(ctx, cpd.ws, layout, state.words, cfg.wsUseClues, false, ps);

                } else if (pType === 'cw') {
                    const ps = getPScale('cw');
                    const useSeparateClues = cfg.cwSeparateClues;
                    addPage();
                    const cwInstruction = useSeparateClues
                        ? '✏️ CROSSWORD - USE THE CLUES ON THE FOLLOWING PAGE TO FILL IN THE GRID.'
                        : '✏️ CROSSWORD - USE THE CLUES PROVIDED TO FILL IN THE GRID.';
                    const sy = drawHeader(ctx, title, sub, cwInstruction, false, setIndicator, ps);
                    if (useSeparateClues) {
                        const layout = { x: MARGIN, y: sy, w: PAGE_WIDTH - 2 * MARGIN, h: PAGE_HEIGHT - sy - MARGIN };
                        drawCrossword(ctx, cpd.cw, layout, false, ps, true);
                        addPage();
                        const cluesSy = drawHeader(ctx, title, sub, '✏️ CROSSWORD CLUES', false, setIndicator, ps);
                        drawCrosswordClues(ctx, cpd.cw, cluesSy, ps);
                    } else {
                        const layout = { x: MARGIN, y: sy, w: PAGE_WIDTH - 2 * MARGIN, h: (PAGE_HEIGHT - sy) * 0.45 };
                        drawCrossword(ctx, cpd.cw, layout, false, ps);
                    }

                } else if (pType === 'scr') {
                    addPage();
                    const ps = getPScale('scr');
                    const sy = drawHeader(ctx, title, sub, '🔀 WORD SCRAMBLE - UNSCRAMBLE THE LETTERS TO FIND THE WORDS.', false, setIndicator, ps);
                    const layout = { x: MARGIN, y: sy, w: PAGE_WIDTH - 2 * MARGIN, h: PAGE_HEIGHT - sy - MARGIN };
                    drawScramble(ctx, cpd.scr, layout, false, scrShowHint, ps);

                } else if (pType === 'key') {
                    addPage();
                    const ps = getPScale('key');
                    drawMasterKeyPage(ctx, title, sub, cpd, selections, ps);
                }
            }
        }

        if (T) T.innerText = 'Saving Vector PDF...';
        if (B) B.style.width = '100%';
        await new Promise(r => setTimeout(r, 100));

        doc.save(filename + '.pdf');
        showToast('PDF exported successfully!');

    } catch (e) {
        console.error(e);
        showToast('PDF export failed. Check internet connection for required libraries.', 'error');
    } finally {
        isExporting = false;
        if (exportBtn) exportBtn.disabled = false;
        if (L) { L.style.opacity = '0'; setTimeout(() => L.style.display = 'none', 300); }
    }
}
