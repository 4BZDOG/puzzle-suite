// =============================================================
// ui/icons.js — inline vector icons for on-screen instructions
// =============================================================
// The screen counterparts of pdf/pdfIcons.js. System emoji (📋 🃏 🔍 ✏️ 🔀)
// are raster glyphs: they print soft at 300/600 dpi and change shape between
// platforms. These are 16x16 monochrome SVG paths that inherit the
// surrounding text colour and stay sharp at any print resolution.

const P = 'stroke="currentColor" fill="none" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"';

const PATHS = {
    // Clipboard — a reference list of terms.
    notes: `<rect x="3" y="2.6" width="10" height="11.8" rx="1.5" ${P}/>` +
           `<rect x="6" y="1" width="4" height="2.6" rx="0.8" fill="currentColor" stroke="none"/>` +
           `<path d="M5.6 7h4.8M5.6 9.6h4.8M5.6 12.2h3" ${P}/>`,
    // Two cards — pair each term with its definition.
    matching: `<rect x="1.4" y="3.2" width="6.4" height="9.6" rx="1" ${P}/>` +
              `<rect x="7.6" y="2.1" width="7" height="9.6" rx="1" ${P}/>` +
              `<path d="M9.3 5.4h3.6M9.3 7.9h3.6" ${P}/>`,
    // Magnifier — find the words in the grid.
    search: `<circle cx="6.8" cy="6.8" r="4.3" ${P}/><path d="M10 10l4 4" ${P}/>`,
    // Pencil — write the answers into the grid.
    crossword: `<path d="M2 14l1-3.2 7.3-7.3 2.2 2.2L5.2 13 2 14z" ${P}/>` +
               `<path d="M9.5 4.3l2.2 2.2" ${P}/>`,
    // Crossing arrows — the letters have been shuffled.
    scramble: `<path d="M1.6 4.6h9.8M1.6 11.4h9.8" ${P}/>` +
              `<path d="M9.2 2.3l2.3 2.3-2.3 2.3M9.2 9.1l2.3 2.3-2.3 2.3" ${P}/>`,
};

/**
 * Inline SVG markup for one instruction icon.
 * @param {string} name - notes | matching | search | crossword | scramble
 * @returns {string} SVG markup, or '' for an unknown name
 */
export function svgIcon(name) {
    const body = PATHS[name];
    if (!body) return '';
    return `<svg class="instr-icon" viewBox="0 0 16 16" width="16" height="16" `
        + `aria-hidden="true" focusable="false">${body}</svg>`;
}
