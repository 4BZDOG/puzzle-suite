// =============================================================
// ui/zoom.js — Preview zoom controls
// =============================================================
// A CSS transform does not change an element's layout box, so a zoomed sheet
// used to clip on the left (zoom > 1) or leave a screenful of dead scroll
// (zoom < 1). applyZoom() scales the sheet and then gives it matching margins
// so the scroll area is the size of what you can see.
import { state, setZoom } from '../core/state.js';
import { saveState } from '../core/storage.js';

const MIN = 0.25, MAX = 2;
let fitMode = false;   // true → keep the sheet fitted to the viewport width

export function applyZoom() {
    const z = state.currentZoom;
    document.querySelectorAll('.page').forEach(p => {
        p.style.transform = `scale(${z})`;
        const w = p.offsetWidth, h = p.offsetHeight;
        p.style.marginInline = `${((z - 1) * w) / 2}px`;
        p.style.marginBottom = `${40 + (z - 1) * h}px`;
    });
    const lbl = document.getElementById('zoom-level');
    if (lbl) lbl.textContent = Math.round(z * 100) + '%';
}

function fitZoom() {
    const vp = document.querySelector('.viewport');
    const pg = document.querySelector('.page.visible') || document.querySelector('.page');
    if (!vp || !pg) return 1;
    const cs = getComputedStyle(vp);
    const avail = vp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    return Math.max(MIN, Math.min(1, avail / pg.offsetWidth));
}

export function fitZoomToWidth() {
    fitMode = true;
    state.currentZoom = fitZoom();
    applyZoom();
}

export function adjustZoom(delta) {
    fitMode = false;
    setZoom(Math.max(MIN, Math.min(MAX, state.currentZoom + delta)));
    applyZoom();
    saveState();
}

export function resetZoom() {
    // a click on the percentage toggles between 100 % and fit-to-width
    if (Math.abs(state.currentZoom - 1) > 0.01) { fitMode = false; setZoom(1); applyZoom(); saveState(); }
    else fitZoomToWidth();
}

export function initZoom() {
    // small screens start fitted; otherwise honour the saved level
    if (window.innerWidth <= 900) fitZoomToWidth(); else applyZoom();
    window.addEventListener('resize', () => { if (fitMode) fitZoomToWidth(); else applyZoom(); });
    if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => { if (fitMode) fitZoomToWidth(); else applyZoom(); });
        document.querySelectorAll('.page').forEach(p => ro.observe(p));
    }
}
