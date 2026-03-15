// =============================================================
// core/state.js — Single source of truth for all app state
// =============================================================
// State lives here; the DOM is a VIEW of this object, not the
// canonical store. saveState() serialises this directly.
// applyState() writes here first, then syncs the DOM.

export const state = {
    // --- Content ---
    words: [
        { word: 'GALAXY', clue: 'A system of millions of stars' },
        { word: 'PLANET', clue: 'Celestial body orbiting a star' },
        { word: 'ORBIT',  clue: 'The curved path of a celestial object' },
        { word: 'COMET',  clue: 'Object of ice and dust' },
        { word: 'NEBULA', clue: 'Cloud of gas and dust' },
        { word: 'GRAVITY',clue: 'Force that attracts objects' },
    ],

    // --- Generated puzzle data ---
    puzzleData: { ws: null, cw: null, scr: null, notes: null },

    // --- UI navigation ---
    activePage: 1,
    currentZoom: 1,

    // --- Watermark ---
    watermarkSrc: '',

    // --- Settings (mirrors sidebar controls) ---
    settings: {
        theme:          'light',
        title:          'Vocabulary Quiz',
        sub:            'Unit Review',
        font:           "'Inter', sans-serif",
        globalFontScale: 1,
        scales: { notes: 1, ws: 1, cw: 1, scr: 1, key: 1 },
        wsSize:         15,
        wsDiag:         true,
        wsBack:         true,
        wsInternalGrid: false,
        wsOpacity:      1,
        wsLineWidth:    1,
        wsHardFiller:   false,
        wsCustomFillers:'',
        wsUseClues:     false,
        cwOpacity:      1,
        cwLineWidth:    1,
        cwShowBank:     false,
        scrShowHint:    false,
        wmOpacity:      0.15,
        titleScale:     1,
        paperSize:      'a4',
        notesConfig: {
            termWidth:  20,
            showTerm:   true,
            showDef:    true,
            shuffle:    false,
        },
        opts: { ws: true, cw: true, scr: true, notes: true, key: true },
        pageOrder:      ['notes','ws','cw','scr','key'],
        sidebarWidth:   '420px',
        aiConfig: {
            provider: 'google',
            model:    'gemini-2.0-flash',
        },
    },
};

// ---- Mutation helpers ----------------------------------------

export function setWords(newWords) {
    state.words = newWords;
}

export function setPuzzleData(newData) {
    state.puzzleData = newData;
}

export function setActivePage(n) {
    state.activePage = n;
}

export function setZoom(z) {
    state.currentZoom = Math.max(0.5, Math.min(2, z));
}

export function setWatermark(src) {
    state.watermarkSrc = src;
}

export function updateSetting(key, value) {
    state.settings[key] = value;
}

export function updateNestedSetting(parent, key, value) {
    if (state.settings[parent]) state.settings[parent][key] = value;
}

// ---- DOM sync helpers ----------------------------------------
// Read current DOM control values into state.settings so that
// saveState() never needs to touch the DOM.

export function syncSettingsFromDOM() {
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        return el ? el.value : def;
    };
    const getChk = (id, def) => {
        const el = document.getElementById(id);
        return el ? el.checked : def;
    };

    const s = state.settings;
    s.theme          = document.body.getAttribute('data-theme') || 'light';
    s.title          = getVal('titleInput', s.title);
    s.sub            = getVal('subInput', s.sub);
    s.font           = getVal('fontSelect', s.font);
    s.globalFontScale= parseFloat(getVal('globalFontScale', s.globalFontScale));
    s.scales = {
        notes: parseFloat(getVal('scaleNotesFont', s.scales.notes)),
        ws:    parseFloat(getVal('scaleWSFont',    s.scales.ws)),
        cw:    parseFloat(getVal('scaleCWFont',    s.scales.cw)),
        scr:   parseFloat(getVal('scaleScrFont',   s.scales.scr)),
        key:   parseFloat(getVal('scaleKeyFont',   s.scales.key)),
    };
    s.wsSize         = parseInt(getVal('wsGridSize', s.wsSize), 10);
    s.wsDiag         = getChk('wsDiag', s.wsDiag);
    s.wsBack         = getChk('wsBack', s.wsBack);
    s.wsInternalGrid = getChk('wsInternalGrid', s.wsInternalGrid);
    s.wsOpacity      = parseFloat(getVal('wsOpacity', s.wsOpacity));
    s.wsLineWidth    = parseFloat(getVal('wsLineWidth', s.wsLineWidth));
    s.wsHardFiller   = getChk('wsHardFiller', s.wsHardFiller);
    s.wsCustomFillers= getVal('wsCustomFillers', s.wsCustomFillers);
    s.wsUseClues     = getChk('wsUseClues', s.wsUseClues);
    s.cwOpacity      = parseFloat(getVal('cwOpacity', s.cwOpacity));
    s.cwLineWidth    = parseFloat(getVal('cwLineWidth', s.cwLineWidth));
    s.cwShowBank     = getChk('cwShowBank', s.cwShowBank);
    s.scrShowHint    = getChk('scrShowHint', s.scrShowHint);
    s.titleScale     = parseFloat(getVal('titleScale', s.titleScale));
    s.paperSize      = getVal('paperSize', s.paperSize);
    s.wmOpacity      = parseFloat(
        document.documentElement.style.getPropertyValue('--wm-opacity') || s.wmOpacity
    );
    s.notesConfig = {
        termWidth: parseFloat(getVal('notesTermWidth', s.notesConfig.termWidth)),
        showTerm:  getChk('notesShowTerm', s.notesConfig.showTerm),
        showDef:   getChk('notesShowDef',  s.notesConfig.showDef),
        shuffle:   getChk('notesShuffle',  s.notesConfig.shuffle),
    };
    s.opts = {
        ws:    getChk('sel-ws',    s.opts.ws),
        cw:    getChk('sel-cw',    s.opts.cw),
        scr:   getChk('sel-scr',   s.opts.scr),
        notes: getChk('sel-notes', s.opts.notes),
        key:   getChk('sel-key',   s.opts.key),
    };
    // page order from sortable list
    const pol = document.querySelectorAll('#page-order-list .sortable-item');
    if (pol.length) s.pageOrder = Array.from(pol).map(el => el.dataset.page);
    s.sidebarWidth = document.documentElement.style.getPropertyValue('--sidebar-width') || s.sidebarWidth;
    s.aiConfig = {
        provider: getVal('aiProvider', s.aiConfig.provider),
        model:    getVal('aiModel',    s.aiConfig.model),
    };
}

// ---- Apply serialised state back to DOM ----------------------
export function applyStateToDOM(s) {
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.value = val;
    };
    const setChk = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined) el.checked = val;
    };

    if (s.words)  state.words = s.words;

    // Restore watermark (can be saved at top level or inside settings)
    const wSrc = s.watermarkSrc || s.settings?.watermarkSrc;
    if (wSrc !== undefined) state.watermarkSrc = wSrc;

    // Merge settings
    if (s.settings || s /* legacy flat format */) {
        const src = s.settings || s; // support both new and legacy saves
        Object.assign(state.settings, src);
        if (src.scales)      Object.assign(state.settings.scales,      src.scales);
        if (src.opts)        Object.assign(state.settings.opts,        src.opts);
        if (src.notesConfig) Object.assign(state.settings.notesConfig, src.notesConfig);
    }

    const cfg = state.settings;

    // Theme
    if (cfg.theme) {
        document.body.setAttribute('data-theme', cfg.theme);
        const bd = document.getElementById('btn-dark');
        if (bd) bd.innerHTML = cfg.theme === 'dark'
            ? '<i class="fas fa-sun"></i>'
            : '<i class="fas fa-moon"></i>';
    }

    setVal('titleInput',      cfg.title);
    setVal('subInput',        cfg.sub);
    setVal('fontSelect',      cfg.font);
    setVal('globalFontScale', cfg.globalFontScale);

    if (cfg.scales) {
        setVal('scaleNotesFont', cfg.scales.notes);
        setVal('scaleWSFont',    cfg.scales.ws);
        setVal('scaleCWFont',    cfg.scales.cw);
        setVal('scaleScrFont',   cfg.scales.scr);
        setVal('scaleKeyFont',   cfg.scales.key);
    }

    setVal('wsGridSize',     cfg.wsSize);
    setChk('wsDiag',         cfg.wsDiag);
    setChk('wsBack',         cfg.wsBack);
    setChk('wsInternalGrid', cfg.wsInternalGrid);
    setVal('wsOpacity',      cfg.wsOpacity);
    setVal('wsLineWidth',    cfg.wsLineWidth);
    setChk('wsHardFiller',   cfg.wsHardFiller);
    setVal('wsCustomFillers',cfg.wsCustomFillers);
    setChk('wsUseClues',     cfg.wsUseClues);
    setVal('cwOpacity',      cfg.cwOpacity);
    setVal('cwLineWidth',    cfg.cwLineWidth);
    setChk('cwShowBank',     cfg.cwShowBank);
    setChk('scrShowHint',    cfg.scrShowHint);
    setVal('titleScale',     cfg.titleScale);
    setVal('paperSize',      cfg.paperSize);

    if (cfg.wmOpacity !== undefined) {
        document.documentElement.style.setProperty('--wm-opacity', cfg.wmOpacity);
    }

    if (cfg.notesConfig) {
        setVal('notesTermWidth', cfg.notesConfig.termWidth);
        setChk('notesShowTerm',  cfg.notesConfig.showTerm);
        setChk('notesShowDef',   cfg.notesConfig.showDef);
        setChk('notesShuffle',   cfg.notesConfig.shuffle);
    }

    if (cfg.opts) {
        setChk('sel-ws',    cfg.opts.ws);
        setChk('sel-cw',    cfg.opts.cw);
        setChk('sel-scr',   cfg.opts.scr);
        setChk('sel-notes', cfg.opts.notes);
        setChk('sel-key',   cfg.opts.key);
    }

    // Page order
    if (cfg.pageOrder && cfg.pageOrder.length > 0) {
        const list = document.getElementById('page-order-list');
        if (list) {
            const itemMap = {};
            Array.from(list.children).forEach(el => { itemMap[el.dataset.page] = el; });
            list.innerHTML = '';
            cfg.pageOrder.forEach(page => { if (itemMap[page]) list.appendChild(itemMap[page]); });
            Object.keys(itemMap).forEach(page => {
                if (!cfg.pageOrder.includes(page)) list.appendChild(itemMap[page]);
            });
        }
    }

    if (cfg.sidebarWidth) {
        document.documentElement.style.setProperty('--sidebar-width', cfg.sidebarWidth);
    }

    if (cfg.aiConfig) {
        Object.assign(state.settings.aiConfig, cfg.aiConfig);
        setVal('aiProvider', cfg.aiConfig.provider);
        setVal('aiModel',    cfg.aiConfig.model);
    }

    if (s.zoom !== undefined || cfg.zoom !== undefined) {
        const z = s.zoom ?? cfg.zoom;
        state.currentZoom = Math.max(0.5, Math.min(2, parseFloat(z) || 1));
        document.querySelectorAll('.page').forEach(p => {
            p.style.transform = `scale(${state.currentZoom})`;
        });
    }
}
