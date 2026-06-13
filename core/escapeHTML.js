// =============================================================
// core/escapeHTML.js — HTML output-encoding (XSS defense layer 2)
//
// Escapes the five HTML-significant characters before user-controlled
// strings are injected via innerHTML. Pure and dependency-free so it is
// unit-testable and shared by every renderer (no per-file copies to drift).
//
// Coerces null/undefined/non-strings to '' so it never throws mid-render —
// a thrown escape call would be worse than an empty cell.
// =============================================================

export const escapeHTML = (str) => String(str ?? '').replace(/[&<>'"]/g, tag => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
}[tag]));
