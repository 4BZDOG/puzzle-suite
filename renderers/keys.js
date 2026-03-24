// =============================================================
// renderers/keys.js — Page 5: Answer keys preview
// =============================================================
import { escapeHTML } from '../core/utils.js';

/**
 * @param {HTMLElement} container
 * @param {Object}      puzzleData  - state.puzzleData
 * @param {Object}      settings    - state.settings
 */
export function renderKeys(container, puzzleData, settings) {
    if (!container) return;

    const hasWS = puzzleData.ws && puzzleData.ws.placed.length > 0;
    const hasCW = puzzleData.cw && puzzleData.cw.placed.length > 0;
    const hasScr = puzzleData.scr && puzzleData.scr.length > 0;
    const isMatching = !!(puzzleData.notes?.length > 0 && 'matchLetter' in puzzleData.notes[0]);

    const activeCount = (hasWS ? 1 : 0) + (hasCW ? 1 : 0) + (hasScr ? 1 : 0) + (isMatching ? 1 : 0);

    if (activeCount === 0) {
        container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No answer keys to display</div>';
        return;
    }

    container.className = activeCount > 2 ? 'split-grid' : 'split-page';
    const availW = 300;
    let htmlStr = '';

    // Word Search key
    if (hasWS) {
        let wsHTML = '<div class="split-half"><div class="split-title">WORD SEARCH</div>';
        const ws = puzzleData.ws;
        const zWS = Math.min(16, Math.floor(availW / ws.size));

        wsHTML += `<div style="flex:1; display:flex; justify-content:center; align-items:center;">
            <div class="pdf-force-key">
            <div class="grid mode-search" style="grid-template-columns: repeat(${ws.size},${zWS}px); grid-template-rows: repeat(${ws.size},${zWS}px);">`;

        for (let y = 0; y < ws.size; y++) {
            for (let x = 0; x < ws.size; x++) {
                const isFound = ws.solution.has(`${x},${y}`) ? ' found' : '';
                wsHTML += `<div class="cell${isFound}" style="--cell-size: ${zWS}px">${ws.grid[y][x]}</div>`;
            }
        }

        wsHTML += '</div></div></div></div>';
        htmlStr += wsHTML;
    }

    // Crossword key
    if (hasCW) {
        let cwHTML = '<div class="split-half"><div class="split-title">CROSSWORD</div>';
        const cw = puzzleData.cw;
        const zCW = Math.min(16, Math.floor(availW / Math.max(cw.cols, cw.rows)));

        cwHTML += `<div style="flex:1; display:flex; justify-content:center; align-items:center;">
            <table class="mode-cw key-overlay pdf-force-key" style="--cell-size: ${zCW}px">`;

        for (let y = 0; y < cw.rows; y++) {
            cwHTML += '<tr>';
            for (let x = 0; x < cw.cols; x++) {
                const v = cw.grid[y][x];
                if (v) {
                    cwHTML += `<td class="cell" style="width:${zCW}px; height:${zCW}px"><span class="cell-num">${v.num || ''}</span><span class="cell-char">${v.char}</span></td>`;
                } else {
                    cwHTML += `<td class="cell empty" style="width:${zCW}px; height:${zCW}px"></td>`;
                }
            }
            cwHTML += '</tr>';
        }

        cwHTML += '</table></div></div>';
        htmlStr += cwHTML;
    }

    // Scramble key
    if (hasScr) {
        let scrHTML = '<div class="split-half"><div class="split-title">WORD SCRAMBLE</div><div class="scramble-solution">';
        puzzleData.scr.forEach(s => {
            scrHTML += `<div class="scr-sol-row"><span>${s.scrambled}</span><b>${s.original}</b></div>`;
        });
        scrHTML += '</div></div>';
        htmlStr += scrHTML;
    }

    // Matching key
    if (isMatching && puzzleData.notes) {
        let notesHTML = '<div class="split-half"><div class="split-title">MATCHING KEY</div><div class="scramble-solution">';
        puzzleData.notes.forEach((n, i) => {
            notesHTML += `<div class="scr-sol-row"><span>${i + 1}. ${escapeHTML(n.term)}</span><b style="color:var(--danger)">${n.correctLetter}</b></div>`;
        });
        notesHTML += '</div></div>';
        htmlStr += notesHTML;
    }

    container.innerHTML = htmlStr;
}
