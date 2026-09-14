// =============================================================
// pdf/pdfHelpers.js — Shared helpers used by all PDF draw modules
// =============================================================
import { drawIcon } from './pdfIcons.js';
// These functions are called with a bound `ctx` object that
// carries { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale,
//           mmToPt, pdfFont, wmImg, drawWatermark }

// -------------------------------------------------------------
// Shared palette — one accent language across every page so that
// "this is the worked example" always looks the same to a student.
// -------------------------------------------------------------
export const PALETTE = {
    ink:        [15, 23, 42],    // primary text
    body:       [51, 65, 85],    // secondary/body text
    muted:      [100, 116, 139], // labels, captions
    rule:       [203, 213, 225], // hairline rules
    band:       [248, 250, 252], // zebra banding
    example:    [37, 99, 235],   // the single example accent (blue)
    exampleBg:  [219, 234, 254],
    key:        [220, 20, 60],   // teacher-key accent (crimson)
    keyBg:      [254, 226, 226],
};

// -------------------------------------------------------------
// Font-style safety
// -------------------------------------------------------------
// Custom fonts are registered by pdfFonts.js in `normal` and `bold`
// only. Asking jsPDF for a style a font does not have makes it fall
// back to *Times* — which is why an Inter title used to sit above a
// Times-italic subtitle. resolveStyle() keeps us inside the family.
const _styleCache = new Map();

export function hasFontStyle(doc, font, style) {
    const cacheKey = `${font}|${style}`;
    if (_styleCache.has(cacheKey)) return _styleCache.get(cacheKey);
    let ok = false;
    try {
        const list = doc.getFontList() || {};
        const styles = list[font] || list[String(font).toLowerCase()] || [];
        ok = styles.indexOf(style) !== -1;
    } catch (_) { ok = false; }
    _styleCache.set(cacheKey, ok);
    return ok;
}

/** Best available style within `font` for the requested one. */
export function resolveStyle(doc, font, wanted) {
    if (hasFontStyle(doc, font, wanted)) return wanted;
    const fallbacks = {
        bolditalic: ['bold', 'italic', 'normal'],
        italic:     ['normal', 'bold'],
        bold:       ['normal'],
        normal:     ['normal'],
    };
    for (const f of (fallbacks[wanted] || ['normal'])) {
        if (hasFontStyle(doc, font, f)) return f;
    }
    return 'normal';
}

/** setFont() that never silently escapes the chosen family. */
export function setFontSafe(doc, font, style) {
    doc.setFont(font, resolveStyle(doc, font, style));
}

// -------------------------------------------------------------
// Vector primitives shared by puzzle + key renderers
// -------------------------------------------------------------

/**
 * Stadium ("capsule") outline running from the centre of one cell to
 * the centre of another — used to ring a word in a word-search grid.
 * Built as a real polygon so it can be stroked without painting over
 * grid lines or letters.
 *
 * @param {Object} doc
 * @param {number} x1,y1 - centre of the first cell (mm)
 * @param {number} x2,y2 - centre of the last cell (mm)
 * @param {number} r     - capsule radius (mm)
 * @param {Object} opts  - { stroke:[r,g,b], fill:[r,g,b]|null, lineWidth }
 */
export function drawCapsule(doc, x1, y1, x2, y2, r, { stroke = PALETTE.key, fill = null, lineWidth = 0.5 } = {}) {
    const theta = Math.atan2(y2 - y1, x2 - x1);
    const STEPS = 10;
    const pts = [];
    // Arc around the far end, then back around the near end.
    for (let i = 0; i <= STEPS; i++) {
        const a = theta - Math.PI / 2 + (Math.PI * i) / STEPS;
        pts.push([x2 + r * Math.cos(a), y2 + r * Math.sin(a)]);
    }
    for (let i = 0; i <= STEPS; i++) {
        const a = theta + Math.PI / 2 + (Math.PI * i) / STEPS;
        pts.push([x1 + r * Math.cos(a), y1 + r * Math.sin(a)]);
    }
    const deltas = [];
    for (let i = 1; i < pts.length; i++) {
        deltas.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
    }
    if (fill) doc.setFillColor(...fill);
    doc.setDrawColor(...stroke);
    doc.setLineWidth(lineWidth);
    doc.lines(deltas, pts[0][0], pts[0][1], [1, 1], fill ? 'FD' : 'S', true);
}

/**
 * The one and only "this row is the worked example" marker.
 * A small filled pill reading EXAMPLE, drawn at (x, y) where y is the
 * text baseline of the row it annotates.
 *
 * @returns {number} width consumed in mm (0 if it could not be drawn)
 */
export function drawExamplePill(doc, x, y, { pScale = 1, pdfFont = 'helvetica', align = 'left', label = 'EXAMPLE' } = {}) {
    const fs = Math.max(5.5, 6.5 * pScale);
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(fs);
    const textW = doc.getTextWidth(label);
    const padX = 1.6, h = fs * 0.48 + 1.2;
    const w = textW + padX * 2;
    const bx = align === 'right' ? x - w : x;
    const by = y - h + 0.9;
    doc.setFillColor(...PALETTE.exampleBg);
    doc.setDrawColor(...PALETTE.example);
    doc.setLineWidth(0.2);
    doc.roundedRect(bx, by, w, h, h / 2, h / 2, 'FD');
    doc.setTextColor(...PALETTE.example);
    doc.text(label, bx + padX, y - 0.4);
    return w;
}

/** Width the EXAMPLE pill will occupy, so callers can reserve room for it. */
export function examplePillWidth(doc, { pScale = 1, pdfFont = 'helvetica', label = 'EXAMPLE' } = {}) {
    const fs = Math.max(5.5, 6.5 * pScale);
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(fs);
    return doc.getTextWidth(label) + 3.2;
}

/**
 * Where the EXAMPLE pill can sit without landing on the text it annotates.
 *
 * Callers reserve `examplePillWidth()` when they wrap, which normally leaves
 * room at the end of the last line. When it does not — a long unbroken word,
 * or a row that also echoes its term — the pill drops onto a line of its own
 * rather than being clamped back over the words, which is what produced
 * "mathemat[EXAMPLE]ene Descartes".
 *
 * @param {number} boxX,boxW    - the text column the pill must stay inside
 * @param {number} textEndX     - right edge of the last line of text
 * @param {number} baselineY    - baseline of that last line
 * @param {number} lineH        - one line of leading, for the fallback
 * @returns {{x:number, y:number, ownLine:boolean, w:number}}
 */
export function placeExamplePill(doc, {
    boxX, boxW, textEndX, baselineY, lineH,
    pScale = 1, pdfFont = 'helvetica', gap = 2,
} = {}) {
    const w = examplePillWidth(doc, { pScale, pdfFont });
    const inlineX = textEndX + gap;
    if (inlineX + w <= boxX + boxW + 0.01) {
        return { x: inlineX, y: baselineY, ownLine: false, w };
    }
    return { x: boxX, y: baselineY + lineH, ownLine: true, w };
}

/** Dotted leader between two x positions — ties a term to its answer. */
export function drawLeader(doc, x1, x2, y, { color = PALETTE.rule, lineWidth = 0.25 } = {}) {
    if (x2 - x1 < 2) return;
    doc.setDrawColor(...color);
    doc.setLineWidth(lineWidth);
    doc.setLineDashPattern([0.6, 1.1], 0);
    doc.line(x1, y, x2, y);
    doc.setLineDashPattern([], 0);
}

/**
 * Ruled writing area — what the layout engine does with space it cannot
 * fill by growing type. A short word list leaves half a sheet blank;
 * turning that into lined space for working out is more useful to a
 * class than 30pt vocabulary.
 *
 * @returns {boolean} whether anything was drawn
 */
export function drawRuledArea(doc, x, y, w, h, { pScale = 1, pdfFont = 'helvetica', label = 'NOTES', lineGap = 9 } = {}) {
    const gap = lineGap * pScale;
    if (h < gap * 2.5) return false;

    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(Math.max(7, 8 * pScale));
    doc.setTextColor(...PALETTE.muted);
    doc.setCharSpace(0.4);
    doc.text(label, x, y);
    doc.setCharSpace(0);

    doc.setDrawColor(...PALETTE.rule);
    doc.setLineWidth(0.2);
    let ly = y + gap * 0.6;
    while (ly <= y + h - gap * 0.4) {
        doc.line(x, ly, x + w, ly);
        ly += gap;
    }
    return true;
}

/**
 * Page-budgeting helper: given the natural height of a block and the
 * height available, return the scale factor to apply (never above
 * `max`) plus the vertical offset that centres any leftover space.
 * Keeps short worksheets from dumping 35% whitespace at the bottom.
 */
export function fitBlock(naturalH, availH, { min = 0.72, max = 1.6 } = {}) {
    if (!(naturalH > 0) || !(availH > 0)) return { k: 1, offset: 0 };
    let k = availH / naturalH;
    k = Math.max(min, Math.min(max, k));
    const used = naturalH * k;
    return { k, offset: Math.max(0, (availH - used) / 2) };
}

// =============================================================
// Context
// =============================================================

/**
 * Build a context object passed to all draw functions.
 * This avoids passing 10+ arguments to every drawer.
 */
export function buildCtx(doc, pdfFont, wmImg, scale, { PAGE_WIDTH, PAGE_HEIGHT, MARGIN }, settings = {}) {
    const mmToPt = mm => mm * 2.83465;

    const drawWatermark = () => {
        if (!wmImg) return;
        const opac = settings.wmOpacity !== undefined
            ? settings.wmOpacity
            : (parseFloat(document.documentElement.style.getPropertyValue('--wm-opacity')) || 0.15);
        doc.setGState(new doc.GState({ opacity: opac }));
        const imgRatio = wmImg.width / wmImg.height;
        let w = 150, h = w / imgRatio;
        if (h > 200) { h = 200; w = h * imgRatio; }
        doc.addImage(wmImg, 'PNG', (PAGE_WIDTH - w) / 2, (PAGE_HEIGHT - h) / 2, w, h);
        doc.setGState(new doc.GState({ opacity: 1 }));
    };

    return {
        doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale, mmToPt, pdfFont, wmImg, drawWatermark,
        notesConfig: settings.notesConfig || { showTerm: true, showDef: true },
        wsInternalGrid: settings.wsInternalGrid || false,
        titleScale: settings.titleScale || 1,
        showExample: settings.showExample || false,
        // Difficulty scaffolding toggles
        showLetterCount: settings.showLetterCount !== false,
        cwShowBank: settings.cwShowBank || false,
        scrShowBank: settings.scrShowBank !== false,
        title: settings.title || '',
    };
}

// =============================================================
// Emoji helpers
// =============================================================

/** Returns true if the string contains any emoji characters. */
function hasEmoji(str) {
    return /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(str);
}

const _imgCache = new Map();

/**
 * Render text (with emoji) to a PNG via HTML canvas.
 * Returns { url, widthMm, heightMm } where the bottom edge of the
 * returned image aligns with the typographic baseline.
 */
function textToImgPDF(text, { fontSizePt, bold = false, italic = false, color = [0, 0, 0] }) {
    const cacheKey = `${text}|${fontSizePt}|${bold}|${italic}|${color.join(',')}`;
    if (_imgCache.has(cacheKey)) return _imgCache.get(cacheKey);
    try {
        const SCALE = 3;           // 3× canvas resolution for sharpness
        const ptToPx = 96 / 72;   // 1 pt = 1.333 px at 96 dpi
        const pxSize = fontSizePt * ptToPx * SCALE;
        const lineH = Math.ceil(pxSize * 1.4);

        const canvas = document.createElement('canvas');
        canvas.width = 3000;
        canvas.height = lineH;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const weight = bold ? 'bold' : 'normal';
        const style  = italic ? 'italic' : 'normal';
        ctx.font = `${style} ${weight} ${pxSize}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = `rgb(${color.join(',')})`;
        ctx.textBaseline = 'bottom';
        ctx.fillText(text, 0, lineH);

        const w = Math.min(Math.ceil(ctx.measureText(text).width) + 4, 3000);

        // Crop to actual text width
        const crop = document.createElement('canvas');
        crop.width = w;
        crop.height = lineH;
        crop.getContext('2d').drawImage(canvas, 0, 0);

        const mmPerPx = 25.4 / (96 * SCALE);
        const out = {
            url: crop.toDataURL('image/png'),
            widthMm: w * mmPerPx,
            heightMm: lineH * mmPerPx,
        };
        _imgCache.set(cacheKey, out);
        return out;
    } catch (_) {
        return null;
    }
}

/**
 * Width in mm that drawText() will occupy — emoji aware.
 */
export function measureTextMm(doc, text, { fontSizePt, bold = false, italic = false, pdfFont = 'helvetica' }) {
    if (!text) return 0;
    if (hasEmoji(text)) {
        const img = textToImgPDF(text, { fontSizePt, bold, italic, color: [0, 0, 0] });
        if (img) return img.widthMm;
    }
    setFontSafe(doc, pdfFont, italic ? (bold ? 'bolditalic' : 'italic') : (bold ? 'bold' : 'normal'));
    doc.setFontSize(fontSizePt);
    return doc.getTextWidth(text);
}

/**
 * Draw text at (x, y) where y is the baseline.
 * Falls back to canvas image if text contains emoji.
 * @returns {number} width drawn, in mm
 */
function drawText(doc, text, x, y, { fontSizePt, bold = false, italic = false, color = [0, 0, 0], pdfFont = 'helvetica', align = 'left' }) {
    if (!text) return 0;

    if (hasEmoji(text)) {
        const img = textToImgPDF(text, { fontSizePt, bold, italic, color });
        if (img) {
            const imgX = align === 'right' ? x - img.widthMm : x;
            // Position image so its bottom edge (= canvas textBaseline 'bottom') aligns with PDF baseline y
            doc.addImage(img.url, 'PNG', imgX, y - img.heightMm, img.widthMm, img.heightMm);
            return img.widthMm;
        }
        // Canvas unavailable — strip emoji and fall through to doc.text
        text = text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]️?⃣?(‍[\p{Emoji_Presentation}\p{Extended_Pictographic}]️?)*\s*/gu, '').trim();
        if (!text) return 0;
    }
    {
        // resolveStyle keeps us inside the selected family instead of
        // letting jsPDF silently substitute Times for a missing italic.
        setFontSafe(doc, pdfFont, italic ? (bold ? 'bolditalic' : 'italic') : (bold ? 'bold' : 'normal'));
        doc.setFontSize(fontSizePt);
        doc.setTextColor(...color);
        doc.text(text, x, y, { align });
        return doc.getTextWidth(text);
    }
}

export { drawText };

// =============================================================
// Page header / footer
// =============================================================

/**
 * A row of labelled rules — "NAME: ______  DATE: ______  CLASS: ______".
 *
 * Each field gets an equal share of the row and its rule runs from just after
 * its own label to the end of that share, so the underlines are the same
 * length whatever the labels are. Rules, not underscore characters, so they
 * stay flush at any type size.
 */
function _formRow(ctx, labels, x, width, y, pScale) {
    const { doc, pdfFont } = ctx;
    const GAP = 6;
    const cell = (width - GAP * (labels.length - 1)) / labels.length;
    setFontSafe(doc, pdfFont, 'bold');
    doc.setFontSize(9.5 * pScale);
    // Every rule starts the same distance into its cell, measured from the
    // widest label, so all three come out exactly the same length. Starting
    // each rule straight after its own label is what left NAME and DATE
    // sitting above visibly different underlines.
    const labelColW = labels.reduce((m, l) => Math.max(m, doc.getTextWidth(l)), 0) + 2.5;
    labels.forEach((label, i) => {
        const lx = x + i * (cell + GAP);
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(9.5 * pScale);
        doc.setTextColor(...PALETTE.muted);
        doc.text(label, lx, y);
        doc.setDrawColor(180);
        doc.setLineWidth(0.4);
        doc.line(lx + labelColW, y + 1, lx + cell, y + 1);
    });
}

/**
 * Draw the standard page header.
 *
 * Every page uses the same two-tier grid, so nothing jumps position when a
 * student turns the sheet over:
 *
 *   LINEAR RELATIONSHIPS                                   SET 3
 *   Year 8 Mathematics — Unit 4
 *   ────────────────────────────────────────────────────────────
 *   NAME: ________  DATE: ________  CLASS: ________
 *   [CROSSWORD] Use the clues to fill in the grid.
 *
 * Sheet one of a set carries all three fields; the rest of the packet gets a
 * single full-width NAME rule (a student fills the block in once per packet),
 * and the answer key gets a bold accent banner instead.
 *
 * Typography is deliberately single-family: the title, subtitle and
 * instruction all resolve through resolveStyle() so a custom font with no
 * italic face can no longer drag the subtitle into Times.
 *
 * @param {Object} opts - { label, accent, icon, firstOfSet }
 * @returns {number} Y position where content should start (below header)
 */
export function drawHeader(ctx, fullTitle, subText, instructions, isKey, setIndicator = '', pScale, opts = {}) {
    const { doc, PAGE_WIDTH, MARGIN, scale, pdfFont } = ctx;
    pScale = pScale || scale;
    const titleScale = ctx.titleScale || 1;
    const accent = opts.accent || PALETTE.ink;
    const firstOfSet = opts.firstOfSet !== false;
    const slim = !isKey && !firstOfSet;
    const contentW = PAGE_WIDTH - 2 * MARGIN;
    const endX = PAGE_WIDTH - MARGIN;

    // The set badge sits at the far right of the title line on EVERY page,
    // including the key — it used to hide in the top margin on some pages and
    // inside the NAME row on others, so the eye lost it when turning over.
    const badge = isKey ? 'TEACHER ANSWER KEY' : setIndicator;
    const badgeFs = isKey ? 11 * pScale : 9 * pScale;
    let badgeW = 0;
    if (badge) {
        badgeW = measureTextMm(doc, badge, { fontSizePt: badgeFs, bold: true, pdfFont }) + 5;
    }
    const headW = Math.max(40, contentW - badgeW);

    const fitPt = (text, startPt, minPt, bold) => {
        const w = measureTextMm(doc, text, { fontSizePt: startPt, bold, pdfFont });
        if (w <= headW || w <= 0) return startPt;
        return Math.max(minPt, startPt * (headW / w));
    };

    // ---- Tier 1: title, subtitle, set badge ----
    const titleY = MARGIN + (slim ? 6 : 9) * pScale;
    const titleText = fullTitle.toUpperCase();
    drawText(doc, titleText, MARGIN, titleY, {
        fontSizePt: fitPt(titleText, (slim ? 13 : 26) * pScale * titleScale, (slim ? 9 : 13) * pScale, true),
        bold: true,
        color: PALETTE.ink,
        pdfFont,
    });
    if (badge) {
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(badgeFs);
        doc.setTextColor(...(isKey ? PALETTE.key : [99, 102, 241]));
        doc.text(badge, endX, titleY, { align: 'right' });
    }

    // The running header drops the subtitle: it is already on sheet one.
    if (!slim) {
        doc.setCharSpace(0.25);
        drawText(doc, subText, MARGIN, MARGIN + 15 * pScale, {
            fontSizePt: fitPt(subText, 10.5 * pScale * titleScale, 7.5 * pScale, false),
            color: PALETTE.muted,
            pdfFont,
        });
        doc.setCharSpace(0);
    }

    // ---- Divider ----
    const dividerY = MARGIN + (slim ? 10 : 19) * pScale;
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, dividerY, endX, dividerY);

    // ---- Tier 2: the student input row, below the rule on every page ----
    const formY = dividerY + 7 * pScale;
    if (isKey) {
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(10 * pScale);
        doc.setTextColor(...PALETTE.key);
        doc.text(setIndicator
            ? `TEACHER ANSWER KEY — ${setIndicator.toUpperCase()}`
            : 'TEACHER ANSWER KEY', MARGIN, formY);
    } else if (slim) {
        _formRow(ctx, ['NAME:'], MARGIN, contentW, formY, pScale);
    } else {
        _formRow(ctx, ['NAME:', 'DATE:', 'CLASS:'], MARGIN, contentW, formY, pScale);
    }

    // ---- Activity chip + instruction ----
    const instrY = formY + 9 * pScale;
    let textX = MARGIN;
    if (opts.label) {
        const chipFs = Math.max(6.5, 8 * pScale);
        const chipTextW = measureTextMm(doc, opts.label, { fontSizePt: chipFs, bold: true, pdfFont });
        const padX = 2.2, chipH = chipFs * 0.52 + 2.2;
        const chipW = chipTextW + padX * 2;
        const chipY = instrY - chipH + 1.4;
        doc.setFillColor(accent[0], accent[1], accent[2]);
        doc.roundedRect(MARGIN, chipY, chipW, chipH, chipH / 2, chipH / 2, 'F');
        drawText(doc, opts.label, MARGIN + padX, instrY, {
            fontSizePt: chipFs, bold: true, color: [255, 255, 255], pdfFont,
        });
        textX = MARGIN + chipW + 3;
    }
    // A vector icon instead of a system emoji: sharp at any print resolution.
    if (opts.icon) {
        const iconSize = 3.6 * pScale;
        const drawn = drawIcon(doc, opts.icon, textX, instrY, iconSize, accent);
        if (drawn) textX += drawn + 1.8;
    }
    drawText(doc, instructions, textX, instrY, {
        fontSizePt: 9.5 * pScale,
        color: PALETTE.muted,
        pdfFont,
    });

    return instrY + 9 * pScale;
}

/**
 * The back of a duplex sheet that would otherwise carry the next student's
 * first page (or a teacher key). Deliberately almost empty, and deliberately
 * labelled: a silently blank sheet reads as a printer fault.
 */
export function drawBlankFiller(ctx, pScale) {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, pdfFont } = ctx;
    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(Math.max(7, 8 * (pScale || 1)));
    doc.setTextColor(...PALETTE.rule);
    doc.text('This page is intentionally blank.', PAGE_WIDTH / 2, PAGE_HEIGHT / 2,
        { align: 'center' });
    doc.setTextColor(...PALETTE.ink);
}

/**
 * Thin running footer — lets a teacher collate a printed class set.
 *
 * Pagination is per set, not per document. A teacher printing 25 sets used
 * to hand the tenth student sheets numbered "Page 37" to "Page 40"; the
 * numbers now restart with every set, so a packet reads "Set 10 — Page 1 of
 * 4" and a student can tell at a glance whether their packet is complete.
 *
 * @param {Object} opts - { right, setLabel, pageInSet, pagesInSet }
 */
export function drawFooter(ctx, pScale, {
    right = '', setLabel = '', pageInSet = 0, pagesInSet = 0, pageText = '',
} = {}) {
    const { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, pdfFont, title } = ctx;
    const y = PAGE_HEIGHT - MARGIN + 6;
    doc.setDrawColor(...PALETTE.rule);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y - 3.5, PAGE_WIDTH - MARGIN, y - 3.5);
    setFontSafe(doc, pdfFont, 'normal');
    doc.setFontSize(Math.max(6, 7 * (pScale || 1)));
    doc.setTextColor(...PALETTE.muted);
    if (title) doc.text(String(title), MARGIN, y);

    let pageNo = '';
    if (pageText) {
        // An appendix page belongs to no student packet, so it names itself.
        pageNo = pageText;
    } else if (pageInSet > 0 && pagesInSet > 0) {
        pageNo = `Page ${pageInSet} of ${pagesInSet}`;
        if (setLabel) pageNo = `${setLabel} — ${pageNo}`;
    } else {
        // No set context supplied (a one-off page): fall back to the sheet
        // number, which is at least honest about being document-wide.
        try { pageNo = `Page ${doc.internal.getNumberOfPages()}`; } catch (_) { }
    }
    const rightText = [right, pageNo].filter(Boolean).join('  ·  ');
    if (rightText) doc.text(rightText, PAGE_WIDTH - MARGIN, y, { align: 'right' });
}
