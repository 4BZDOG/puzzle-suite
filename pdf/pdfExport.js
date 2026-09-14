// =============================================================
// pdf/pdfExport.js — PDF export orchestrator
// Lazy-loads jsPDF, runs the bulk loop, drives progress UI.
// =============================================================
import { state, syncSettingsFromDOM } from '../core/state.js';
import { showToast } from '../ui/toast.js';
import { licenseManager } from '../license/licenseManager.js';
import { createPuzzleData } from '../core/puzzleDataBuilder.js';
import { loadJSPDF, loadFontForPDF, FONT_SELECT_MAP } from './pdfFonts.js';
import { buildCtx, drawHeader, drawFooter, drawBlankFiller } from './pdfHelpers.js';
import { metaFor, instructionFor } from '../core/pageMeta.js';
import { transposeCrossword } from '../workers/workerBridge.js';
import { drawWordSearch } from './pdfDrawWordSearch.js';
import { drawCrosswordPage, drawCrosswordClues } from './pdfDrawCrossword.js';
import { drawScramble } from './pdfDrawScramble.js';
import { drawNotes, drawMasterKeyPage } from './pdfDrawNotes.js';

let isExporting = false;

// Room left under the content box for the running footer.
const FOOTER_H = 10;

/**
 * A distinct generation seed per set (and per retry within a set).
 *
 * Knuth's multiplicative constant spreads consecutive set indices across the
 * 32-bit range, so set 2 and set 23 no longer start from neighbouring states
 * and produce the same crossword.
 */
function _setSeed(setIndex, attempt) {
    return (Math.imul(setIndex * 64 + attempt + 1, 2654435761) ^ Date.now()) >>> 0;
}

// Premium font select values (gated behind the premiumFonts feature flag)
const PREMIUM_FONT_VALUES = ["'Lora', serif", "'Comic Neue', cursive"];

/**
 * Pages produced per set, given the selected page types and config.
 * A crossword with "clues on separate page" produces 2 pages; everything
 * else is 1 page each. This is the unit we meter for PDF monetisation.
 */
function pagesPerSet(selectedPages) {
  return selectedPages.length;
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
    const totalPages = pagesPerSet(selectedPages) * (Number.isFinite(count) && count > 0 ? count : 1);
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

        // Teacher keys are pulled out of the student packet and appended after
        // every set (see the appendix below); `keysAtEnd` off restores the old
        // inline behaviour for anyone printing single-sided.
        const keysAtEnd = cfg.keysAtEnd !== false;
        const duplexSafe = cfg.duplexSafe !== false;
        const wantKey = selectedPages.includes('key');
        const studentPages = keysAtEnd ? selectedPages.filter(p => p !== 'key') : selectedPages;
        const keyQueue = [];

        let isFirstPage = true;
        // Footers are drawn after every set is laid out, because a set's page
        // count is not known until it has been drawn (a crossword that has to
        // split costs one sheet more). Each entry records the sheet it belongs
        // to and which set it came from; see the footer pass below.
        const footerQueue = [];
        // Crossword topologies already used, so two students in the same class
        // set never get the identical grid.
        const usedTopologies = new Set();

        for (let i = 0; i < count; i++) {
            if (T) T.innerText = `Generating Set ${i + 1}/${count}`;
            if (B) B.style.width = Math.round((i / count) * 100) + '%';
            await new Promise(r => setTimeout(r, 10));

            // A distinct seed per set is what makes the sets differ at all;
            // re-rolling on a repeat is the safety net behind it.
            let cpd = null, attempts = 0;
            while (!cpd && attempts < 3) {
                cpd = await createPuzzleData(_setSeed(i, attempts));
                attempts++;
            }
            if (!cpd) { showToast('Puzzle generation failed. Try again.', 'error'); break; }

            if (cpd.cw?.signature) {
                let reroll = 0;
                while (usedTopologies.has(cpd.cw.signature) && reroll < 3) {
                    const retry = await createPuzzleData(_setSeed(i, 10 + reroll));
                    if (!retry) break;
                    cpd = retry;
                    reroll++;
                }
                // Still a repeat: transpose it. Across becomes down, which is
                // the only rigid transform that leaves every word readable.
                if (usedTopologies.has(cpd.cw.signature)) {
                    cpd.cw = transposeCrossword(cpd.cw);
                }
                usedTopologies.add(cpd.cw.signature);
            }

            // The set identifier is shown on EVERY export, single or bulk.
            // A teacher holding a marked sheet and an answer key has no other
            // way to tell which generated set they belong to.
            const setIndicator = `SET ${i + 1}`;
            let pageInSet = 0;

            const addPage = () => {
                if (!isFirstPage) doc.addPage();
                isFirstPage = false;
                ctx.drawWatermark();
                pageInSet++;
                return pageInSet === 1;
            };
            const queueFooter = (ps, right) => {
                footerQueue.push({
                    page: doc.internal.getNumberOfPages(),
                    setIdx: i, pageInSet, pScale: ps, right,
                    setLabel: `Set ${i + 1}`,
                });
            };

            for (const pType of studentPages) {
                // Yield to main thread so progress bar updates and browser does not crash
                await new Promise(r => setTimeout(r, 0));

                const isMatchingMode = !!cfg.notesConfig?.shuffle;
                const meta = metaFor(pType, isMatchingMode);
                const contentBox = (sy) => ({
                    x: MARGIN, y: sy,
                    w: PAGE_WIDTH - 2 * MARGIN,
                    h: PAGE_HEIGHT - sy - MARGIN - FOOTER_H,
                });

                if (pType === 'notes') {
                    const ps = getPScale('notes');
                    const firstOfSet = addPage();
                    const sy = drawHeader(ctx, title, sub, instructionFor('notes', isMatchingMode),
                        false, setIndicator, ps, { ...meta, firstOfSet });
                    drawNotes(ctx, cpd.notes, sy, ps);
                    queueFooter(ps, meta.label);

                } else if (pType === 'ws') {
                    const ps = getPScale('ws');
                    const firstOfSet = addPage();
                    const sy = drawHeader(ctx, title, sub, instructionFor('ws'),
                        false, setIndicator, ps, { ...meta, firstOfSet });
                    drawWordSearch(ctx, cpd.ws, contentBox(sy), state.words, cfg.wsUseClues, false, ps);
                    queueFooter(ps, meta.label);

                } else if (pType === 'cw') {
                    const ps = getPScale('cw');
                    const firstOfSet = addPage();
                    const sy = drawHeader(ctx, title, sub, instructionFor('cw'),
                        false, setIndicator, ps, { ...meta, firstOfSet });
                    // Grid and clues always share one sheet. Splitting them put
                    // the grid on the back of one sheet and its clues on the
                    // front of the next, so a student flipped paper for every
                    // clue; the extra page also made the packet odd-length.
                    const res = drawCrosswordPage(ctx, cpd.cw, contentBox(sy), ps, false);
                    queueFooter(ps, meta.label);
                    if (res.splitNeeded) {
                        // Only reachable when a puzzle genuinely cannot fit at
                        // the minimum cell size — not a teacher-facing option.
                        const cluesFirst = addPage();
                        const cluesSy = drawHeader(ctx, title, sub, 'Clues for the grid on the previous page.',
                            false, setIndicator, ps, { ...meta, firstOfSet: cluesFirst });
                        drawCrosswordClues(ctx, cpd.cw, cluesSy, ps);
                        queueFooter(ps, 'CROSSWORD CLUES');
                    }

                } else if (pType === 'scr') {
                    const ps = getPScale('scr');
                    const firstOfSet = addPage();
                    const sy = drawHeader(ctx, title, sub, instructionFor('scr'),
                        false, setIndicator, ps, { ...meta, firstOfSet });
                    drawScramble(ctx, cpd.scr, contentBox(sy), false, scrShowHint, ps);
                    queueFooter(ps, meta.label);

                } else if (pType === 'key') {
                    const ps = getPScale('key');
                    addPage();
                    drawMasterKeyPage(ctx, title, sub, cpd, selections, ps);
                    queueFooter(ps, 'TEACHER KEY');
                }
            }

            // ---- Duplex padding ----
            // A class set is printed double-sided. An odd-length student
            // packet puts the last page of one student's work on the same
            // physical sheet as the first page of the next student's — and,
            // when keys follow, on the back of an answer key. Pad to an even
            // count so every set begins on a fresh sheet.
            if (duplexSafe && pageInSet > 0 && pageInSet % 2 === 1) {
                const ps = getPScale('notes');
                addPage();
                drawBlankFiller(ctx, ps);
                queueFooter(ps, '');
            }

            if (wantKey && keysAtEnd) keyQueue.push({ cpd, setIdx: i });
        }

        // ---- Answer-key appendix ----
        // Keys never sit inside a student packet: on a duplex print the key
        // would come out on the back of the sheet the student is holding.
        keyQueue.forEach((entry, k) => {
            const ps = getPScale('key');
            if (!isFirstPage) doc.addPage();
            isFirstPage = false;
            ctx.drawWatermark();
            const setLabel = `Set ${entry.setIdx + 1}`;
            drawMasterKeyPage(ctx, title, sub, entry.cpd, selections, ps, setLabel);
            footerQueue.push({
                page: doc.internal.getNumberOfPages(),
                setIdx: -1, pageInSet: 0, pScale: ps, right: 'TEACHER KEY',
                setLabel: '',
                pageText: keyQueue.length > 1
                    ? `Set ${entry.setIdx + 1} — Answer key ${k + 1} of ${keyQueue.length}`
                    : `Set ${entry.setIdx + 1} — Answer key`,
            });
        });

        // ---- Footer pass: now every set's true page count is known ----
        const setTotals = footerQueue.reduce((acc, f) => {
            acc[f.setIdx] = Math.max(acc[f.setIdx] || 0, f.pageInSet);
            return acc;
        }, {});
        footerQueue.forEach(f => {
            doc.setPage(f.page);
            drawFooter(ctx, f.pScale, {
                right: f.right, setLabel: f.setLabel, pageText: f.pageText,
                pageInSet: f.pageInSet, pagesInSet: setTotals[f.setIdx],
            });
        });

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
