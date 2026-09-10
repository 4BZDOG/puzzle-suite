// =============================================================
// pdf/pdfHelpers.js — Shared helpers used by all PDF draw modules
// =============================================================
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
 * Draw the standard page header (title, subtitle, divider, activity chip,
 * instructions, name/date lines).
 *
 * Typography is deliberately single-family: the title, subtitle and
 * instruction all resolve through resolveStyle() so a custom font with no
 * italic face can no longer drag the subtitle into Times.
 *
 * @param {Object} opts - { label, accent } activity chip content
 * @returns {number} Y position where content should start (below header)
 */
export function drawHeader(ctx, fullTitle, subText, instructions, isKey, setIndicator = '', pScale, opts = {}) {
    const { doc, PAGE_WIDTH, MARGIN, scale, pdfFont } = ctx;
    pScale = pScale || scale;
    const titleScale = ctx.titleScale || 1;
    const accent = opts.accent || PALETTE.ink;

    // The right-hand block (NAME/DATE, or the key stamp) owns fixed space,
    // so the title has to be fitted to what is left — a real unit name like
    // "Linear Relationships & Coordinate Geometry" used to run straight
    // through the NAME rule at a hardcoded 28pt.
    const keyStampW = isKey
        ? measureTextMm(doc, 'TEACHER ANSWER KEY', { fontSizePt: 12 * pScale, bold: true, pdfFont }) + 6
        : 92;
    const headW = Math.max(40, PAGE_WIDTH - MARGIN - keyStampW - MARGIN * 0.2);

    const fitPt = (text, startPt, minPt, bold) => {
        const w = measureTextMm(doc, text, { fontSizePt: startPt, bold, pdfFont });
        if (w <= headW || w <= 0) return startPt;
        return Math.max(minPt, startPt * (headW / w));
    };

    // Title
    const titleText = fullTitle.toUpperCase();
    drawText(doc, titleText, MARGIN, MARGIN + 10 * pScale, {
        fontSizePt: fitPt(titleText, 28 * pScale * titleScale, 13 * pScale, true),
        bold: true,
        color: PALETTE.ink,
        pdfFont,
    });

    // Subtitle — same family, tracked out slightly instead of italicised
    doc.setCharSpace(0.25);
    drawText(doc, subText, MARGIN, MARGIN + 18 * pScale, {
        fontSizePt: fitPt(subText, 10.5 * pScale * titleScale, 7.5 * pScale, false),
        color: PALETTE.muted,
        pdfFont,
    });
    doc.setCharSpace(0);

    // Right-side metadata
    if (isKey) {
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(12 * pScale);
        doc.setTextColor(...PALETTE.key);
        doc.text('TEACHER ANSWER KEY', PAGE_WIDTH - MARGIN, MARGIN + 10 * pScale, { align: 'right' });
    } else {
        if (setIndicator) {
            setFontSafe(doc, pdfFont, 'bold');
            doc.setFontSize(9 * pScale);
            doc.setTextColor(99, 102, 241);
            doc.text(setIndicator, PAGE_WIDTH - MARGIN, MARGIN + 4 * pScale, { align: 'right' });
        }
        const fieldLabelX = PAGE_WIDTH - 90;
        const fieldLineStart = PAGE_WIDTH - 72;
        setFontSafe(doc, pdfFont, 'bold');
        doc.setFontSize(10 * pScale);
        doc.setTextColor(...PALETTE.muted);
        doc.text('NAME:', fieldLabelX, MARGIN + 8 * pScale);
        doc.setDrawColor(180);
        doc.setLineWidth(0.4);
        doc.line(fieldLineStart, MARGIN + 9 * pScale, PAGE_WIDTH - MARGIN, MARGIN + 9 * pScale);
        doc.text('DATE:', fieldLabelX, MARGIN + 18 * pScale);
        doc.line(fieldLineStart, MARGIN + 19 * pScale, PAGE_WIDTH - MARGIN, MARGIN + 19 * pScale);
    }

    // Divider line (above the instructions)
    doc.setDrawColor(...PALETTE.ink);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, MARGIN + 22 * pScale, PAGE_WIDTH - MARGIN, MARGIN + 22 * pScale);

    // Activity chip + instruction sentence
    const instrY = MARGIN + 29 * pScale;
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
    drawText(doc, instructions, textX, instrY, {
        fontSizePt: 9.5 * pScale,
        color: PALETTE.muted,
        pdfFont,
    });

    return MARGIN + 38 * pScale;
}

/**
 * Thin running footer — lets a teacher collate a printed class set.
 */
export function drawFooter(ctx, pScale, { right = '' } = {}) {
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
    try { pageNo = `Page ${doc.internal.getNumberOfPages()}`; } catch (_) { }
    const rightText = [right, pageNo].filter(Boolean).join('  ·  ');
    if (rightText) doc.text(rightText, PAGE_WIDTH - MARGIN, y, { align: 'right' });
}
