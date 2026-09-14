// =============================================================
// pdf/pdfIcons.js — monochrome vector icons for page headers
// =============================================================
// The activity icons used to be system emoji (📋 🃏 🔍 ✏️ 🔀). PDF fonts
// carry no emoji, so they went through a canvas raster fallback and printed
// as soft bitmaps at 300/600 dpi. These are drawn with jsPDF's own vector
// primitives instead: they stay sharp at any output resolution, take no
// bytes beyond the path, and print cleanly in one colour on a mono printer.
//
// Every icon is authored in a 0..1 unit box and scaled at draw time.

/**
 * Draw one icon with its bottom edge on the text baseline.
 *
 * @param {Object} doc   - jsPDF instance
 * @param {string} name  - notes | matching | search | crossword | scramble
 * @param {number} x     - left edge, mm
 * @param {number} y     - text baseline the icon sits on, mm
 * @param {number} size  - box side, mm
 * @param {number[]} color - stroke/fill colour
 * @returns {number} width consumed in mm (0 when the name is unknown)
 */
export function drawIcon(doc, name, x, y, size, color = [100, 116, 139]) {
    const draw = ICONS[name];
    if (!draw) return 0;

    const s = size;
    // Sit the box slightly above the baseline, the way a cap-height glyph does.
    const top = y - s * 0.92;
    const P = (ux, uy) => [x + ux * s, top + uy * s];
    const line = (x1, y1, x2, y2) => doc.line(...P(x1, y1), ...P(x2, y2));

    const prevLW = doc.getLineWidth ? doc.getLineWidth() : 0.2;
    doc.setDrawColor(...color);
    doc.setFillColor(...color);
    doc.setLineWidth(Math.max(0.18, s * 0.075));
    doc.setLineCap('round');
    doc.setLineJoin('round');

    draw({ doc, P, line, s, color });

    doc.setLineCap('butt');
    doc.setLineJoin('miter');
    doc.setLineWidth(prevLW);
    return s;
}

/** Width an icon will occupy, for callers reserving space before drawing. */
export function iconWidth(name, size) {
    return ICONS[name] ? size : 0;
}

const ICONS = {
    // Clipboard — a reference list of terms.
    notes({ doc, P, line, s }) {
        const [bx, by] = P(0.12, 0.12);
        doc.roundedRect(bx, by, s * 0.76, s * 0.82, s * 0.1, s * 0.1, 'S');
        const [cx, cy] = P(0.32, 0.02);
        doc.roundedRect(cx, cy, s * 0.36, s * 0.18, s * 0.06, s * 0.06, 'F');
        line(0.28, 0.42, 0.72, 0.42);
        line(0.28, 0.60, 0.72, 0.60);
        line(0.28, 0.78, 0.56, 0.78);
    },

    // Two cards — pair each term with its definition.
    matching({ doc, P, line, s }) {
        const [ax, ay] = P(0.06, 0.16);
        doc.roundedRect(ax, ay, s * 0.46, s * 0.72, s * 0.08, s * 0.08, 'S');
        const [bx, by] = P(0.46, 0.10);
        doc.roundedRect(bx, by, s * 0.46, s * 0.72, s * 0.08, s * 0.08, 'S');
        line(0.56, 0.34, 0.82, 0.34);
        line(0.56, 0.52, 0.82, 0.52);
    },

    // Magnifier — find the words in the grid.
    search({ doc, P, line, s }) {
        const [cx, cy] = P(0.42, 0.40);
        doc.circle(cx, cy, s * 0.30, 'S');
        line(0.64, 0.62, 0.90, 0.90);
    },

    // Pencil — write the answers into the grid.
    crossword({ doc, P, line, s }) {
        line(0.18, 0.84, 0.74, 0.24);          // barrel
        line(0.30, 0.92, 0.86, 0.32);
        line(0.74, 0.24, 0.86, 0.32);          // ferrule
        line(0.18, 0.84, 0.30, 0.92);          // tip
        line(0.10, 0.96, 0.24, 0.90);          // point
    },

    // Crossing arrows — the letters have been shuffled.
    scramble({ doc, P, line, s }) {
        line(0.10, 0.28, 0.78, 0.28);
        line(0.10, 0.74, 0.78, 0.74);
        line(0.62, 0.14, 0.80, 0.28);          // upper arrowhead
        line(0.62, 0.42, 0.80, 0.28);
        line(0.62, 0.60, 0.80, 0.74);          // lower arrowhead
        line(0.62, 0.88, 0.80, 0.74);
    },
};

/** Icon name for each page type, so callers do not hardcode strings. */
export const PAGE_ICONS = {
    notes: 'notes',
    matching: 'matching',
    ws: 'search',
    cw: 'crossword',
    scr: 'scramble',
};
