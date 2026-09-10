// =============================================================
// pdf/pdfExport.js — PDF export orchestrator
// Lazy-loads jsPDF, runs the bulk loop, drives progress UI.
// =============================================================
import { state, syncSettingsFromDOM } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { licenseManager } from '../license/licenseManager.js';
import { createPuzzleData } from '../core/puzzleDataBuilder.js';
import { loadJSPDF, loadFontForPDF, FONT_SELECT_MAP } from './pdfFonts.js';
import { buildCtx, drawHeader, drawFooter } from './pdfHelpers.js';
import { drawWordSearch } from './pdfDrawWordSearch.js';
import { drawCrosswordPage, drawCrosswordClues } from './pdfDrawCrossword.js';
import { drawScramble } from './pdfDrawScramble.js';
import { drawNotes, drawMasterKeyPage } from './pdfDrawNotes.js';

let isExporting = false;

// Per-activity identity: a coloured chip in the header instead of five
// pages of identical grey type. Accents are reused by nothing else.
const PAGE_META = {
    notes: { label: 'VOCABULARY',  accent: [99, 102, 241] },
    ws:    { label: 'WORD SEARCH', accent: [13, 148, 136] },
    cw:    { label: 'CROSSWORD',   accent: [124, 58, 237] },
    scr:   { label: 'WORD SCRAMBLE', accent: [217, 119, 6] },
};

// Room left under the content box for the running footer.
const FOOTER_H = 10;

// Premium font select values (gated behind the premiumFonts feature flag)
const PREMIUM_FONT_VALUES = ["'Lora', serif", "'Comic Neue', cursive"];

/**
 * Pages produced per set, given the selected page types and config.
 * A crossword with "clues on separate page" produces 2 pages; everything
 * else is 1 page each. This is the unit we meter for PDF monetisation.
 */
function pagesPerSet(selectedPages, cfg) {
  return selectedPages.reduce((n, p) => {
    if (p === 'cw' && cfg.cwSeparateClues) return n + 2;
    return n + 1;
  }, 0);
}

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

    // --- Feature gating: block locked features for the current tier ---
    const lockedFeatures = [];
    if (selections.cw && cfg.cwSeparateClues && !licenseManager.hasFeature('separateCluePages')) {
        lockedFeatures.push('Crossword clues on a separate page');
    }
    if (PREMIUM_FONT_VALUES.includes(cfg.font) && !licenseManager.hasFeature('premiumFonts')) {
        lockedFeatures.push('Premium fonts (Classic & Playful)');
    }
    if (lockedFeatures.length) {
        const msg = `${lockedFeatures.join(' and ')} ${lockedFeatures.length > 1 ? 'are' : 'is a'} Pro feature${lockedFeatures.length > 1 ? 's' : ''}. Upgrade to include ${lockedFeatures.length > 1 ? 'them' : 'it'} in your PDF.`;
        isExporting = false;
        if (exportBtn) exportBtn.disabled = false;
        if (typeof window !== 'undefined' && window.showUpgradePrompt) window.showUpgradePrompt(msg);
        else showToast(msg, 'warning');
        return;
    }

    // --- Page-quota check: monetise PDF generation by page ---
    const totalPages = pagesPerSet(selectedPages, cfg) * (Number.isFinite(count) && count > 0 ? count : 1);
    const quota = await licenseManager.canExport(totalPages);
    if (!quota.allowed) {
        const u = quota.usage || {};
        isExporting = false;
        if (exportBtn) exportBtn.disabled = false;
        if (licenseManager.isPro) {
            showToast(`Monthly PDF page limit reached (${u.pagesUsed}/${u.pageLimit}). This export needs ${totalPages} pages.`, 'warning');
        } else {
            const msg = `You've used ${u.pagesUsed} of ${u.pageLimit} free PDF pages this month, and this export needs ${totalPages} more. Upgrade for a higher monthly limit.`;
            if (typeof window !== 'undefined' && window.showUpgradePrompt) window.showUpgradePrompt(msg);
            else showToast(msg, 'warning');
        }
        return;
    }

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

                const meta = PAGE_META[pType];
                const contentBox = (sy) => ({
                    x: MARGIN, y: sy,
                    w: PAGE_WIDTH - 2 * MARGIN,
                    h: PAGE_HEIGHT - sy - MARGIN - FOOTER_H,
                });

                if (pType === 'notes') {
                    addPage();
                    const ps = getPScale('notes');
                    const isMatchingMode = cfg.notesConfig?.shuffle;
                    const notesInstruction = isMatchingMode
                        ? '🃏 Write the letter of the definition that matches each term.'
                        : '📋 Terms and definitions for this unit.';
                    const sy = drawHeader(ctx, title, sub, notesInstruction, false, setIndicator, ps, meta);
                    drawNotes(ctx, cpd.notes, sy, ps);
                    drawFooter(ctx, ps, { right: meta.label });

                } else if (pType === 'ws') {
                    addPage();
                    const ps = getPScale('ws');
                    const sy = drawHeader(ctx, title, sub, '🔍 Find and circle each word from the list in the grid.', false, setIndicator, ps, meta);
                    drawWordSearch(ctx, cpd.ws, contentBox(sy), state.words, cfg.wsUseClues, false, ps);
                    drawFooter(ctx, ps, { right: meta.label });

                } else if (pType === 'cw') {
                    const ps = getPScale('cw');
                    const useSeparateClues = cfg.cwSeparateClues;
                    addPage();
                    const cwInstruction = useSeparateClues
                        ? '✏️ Use the clues on the next page to fill in the grid.'
                        : '✏️ Use the clues to fill in the grid.';
                    const sy = drawHeader(ctx, title, sub, cwInstruction, false, setIndicator, ps, meta);
                    // The compiler keeps grid + clues on one page unless the
                    // teacher asked for a split (or it is physically impossible).
                    const res = drawCrosswordPage(ctx, cpd.cw, contentBox(sy), ps, useSeparateClues);
                    drawFooter(ctx, ps, { right: meta.label });
                    if (res.splitNeeded) {
                        addPage();
                        const cluesSy = drawHeader(ctx, title, sub, '✏️ Clues for the grid on the previous page.', false, setIndicator, ps, meta);
                        drawCrosswordClues(ctx, cpd.cw, cluesSy, ps);
                        drawFooter(ctx, ps, { right: 'CROSSWORD CLUES' });
                    }

                } else if (pType === 'scr') {
                    addPage();
                    const ps = getPScale('scr');
                    const sy = drawHeader(ctx, title, sub, '🔀 Unscramble each set of letters and write the word.', false, setIndicator, ps, meta);
                    drawScramble(ctx, cpd.scr, contentBox(sy), false, scrShowHint, ps);
                    drawFooter(ctx, ps, { right: meta.label });

                } else if (pType === 'key') {
                    addPage();
                    const ps = getPScale('key');
                    drawMasterKeyPage(ctx, title, sub, cpd, selections, ps);
                    drawFooter(ctx, ps, { right: 'TEACHER KEY' });
                }
            }
        }

        if (T) T.innerText = 'Saving Vector PDF...';
        if (B) B.style.width = '100%';
        await new Promise(r => setTimeout(r, 100));

        doc.save(filename + '.pdf');
        // Record usage for monetisation metering (fire-and-forget, non-blocking).
        // Report what was actually produced — a crossword that had to split
        // costs one page more than the pre-export estimate.
        let actualPages = totalPages;
        try { actualPages = doc.internal.getNumberOfPages() || totalPages; } catch (_) { }
        licenseManager.recordPdfUsage({
            pages: actualPages,
            sets: count,
            pageTypes: selectedPages.join(','),
        }).catch(() => {});
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
