// =============================================================
// core/utils.js — Shared utility functions
// =============================================================

/**
 * Escape a string for safe injection into HTML attributes or text nodes.
 * Handles &, <, >, ', and " characters.
 */
export const escapeHTML = str => String(str).replace(
    /[&<>'"]/g,
    t => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[t])
);
