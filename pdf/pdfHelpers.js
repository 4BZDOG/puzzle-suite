// =============================================================
// pdf/pdfHelpers.js — Shared helpers used by all PDF draw modules
// =============================================================
// These functions are called with a bound `ctx` object that
// carries { doc, PAGE_WIDTH, PAGE_HEIGHT, MARGIN, scale,
//           mmToPt, pdfFont, wmImg, drawWatermark }

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
    };
}

// =============================================================
// Emoji helpers
// =============================================================

/** Returns true if the string contains any emoji characters. */
function hasEmoji(str) {
    return /\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(str);
}

/**
 * Render text (with emoji) to a PNG via HTML canvas.
 * Returns { url, widthMm, heightMm } where the bottom edge of the
 * returned image aligns with the typographic baseline.
 */
function textToImgPDF(text, { fontSizePt, bold = false, italic = false, color = [0, 0, 0] }) {
    const SCALE = 3;           // 3× canvas resolution for sharpness
    const ptToPx = 96 / 72;   // 1 pt = 1.333 px at 96 dpi
    const pxSize = fontSizePt * ptToPx * SCALE;
    const lineH = Math.ceil(pxSize * 1.4);

    const canvas = document.createElement('canvas');
    canvas.width = 3000;
    canvas.height = lineH;
    const ctx = canvas.getContext('2d');

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
    return {
        url: crop.toDataURL('image/png'),
        widthMm: w * mmPerPx,
        heightMm: lineH * mmPerPx,
    };
}

/**
 * Draw text at (x, y) where y is the baseline.
 * Falls back to canvas image if text contains emoji.
 */
function drawText(doc, text, x, y, { fontSizePt, bold = false, italic = false, color = [0, 0, 0], pdfFont = 'helvetica', align = 'left' }) {
    if (!text) return;

    if (hasEmoji(text)) {
        const img = textToImgPDF(text, { fontSizePt, bold, italic, color });
        const imgX = align === 'right' ? x - img.widthMm : x;
        // Position image so its bottom edge (= canvas textBaseline 'bottom') aligns with PDF baseline y
        doc.addImage(img.url, 'PNG', imgX, y - img.heightMm, img.widthMm, img.heightMm);
    } else {
        doc.setFont(pdfFont, italic ? (bold ? 'bolditalic' : 'italic') : (bold ? 'bold' : 'normal'));
        doc.setFontSize(fontSizePt);
        doc.setTextColor(...color);
        doc.text(text, x, y, { align });
    }
}

// =============================================================
// Page header
// =============================================================

/**
 * Draw the standard page header (title, subtitle, divider, instructions, name/date lines).
 * Layout (y positions relative to top of page):
 *   MARGIN + 10*pScale  → title baseline
 *   MARGIN + 18*pScale  → subtitle baseline
 *   MARGIN + 22*scale   → divider line
 *   MARGIN + 29*pScale  → instruction text baseline (below divider)
 * @returns {number} Y position where content should start (below header)
 */
export function drawHeader(ctx, fullTitle, subText, instructions, isKey, setIndicator = '', pScale) {
    const { doc, PAGE_WIDTH, MARGIN, scale, pdfFont } = ctx;
    pScale = pScale || scale;
    const titleScale = ctx.titleScale || 1;

    // Title
    drawText(doc, fullTitle.toUpperCase(), MARGIN, MARGIN + 10 * pScale, {
        fontSizePt: 28 * pScale * titleScale,
        bold: true,
        color: [15, 23, 42],
        pdfFont,
    });

    // Subtitle
    drawText(doc, subText, MARGIN, MARGIN + 18 * pScale, {
        fontSizePt: 11 * pScale * titleScale,
        italic: true,
        color: [100, 116, 139],
        pdfFont,
    });

    // Right-side metadata
    if (isKey) {
        doc.setFont(pdfFont, 'bold');
        doc.setFontSize(12 * pScale);
        doc.setTextColor(220, 20, 60);
        doc.text('TEACHER ANSWER KEY', PAGE_WIDTH - MARGIN, MARGIN + 10 * pScale, { align: 'right' });
    } else {
        if (setIndicator) {
            doc.setFont(pdfFont, 'bold');
            doc.setFontSize(9 * pScale);
            doc.setTextColor(99, 102, 241);
            doc.text(setIndicator, PAGE_WIDTH - MARGIN, MARGIN + 4 * pScale, { align: 'right' });
        }
        doc.setFont(pdfFont, 'bold');
        doc.setFontSize(9 * pScale);
        doc.setTextColor(100, 116, 139);
        doc.text('NAME:', PAGE_WIDTH - 70, MARGIN + 8 * pScale);
        doc.setDrawColor(200);
        doc.setLineWidth(0.3);
        doc.line(PAGE_WIDTH - 55, MARGIN + 8 * pScale, PAGE_WIDTH - MARGIN, MARGIN + 8 * pScale);
        doc.text('DATE:', PAGE_WIDTH - 70, MARGIN + 18 * pScale);
        doc.line(PAGE_WIDTH - 55, MARGIN + 18 * pScale, PAGE_WIDTH - MARGIN, MARGIN + 18 * pScale);
    }

    // Divider line (now above the instructions)
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.4);
    doc.line(MARGIN, MARGIN + 22 * scale, PAGE_WIDTH - MARGIN, MARGIN + 22 * scale);

    // Instructions — below the divider line (uses drawText so emoji prefix renders correctly)
    drawText(doc, instructions.toUpperCase(), MARGIN, MARGIN + 29 * pScale, {
        fontSizePt: 10 * pScale,
        bold: true,
        italic: true,
        color: [100, 116, 139],
        pdfFont,
    });

    return MARGIN + 38 * scale;
}
