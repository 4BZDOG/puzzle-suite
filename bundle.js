(()=>{var Q=(e,t)=>()=>(e&&(t=e(e=0)),t);function X(e){m.words=e}function Xe(e){m.puzzleData=e}function Ye(e){m.currentZoom=Math.max(.5,Math.min(2,e))}function G(){let e=(s,i)=>{let n=document.getElementById(s);return n?n.value:i},t=(s,i)=>{let n=document.getElementById(s);return n?n.checked:i},o=m.settings;o.theme=document.body.getAttribute("data-theme")||"light",o.title=e("titleInput",o.title),o.sub=e("subInput",o.sub),o.font=e("fontSelect",o.font),o.globalFontScale=parseFloat(e("globalFontScale",o.globalFontScale)),o.scales={notes:parseFloat(e("scaleNotesFont",o.scales.notes)),ws:parseFloat(e("scaleWSFont",o.scales.ws)),cw:parseFloat(e("scaleCWFont",o.scales.cw)),scr:parseFloat(e("scaleScrFont",o.scales.scr)),key:parseFloat(e("scaleKeyFont",o.scales.key))},o.wsSize=parseInt(e("wsGridSize",o.wsSize),10),o.wsDiag=t("wsDiag",o.wsDiag),o.wsBack=t("wsBack",o.wsBack),o.wsInternalGrid=t("wsInternalGrid",o.wsInternalGrid),o.wsOpacity=parseFloat(e("wsOpacity",o.wsOpacity)),o.wsLineWidth=parseFloat(e("wsLineWidth",o.wsLineWidth)),o.wsHardFiller=t("wsHardFiller",o.wsHardFiller),o.wsCustomFillers=e("wsCustomFillers",o.wsCustomFillers),o.wsUseClues=t("wsUseClues",o.wsUseClues),o.cwOpacity=parseFloat(e("cwOpacity",o.cwOpacity)),o.cwLineWidth=parseFloat(e("cwLineWidth",o.cwLineWidth)),o.cwShowBank=t("cwShowBank",o.cwShowBank),o.scrShowHint=t("scrShowHint",o.scrShowHint),o.titleScale=parseFloat(e("titleScale",o.titleScale)),o.paperSize=e("paperSize",o.paperSize),o.wmOpacity=parseFloat(document.documentElement.style.getPropertyValue("--wm-opacity")||o.wmOpacity),o.notesConfig={termWidth:parseFloat(e("notesTermWidth",o.notesConfig.termWidth)),showTerm:t("notesShowTerm",o.notesConfig.showTerm),showDef:t("notesShowDef",o.notesConfig.showDef),shuffle:t("notesShuffle",o.notesConfig.shuffle)},o.opts={ws:t("sel-ws",o.opts.ws),cw:t("sel-cw",o.opts.cw),scr:t("sel-scr",o.opts.scr),notes:t("sel-notes",o.opts.notes),key:t("sel-key",o.opts.key)};let r=document.querySelectorAll("#page-order-list .sortable-item");r.length&&(o.pageOrder=Array.from(r).map(s=>s.dataset.page)),o.sidebarWidth=document.documentElement.style.getPropertyValue("--sidebar-width")||o.sidebarWidth}function se(e){let t=(i,n)=>{let l=document.getElementById(i);l&&n!==void 0&&(l.value=n)},o=(i,n)=>{let l=document.getElementById(i);l&&n!==void 0&&(l.checked=n)};e.words&&(m.words=e.words);let r=e.watermarkSrc||e.settings?.watermarkSrc;if(r!==void 0&&(m.watermarkSrc=r),e.settings||e){let i=e.settings||e;Object.assign(m.settings,i),i.scales&&Object.assign(m.settings.scales,i.scales),i.opts&&Object.assign(m.settings.opts,i.opts),i.notesConfig&&Object.assign(m.settings.notesConfig,i.notesConfig)}let s=m.settings;if(s.theme){document.body.setAttribute("data-theme",s.theme);let i=document.getElementById("btn-dark");i&&(i.innerHTML=s.theme==="dark"?'<i class="fas fa-sun"></i>':'<i class="fas fa-moon"></i>')}if(t("titleInput",s.title),t("subInput",s.sub),t("fontSelect",s.font),t("globalFontScale",s.globalFontScale),s.scales&&(t("scaleNotesFont",s.scales.notes),t("scaleWSFont",s.scales.ws),t("scaleCWFont",s.scales.cw),t("scaleScrFont",s.scales.scr),t("scaleKeyFont",s.scales.key)),t("wsGridSize",s.wsSize),o("wsDiag",s.wsDiag),o("wsBack",s.wsBack),o("wsInternalGrid",s.wsInternalGrid),t("wsOpacity",s.wsOpacity),t("wsLineWidth",s.wsLineWidth),o("wsHardFiller",s.wsHardFiller),t("wsCustomFillers",s.wsCustomFillers),o("wsUseClues",s.wsUseClues),t("cwOpacity",s.cwOpacity),t("cwLineWidth",s.cwLineWidth),o("cwShowBank",s.cwShowBank),o("scrShowHint",s.scrShowHint),t("titleScale",s.titleScale),t("paperSize",s.paperSize),s.wmOpacity!==void 0&&document.documentElement.style.setProperty("--wm-opacity",s.wmOpacity),s.notesConfig&&(t("notesTermWidth",s.notesConfig.termWidth),o("notesShowTerm",s.notesConfig.showTerm),o("notesShowDef",s.notesConfig.showDef),o("notesShuffle",s.notesConfig.shuffle)),s.opts&&(o("sel-ws",s.opts.ws),o("sel-cw",s.opts.cw),o("sel-scr",s.opts.scr),o("sel-notes",s.opts.notes),o("sel-key",s.opts.key)),s.pageOrder&&s.pageOrder.length>0){let i=document.getElementById("page-order-list");if(i){let n={};Array.from(i.children).forEach(l=>{n[l.dataset.page]=l}),i.innerHTML="",s.pageOrder.forEach(l=>{n[l]&&i.appendChild(n[l])}),Object.keys(n).forEach(l=>{s.pageOrder.includes(l)||i.appendChild(n[l])})}}if(s.sidebarWidth&&document.documentElement.style.setProperty("--sidebar-width",s.sidebarWidth),e.zoom!==void 0||s.zoom!==void 0){let i=e.zoom??s.zoom;m.currentZoom=Math.max(.5,Math.min(2,parseFloat(i)||1)),document.querySelectorAll(".page").forEach(n=>{n.style.transform=`scale(${m.currentZoom})`})}}var m,U=Q(()=>{m={words:[{word:"GALAXY",clue:"A system of millions of stars"},{word:"PLANET",clue:"Celestial body orbiting a star"},{word:"ORBIT",clue:"The curved path of a celestial object"},{word:"COMET",clue:"Object of ice and dust"},{word:"NEBULA",clue:"Cloud of gas and dust"},{word:"GRAVITY",clue:"Force that attracts objects"}],puzzleData:{ws:null,cw:null,scr:null,notes:null},activePage:1,currentZoom:1,watermarkSrc:"",settings:{theme:"light",title:"Vocabulary Quiz",sub:"Unit Review",font:"'Inter', sans-serif",globalFontScale:1,scales:{notes:1,ws:1,cw:1,scr:1,key:1},wsSize:15,wsDiag:!0,wsBack:!0,wsInternalGrid:!1,wsOpacity:1,wsLineWidth:1,wsHardFiller:!1,wsCustomFillers:"",wsUseClues:!1,cwOpacity:1,cwLineWidth:1,cwShowBank:!1,scrShowHint:!1,wmOpacity:.15,titleScale:1,paperSize:"a4",notesConfig:{termWidth:20,showTerm:!0,showDef:!0,shuffle:!1},opts:{ws:!0,cw:!0,scr:!0,notes:!0,key:!0},pageOrder:["notes","ws","cw","scr","key"],sidebarWidth:"420px"}}});function D(){j=j.slice(0,_+1),j.push(JSON.parse(JSON.stringify(m.words))),j.length>Ct?j.shift():_++,Se()}function ne(e){_<=0||(_--,X(JSON.parse(JSON.stringify(j[_]))),Se(),e&&e())}function re(e){_>=j.length-1||(_++,X(JSON.parse(JSON.stringify(j[_]))),Se(),e&&e())}function Mt(){return _>0}function Ft(){return _<j.length-1}function Se(){let e=document.getElementById("btn-undo"),t=document.getElementById("btn-redo");e&&(e.disabled=!Mt()),t&&(t.disabled=!Ft())}var Ct,j,_,ve=Q(()=>{U();Ct=50,j=[],_=-1});function M(e,t="success"){let o=document.getElementById("toast-container");if(!o)return;o.setAttribute("aria-live",t==="error"?"assertive":"polite");let r=document.createElement("div");r.className=`toast ${t}`,r.innerHTML=`<i class="fas fa-${t==="success"?"check-circle":"exclamation-circle"}"></i> ${e}`,o.appendChild(r),setTimeout(()=>r.classList.add("show"),10),setTimeout(()=>{r.classList.remove("show"),setTimeout(()=>r.remove(),300)},3e3)}var Z=Q(()=>{});function ft(e){if(e.key!=="Tab")return;let t=document.querySelector(".modal");if(!t)return;let o=Array.from(t.querySelectorAll('button, textarea, input, [tabindex]:not([tabindex="-1"])')).filter(i=>!i.disabled);if(!o.length)return;let r=o[0],s=o[o.length-1];e.shiftKey?document.activeElement===r&&(e.preventDefault(),s.focus()):document.activeElement===s&&(e.preventDefault(),r.focus())}function We(e){fe=e||document.activeElement;let t=document.getElementById("modal-overlay"),o=document.getElementById("import-text");t&&(t.style.display="flex",t.addEventListener("keydown",ft)),o&&o.focus()}function K(){let e=document.getElementById("modal-overlay");e&&(e.style.display="none",e.removeEventListener("keydown",ft)),fe&&(fe.focus(),fe=null)}var fe,ze=Q(()=>{fe=null});function V(e){let t=document.getElementById("import-text");if(!t)return;let o=t.value;if(!o.trim())return;D();let r=[...m.words],s=new Set(r.map(i=>i.word));o.split(`
`).forEach(i=>{if(!i.trim())return;let n=i.match(/^([^-:,\t\s]+)[-:,\t\s]+(.*)$/),l,d;n&&n[1]?(l=n[1].trim().toUpperCase().replace(/[^A-Z0-9]/g,""),d=n[2].trim()||"Find the word"):(l=i.trim().toUpperCase().replace(/[^A-Z0-9]/g,""),d="Find the word"),l&&l.length>1&&!s.has(l)&&(r.push({word:l,clue:d}),s.add(l))}),X(r),K(),t.value="",M("Import successful"),e&&e()}function Be(e,t,o){let r=new FileReader;r.onload=s=>{let i=s.target.result;if(e.name.endsWith(".json"))try{let n=JSON.parse(i);t&&t(n),M("Loaded config!")}catch{M("Invalid JSON config","error")}else{let n=document.getElementById("import-text");n&&(n.value=i,o?o():V())}},r.readAsText(e)}var ht=Q(()=>{U();ve();Z();ze()});U();ve();U();Z();var ie="puzzleSuiteV60",Lt="puzzleSuiteV59",Wt=500,qe=null;function zt(){try{G();let e={words:m.words,settings:m.settings,zoom:m.currentZoom,watermarkSrc:m.watermarkSrc,theme:m.settings.theme,title:m.settings.title,sub:m.settings.sub};localStorage.setItem(ie,JSON.stringify(e))}catch(e){e.name==="QuotaExceededError"||e.message&&e.message.toLowerCase().includes("quota")?M("Storage full. Remove watermark image or reduce words.","error"):console.error("Save failed",e)}}function S(){clearTimeout(qe),qe=setTimeout(zt,Wt)}function Ze(){try{let e=localStorage.getItem(ie)||localStorage.getItem(Lt);return e?JSON.parse(e):null}catch{return localStorage.removeItem(ie),M("Saved data was corrupted and has been reset.","error"),null}}function be(){confirm("Reset all words and settings? This cannot be undone.")&&(localStorage.removeItem(ie),location.reload())}U();var At=`
const PROFANITY = ["FUCK","SHIT","BITCH","ASS","CUNT","DICK","COCK","PUSSY","SLUT","WHORE","CRAP","PISS","CUM","TWAT","TIT","CLIT"];
const WS_MAX_ATTEMPTS = 2000;

function generateWS(sz, wordList, useDiag, useBack, useHard, customFillers) {
    let g = Array(sz).fill(null).map(() => Array(sz).fill(''));
    let solArray = [];
    let p = [];
    let l = JSON.parse(JSON.stringify(wordList))
        .filter(w => w.word && w.word.length <= sz)
        .sort((a, b) => b.word.length - a.word.length);

    const dirs = [[1, 0], [0, 1]];
    if (useDiag) dirs.push([1, 1]);
    if (useBack) dirs.push([-1, 0], [0, -1]);
    if (useDiag && useBack) dirs.push([-1, -1], [1, -1], [-1, 1]);

    l.forEach(o => {
        let w = o.word, fit = false, t = 0;
        while (!fit && t < WS_MAX_ATTEMPTS) {
            const d = dirs[Math.floor(Math.random() * dirs.length)];
            const x = Math.floor(Math.random() * sz);
            const y = Math.floor(Math.random() * sz);
            if (
                x + (w.length - 1) * d[0] >= 0 && x + (w.length - 1) * d[0] < sz &&
                y + (w.length - 1) * d[1] >= 0 && y + (w.length - 1) * d[1] < sz
            ) {
                let ok = true;
                for (let i = 0; i < w.length; i++) {
                    const cell = g[y + i * d[1]][x + i * d[0]];
                    if (cell !== '' && cell !== w[i]) ok = false;
                }
                if (ok) {
                    for (let i = 0; i < w.length; i++) {
                        g[y + i * d[1]][x + i * d[0]] = w[i];
                        solArray.push((x + i * d[0]) + ',' + (y + i * d[1]));
                    }
                    p.push(w);
                    fit = true;
                }
            }
            t++;
        }
    });

    let pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (useHard) {
        const j = wordList.map(x => x.word).join('');
        if (j.length >= 5) pool = j;
    }
    if (customFillers && customFillers.trim().length > 0) {
        pool = customFillers.toUpperCase().replace(/\\s/g, '');
        if (pool.length === 0) pool = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    for (let y = 0; y < sz; y++) {
        for (let x = 0; x < sz; x++) {
            if (g[y][x] === '') g[y][x] = pool[Math.floor(Math.random() * pool.length)];
        }
    }
    return { grid: g, size: sz, solutionArray: solArray, placed: p.sort() };
}

function checkCW(g, w, x, y, d) {
    const dx = d === 'across' ? 1 : 0, dy = d === 'across' ? 0 : 1;
    if (x < 0 || y < 0 || x + w.length * dx > g[0].length || y + w.length * dy > g.length) return false;
    for (let i = 0; i < w.length; i++) {
        const c = g[y + i * dy][x + i * dx];
        if (c !== null && c !== w[i]) return false;
        if (c === null) {
            if (
                (g[y + i * dy + dx] && g[y + i * dy + dx][x + i * dx + dy] !== null) ||
                (g[y + i * dy - dx] && g[y + i * dy - dx][x + i * dx - dy] !== null)
            ) return false;
        }
    }
    if (x - dx >= 0 && y - dy >= 0 && g[y - dy][x - dx] !== null) return false;
    if (
        x + w.length * dx < g[0].length &&
        y + w.length * dy < g.length &&
        g[y + w.length * dy][x + w.length * dx] !== null
    ) return false;
    return true;
}

function generateCW(wordList, seedIndex) {
    seedIndex = seedIndex || 0;
    let l = JSON.parse(JSON.stringify(wordList)).filter(w => w.word && w.word.length > 1);
    if (!l.length) return { grid: [], rows: 0, cols: 0, placed: [] };

    l.sort(() => Math.random() - 0.5);
    l.sort((a, b) => b.word.length - a.word.length);

    if (seedIndex > 0 && seedIndex < l.length) {
        const seedWord = l.splice(seedIndex, 1)[0];
        l.unshift(seedWord);
    }

    const MAX = 150, MID = 75;
    let g = Array(MAX).fill(null).map(() => Array(MAX).fill(null));
    let p = [];

    const f = l.shift();
    const fc = MID - Math.floor(f.word.length / 2);
    for (let i = 0; i < f.word.length; i++) g[MID][fc + i] = f.word[i];
    p.push({ ...f, x: fc, y: MID, dir: 'across' });

    let placedCount;
    const startTime = Date.now();

    do {
        if (Date.now() - startTime > 1500) break;
        placedCount = 0;
        let bestMove = null, bestScore = -Infinity, bestWordIdx = -1;

        for (let i = 0; i < l.length; i++) {
            const w = l[i].word;
            let possiblePlacements = [];

            for (const pl of p) {
                for (let j = 0; j < w.length; j++) {
                    for (let k = 0; k < pl.word.length; k++) {
                        if (w[j] === pl.word[k]) {
                            const ia = pl.dir === 'across', nd = ia ? 'down' : 'across';
                            const sx = (pl.x + (ia ? k : 0)) - (nd === 'across' ? j : 0);
                            const sy = (pl.y + (ia ? 0 : k)) - (nd === 'down'   ? j : 0);

                            if (checkCW(g, w, sx, sy, nd)) {
                                let intersections = 0;
                                for (let z = 0; z < w.length; z++) {
                                    if (g[sy + (nd === 'down' ? z : 0)][sx + (nd === 'across' ? z : 0)] !== null) intersections++;
                                }
                                let minX = MAX, maxX = 0, minY = MAX, maxY = 0;
                                for (const existing of p) {
                                    minX = Math.min(minX, existing.x); minY = Math.min(minY, existing.y);
                                    maxX = Math.max(maxX, existing.x + (existing.dir === 'across' ? existing.word.length - 1 : 0));
                                    maxY = Math.max(maxY, existing.y + (existing.dir === 'down'   ? existing.word.length - 1 : 0));
                                }
                                minX = Math.min(minX, sx); minY = Math.min(minY, sy);
                                maxX = Math.max(maxX, sx + (nd === 'across' ? w.length - 1 : 0));
                                maxY = Math.max(maxY, sy + (nd === 'down'   ? w.length - 1 : 0));

                                const area   = (maxX - minX + 1) * (maxY - minY + 1);
                                const aspect = Math.abs((maxX - minX) - (maxY - minY));
                                const score  = (intersections * 1000) - area - (aspect * 10);
                                possiblePlacements.push({ x: sx, y: sy, dir: nd, score, wordIdx: i });
                            }
                        }
                    }
                }
            }

            if (possiblePlacements.length > 0) {
                possiblePlacements.sort((a, b) => b.score - a.score);
                const top = possiblePlacements[0];
                if (top.score > bestScore) { bestScore = top.score; bestMove = top; bestWordIdx = i; }
            }
        }

        if (bestMove) {
            const wObj = l.splice(bestWordIdx, 1)[0];
            const dx = bestMove.dir === 'across' ? 1 : 0, dy = bestMove.dir === 'across' ? 0 : 1;
            for (let z = 0; z < wObj.word.length; z++) {
                g[bestMove.y + z * dy][bestMove.x + z * dx] = wObj.word[z];
            }
            p.push({ ...wObj, x: bestMove.x, y: bestMove.y, dir: bestMove.dir });
            placedCount++;
        }
    } while (placedCount > 0 && l.length > 0);

    if (!p.length) return { grid: [], rows: 0, cols: 0, placed: [] };

    let mx = MAX, Mx = 0, my = MAX, My = 0;
    p.forEach(z => {
        const len = z.word.length, isa = z.dir === 'across';
        mx = Math.min(mx, z.x); my = Math.min(my, z.y);
        Mx = Math.max(Mx, z.x + (isa ? len - 1 : 0));
        My = Math.max(My, z.y + (isa ? 0 : len - 1));
    });

    const w = Mx - mx + 1, h = My - my + 1;
    const fg = Array(h).fill(null).map(() => Array(w).fill(null));
    p.forEach(z => { z.x -= mx; z.y -= my; });

    p.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    let n = 1;
    p.forEach((z, idx) => {
        const ex = p.slice(0, idx).find(e => e.x === z.x && e.y === z.y);
        z.num = ex ? ex.num : n++;
        const dx = z.dir === 'across' ? 1 : 0, dy = z.dir === 'across' ? 0 : 1;
        for (let i = 0; i < z.word.length; i++) {
            const r = z.y + i * dy, c = z.x + i * dx;
            if (!fg[r][c]) fg[r][c] = { char: z.word[i], num: null };
            if (i === 0) fg[r][c].num = z.num;
        }
    });

    return { grid: fg, rows: h, cols: w, placed: p };
}

function generateScramble(wordList) {
    return wordList.map(w => {
        let arr = w.word.split('');
        let tries = 0, scrambled;
        do {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            scrambled = arr.join('');
            tries++;
        } while (
            (scrambled === w.word || PROFANITY.some(bw => scrambled.includes(bw))) &&
            tries < 50 &&
            w.word.length > 1
        );
        return { original: w.word, scrambled };
    });
}

self.onmessage = function (e) {
    const { id, words, wsSize, wsDiag, wsBack, wsHard, wsCustomFillers } = e.data;

    const ws = generateWS(wsSize, words, wsDiag, wsBack, wsHard, wsCustomFillers);

    let bestCW = null, bestScore = Infinity;
    const cwWords = words.filter(w => w.word && w.word.length > 1);
    for (let i = 0; i < Math.min(5, cwWords.length); i++) {
        const attempt = generateCW(words, i);
        const area    = attempt.cols * attempt.rows;
        const aspect  = Math.abs(attempt.cols - attempt.rows) * 10;
        const unplaced = words.length - attempt.placed.length;
        const score   = (unplaced * 10000) + area + aspect;
        if (score < bestScore) { bestCW = attempt; bestScore = score; }
    }
    if (!bestCW) bestCW = { grid: [], rows: 0, cols: 0, placed: [] };

    const scr = generateScramble(words);

    self.postMessage({ id, result: { ws, cw: bestCW, scr } });
};
`,Y=null,kt=0,$t=0,q={};function Ot(){if(Y)return Y;try{let e=new Blob([At],{type:"application/javascript"});Y=new Worker(URL.createObjectURL(e))}catch{return console.warn("Worker creation failed \u2014 running without generation worker."),Y=null,null}return Y.onmessage=e=>{let{id:t,result:o}=e.data;o&&o.ws&&(o.ws.solution=new Set(o.ws.solutionArray)),q[t]&&(q[t](o),delete q[t])},Y.onerror=e=>{console.error("Worker error:",e);for(let t in q)q[t](null),delete q[t]},Y}function le(e){let t=Ot();return t?new Promise(o=>{let r=++kt;$t=r,q[r]=o;let s=e||m.settings;t.postMessage({id:r,words:m.words,wsSize:s.wsSize||15,wsDiag:s.wsDiag??!0,wsBack:s.wsBack??!0,wsHard:s.wsHardFiller||!1,wsCustomFillers:s.wsCustomFillers||""})}):Promise.resolve(null)}var Ee=e=>e.replace(/[&<>'"]/g,t=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[t]);function Ke(e,t,o,r,s,i){if(!e)return;if(e.innerHTML="",t.length===0){e.innerHTML='<div class="empty-state"><i class="fas fa-feather-alt"></i><br>No words yet. Add some or import!</div>';return}let n="";t.forEach((l,d)=>{let a=o.ws?.placed.includes(l.word),c=o.cw?.placed.some(p=>p.word===l.word),f=o.scr?.some(p=>p.original===l.word),u;r===2?u=a?"placed":"failed":r===3?u=c?"placed":"failed":r===4?u=f?"placed":"failed":u=a||c?"placed":"failed",n+=`<div class="wm-row">
            <div class="wm-status ${u}"></div>
            <div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0; padding-right:2px;">
                <button class="wm-btn" style="height:16px; width:16px; font-size:10px; padding:0" onclick="window._puzzleApp.moveWordUp(${d})" ${d===0?"disabled":""} aria-label="Move Up">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button class="wm-btn" style="height:16px; width:16px; font-size:10px; padding:0" onclick="window._puzzleApp.moveWordDown(${d})" ${d===t.length-1?"disabled":""} aria-label="Move Down">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div style="flex:1">
                <input class="wm-input wm-word" value="${Ee(l.word)}"
                    onchange="window._puzzleApp.updateWord(${d},'word',this.value)"
                    placeholder="WORD" aria-label="Word ${d+1}">
            </div>
            <div style="flex:2">
                <input class="wm-input wm-clue" value="${Ee(l.clue)}"
                    onkeyup="window._puzzleApp.updateWord(${d},'clue',this.value)"
                    placeholder="Clue" aria-label="Clue for word ${d+1}">
            </div>
            <button class="wm-btn" onclick="window._puzzleApp.delWord(${d})"
                aria-label="Delete word ${Ee(l.word)||d+1}">
                <i class="fas fa-times"></i>
            </button>
        </div>`}),e.innerHTML=n}function Ve(e,t,o){let r=0;e.forEach(n=>{o===2?t.ws?.placed.includes(n.word)&&r++:o===3?t.cw?.placed.some(l=>l.word===n.word)&&r++:o===4?t.scr?.some(l=>l.original===n.word)&&r++:(t.ws?.placed.includes(n.word)||t.cw?.placed.some(l=>l.word===n.word))&&r++});let s=document.getElementById("placed-count");s&&(s.innerText=`${r}/${e.length}`);let i=document.getElementById("status-icon");i&&(r===e.length&&e.length>0?(i.className="status-icon icon-success",i.innerHTML='<i class="fas fa-check"></i>'):(i.className="status-icon icon-warning",i.innerHTML='<i class="fas fa-exclamation"></i>'))}function Je(){let e=document.getElementById("status-icon");e&&(e.className="status-icon icon-generating",e.innerHTML='<i class="fas fa-circle-notch fa-spin"></i>')}function Qe(e,t=!1){let o=t?750:640,r=680,s=Math.max(1,e?.size||1);return Math.min(60,Math.max(15,Math.floor(Math.min(o/s,r/s))))}function et(e,t,o,r,s,i=!0){let n=i?(()=>{let l=document.getElementById("scaleSearch");return l?parseInt(l.value,10):Qe(o)})():Qe(o);if(e){if(e.innerHTML="",!o){e.innerHTML='<div style="color:var(--text-muted)">No Data</div>';return}let d=`<div class="grid mode-search ${s.wsInternalGrid?"with-internal-grid":""}" style="grid-template-columns: repeat(${o.size}, ${n}px); grid-template-rows: repeat(${o.size}, ${n}px);">`;for(let a=0;a<o.size;a++)for(let c=0;c<o.size;c++)d+=`<div class="cell" style="--cell-size: ${n}px;">${o.grid[a][c]}</div>`;d+="</div>",e.innerHTML=d}if(t&&o){let l=s.wsUseClues,d=o.placed.reduce((u,p)=>Math.max(u,p.length),0),a=3;l||d>12?a=2:d<=8&&(a=4);let c=o.placed.map(u=>{if(l){let w=r.find(x=>x.word===u)?.clue?.trim();return w?`${w} <span class="notes-clue-length">(${u.length})</span>`:u}return u}),f=o.size*n;t.innerHTML=`<div style="width:${f}px; margin:0 auto;">
            <div class="word-bank-styled" style="column-count:${a}; display:block; column-gap:20px;">
                ${c.map(u=>`<div class="wb-item" style="margin-bottom:6px; break-inside:avoid;"><span class="wb-check"></span> <div>${u}</div></div>`).join("")}
            </div>
        </div>`}}function tt(e,t=!1){let o=t?750:640,r=500,s=Math.max(1,e?.cols||1),i=Math.max(1,e?.rows||1);return Math.min(60,Math.max(15,Math.floor(Math.min(o/s,r/i))))}function ot(e,t,o,r,s=!0){let i=s?(()=>{let n=document.getElementById("scaleCrossword");return n?parseInt(n.value,10):tt(o)})():tt(o);if(e){if(e.innerHTML="",!o||o.placed.length===0){e.innerHTML=`<div style="color:var(--danger); text-align:center; padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:12px; display:block;"></i>
                <h3 style="margin:0 0 8px 0;">Crossword Generation Incomplete</h3>
                <p style="color:var(--text-muted); margin:0;">Words could not connect well. Try adding more or longer words.</p>
            </div>`,t&&(t.innerHTML="");return}let n=`<table class="mode-cw" style="--cell-size: ${i}px;">`;for(let l=0;l<o.rows;l++){n+="<tr>";for(let d=0;d<o.cols;d++){let a=o.grid[l][d];a?n+=`<td class="cell" style="width: ${i}px; height: ${i}px;"><span class="cell-num">${a.num||""}</span></td>`:n+=`<td class="cell empty" style="width: ${i}px; height: ${i}px;"></td>`}n+="</tr>"}n+="</table>",e.innerHTML=n}if(t&&o&&o.placed.length){let n=o.placed.filter(c=>c.dir==="across").sort((c,f)=>c.num-f.num),l=o.placed.filter(c=>c.dir==="down").sort((c,f)=>c.num-f.num),d=c=>c.map(f=>`<div class="clue-row"><span class="clue-num-bold">${f.num}.</span><span>${f.clue} <span class="notes-clue-length">(${f.word.length})</span></span></div>`).join(""),a='<div class="clues-two-col">';if(n.length&&(a+=`<div class="clue-col"><div class="clue-group-title first">ACROSS</div>${d(n)}</div>`),l.length&&(a+=`<div class="clue-col"><div class="clue-group-title first">DOWN</div>${d(l)}</div>`),a+="</div>",r.cwShowBank){let c=o.placed.map(p=>p.word).sort(),f=c.reduce((p,w)=>Math.max(p,w.length),0),u=4;f>10&&(u=3),f>15&&(u=2),a+=`<div style="border-top:1px solid #cbd5e1; margin-top:20px; padding-top:20px;">
                <div class="word-bank-styled" style="column-count:${u}; display:block; column-gap:20px;">
                    ${c.map(p=>`<div class="wb-item" style="margin-bottom:6px"><span class="wb-check"></span> ${p}</div>`).join("")}
                </div>
            </div>`}t.innerHTML=a,s&&Ht(t)}}function Ht(e){let t=e.closest(".page");if(!t)return;let o=e.querySelector(".clues-two-col");if(!o)return;o.style.fontSize="";let r=parseFloat(getComputedStyle(t).minHeight);if(t.scrollHeight<=r+2)return;let s=parseFloat(getComputedStyle(o).fontSize),i=5.5,n=s*.75;for(;t.scrollHeight>r+2&&n>i;)n=Math.max(i,n-.25),o.style.fontSize=n+"pt"}function st(e,t,o){if(!e)return;if(!t||!t.length){e.innerHTML='<div style="color:var(--text-muted)">No Data</div>';return}let r=t,s=o.scrShowHint,i='<div class="scramble-container">';r.forEach(n=>{i+=`<div class="scramble-item">
            <div class="scramble-text">${n.scrambled}</div>
            <div class="scramble-line"></div>
            ${s?`<div class="scramble-hint">(${n.original[0]}...)</div>`:""}
        </div>`}),i+="</div>",e.innerHTML=i}function nt(e,t,o,r,s){if(!e)return;rt(r);let i=t.notes||o.map(a=>({term:a.word,clue:a.clue}));if(i.length===0){e.innerHTML='<div style="text-align:center; color:var(--text-muted); padding:40px;">No words added yet.</div>';return}let n=r.notesConfig.shuffle,l="notes-table";r.notesConfig.showTerm||(l+=" hide-term"),r.notesConfig.showDef||(l+=" hide-def");let d=`<div class="${l}">
        <div class="notes-header">
            <span class="notes-num" style="${n?"width:60px":""}">#</span>
            <span class="notes-word-header">TERM</span>
            <span class="notes-clue-header">DEFINITION</span>
        </div>`;i.forEach((a,c)=>{d+='<div class="notes-row">',d+=n?`<span class="notes-num" style="width:60px">${c+1}. ____</span>`:`<span class="notes-num">${c+1}.</span>`,d+=`<div class="notes-word"><div class="notes-editable" ${n?"":'contenteditable="true"'} ${n?"":`onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="window._puzzleApp.updateWord(${c}, 'word', this.innerText)"`}>${a.term}</div></div>`,d+='<div class="notes-clue">',n?(d+=`<div class="notes-editable">${a.matchLetter}. ${a.clue}</div>`,d+=`<span class="notes-clue-length">(${a.term.length})</span>`):(d+=`<div class="notes-editable" contenteditable="true" onkeydown="if(event.key==='Enter'){event.preventDefault();this.blur()}" onblur="window._puzzleApp.updateWord(${c}, 'clue', this.innerText)">${a.clue}</div>`,d+=`<span class="notes-clue-length">(${a.term.length})</span>`),d+="</div></div>"}),d+="</div>",e.innerHTML=d}function Te(e){rt(e)}function rt(e){let t=e.notesConfig,o=t.termWidth,r=document.getElementById("notesWidthVal");r&&(r.innerText=o+"%"),document.documentElement.style.setProperty("--notes-term-width",o+"%");let s=document.querySelector(".notes-table");s&&(s.classList.toggle("hide-term",!t.showTerm),s.classList.toggle("hide-def",!t.showDef))}function it(e,t,o){if(!e)return;let r=t.ws&&t.ws.placed.length>0,s=t.cw&&t.cw.placed.length>0,i=t.scr&&t.scr.length>0,n=o.notesConfig.shuffle,l=(r?1:0)+(s?1:0)+(i?1:0)+(n?1:0);if(l===0){e.innerHTML='<div style="text-align:center; padding:40px; color:var(--text-muted);">No answer keys to display</div>';return}e.className=l>2?"split-grid":"split-page";let d=300,a="";if(r){let c='<div class="split-half"><div class="split-title">WORD SEARCH</div>',f=t.ws,u=Math.min(16,Math.floor(d/f.size));c+=`<div style="flex:1; display:flex; justify-content:center; align-items:center;">
            <div class="pdf-force-key">
            <div class="grid mode-search" style="grid-template-columns: repeat(${f.size},${u}px); grid-template-rows: repeat(${f.size},${u}px);">`;for(let p=0;p<f.size;p++)for(let w=0;w<f.size;w++){let x=f.solution.has(`${w},${p}`)?" found":"";c+=`<div class="cell${x}" style="--cell-size: ${u}px">${f.grid[p][w]}</div>`}c+="</div></div></div></div>",a+=c}if(s){let c='<div class="split-half"><div class="split-title">CROSSWORD</div>',f=t.cw,u=Math.min(16,Math.floor(d/Math.max(f.cols,f.rows)));c+=`<div style="flex:1; display:flex; justify-content:center; align-items:center;">
            <table class="mode-cw key-overlay pdf-force-key" style="--cell-size: ${u}px">`;for(let p=0;p<f.rows;p++){c+="<tr>";for(let w=0;w<f.cols;w++){let x=f.grid[p][w];x?c+=`<td class="cell" style="width:${u}px; height:${u}px"><span class="cell-num">${x.num||""}</span><span class="cell-char">${x.char}</span></td>`:c+=`<td class="cell empty" style="width:${u}px; height:${u}px"></td>`}c+="</tr>"}c+="</table></div></div>",a+=c}if(i){let c='<div class="split-half"><div class="split-title">WORD SCRAMBLE</div><div class="scramble-solution">';t.scr.forEach(f=>{c+=`<div class="scr-sol-row"><span>${f.scrambled}</span><b>${f.original}</b></div>`}),c+="</div></div>",a+=c}if(n&&t.notes){let c='<div class="split-half"><div class="split-title">MATCHING KEY</div><div class="scramble-solution">';t.notes.forEach((f,u)=>{c+=`<div class="scr-sol-row"><span>${u+1}.</span><b style="color:var(--danger)">${f.correctLetter}</b></div>`}),c+="</div></div>",a+=c}e.innerHTML=a}U();Z();var Ie={},Bt={ComicNeue:"comic-neue",Lora:"lora",Roboto:"roboto",Inter:"inter"},lt={"'Comic Neue', cursive":"ComicNeue","'Lora', serif":"Lora","'Roboto', sans-serif":"Roboto","'Inter', sans-serif":"Inter"};async function at(){return window.jspdf?window.jspdf:new Promise((e,t)=>{let o=document.createElement("script");o.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",o.onload=()=>e(window.jspdf),o.onerror=()=>{t(new Error("PDF engine failed to load"))},document.head.appendChild(o)})}async function Ce(e,t,o){let r=`${t}:${o}`,s=o>=700?"bold":"normal",i=`${t}-${s}.ttf`;if(Ie[r])return e.addFileToVFS(i,Ie[r]),e.addFont(i,t,s),!!e.getFontList()[t];let n=Bt[t];if(!n)return!1;let l=`https://cdn.jsdelivr.net/fontsource/fonts/${n}@latest/latin-${o}-normal.ttf`;try{let d=await fetch(l);if(!d.ok)throw new Error(`HTTP ${d.status}`);let a=new Uint8Array(await d.arrayBuffer()),c=(a[0]<<24|a[1]<<16|a[2]<<8|a[3])>>>0;if(c!==65536&&c!==1330926671&&c!==1953658213)throw new Error("Not a valid TTF");let f="",u=8190;for(let p=0;p<a.length;p+=u)f+=btoa(String.fromCharCode(...a.subarray(p,Math.min(p+u,a.length))));if(e.addFileToVFS(i,f),e.addFont(i,t,s),!e.getFontList()[t])throw new Error("jsPDF font registration failed");return Ie[r]=f,!0}catch(d){return console.warn(`PDF font load failed (${t} ${o}):`,d.message),!1}}function Fe(e,t,o,r,{PAGE_WIDTH:s,PAGE_HEIGHT:i,MARGIN:n},l={}){return{doc:e,PAGE_WIDTH:s,PAGE_HEIGHT:i,MARGIN:n,scale:r,mmToPt:c=>c*2.83465,pdfFont:t,wmImg:o,drawWatermark:()=>{if(!o)return;let c=l.wmOpacity!==void 0?l.wmOpacity:parseFloat(document.documentElement.style.getPropertyValue("--wm-opacity"))||.15;e.setGState(new e.GState({opacity:c}));let f=o.width/o.height,u=150,p=u/f;p>200&&(p=200,u=p*f),e.addImage(o,"PNG",(s-u)/2,(i-p)/2,u,p),e.setGState(new e.GState({opacity:1}))},notesConfig:l.notesConfig||{showTerm:!0,showDef:!0},wsInternalGrid:l.wsInternalGrid||!1,titleScale:l.titleScale||1}}function Pt(e){return/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(e)}function Nt(e,{fontSizePt:t,bold:o=!1,italic:r=!1,color:s=[0,0,0]}){let l=t*1.3333333333333333*3,d=Math.ceil(l*1.4),a=document.createElement("canvas");a.width=3e3,a.height=d;let c=a.getContext("2d"),f=o?"bold":"normal",u=r?"italic":"normal";c.font=`${u} ${f} ${l}px system-ui, -apple-system, sans-serif`,c.fillStyle=`rgb(${s.join(",")})`,c.textBaseline="bottom",c.fillText(e,0,d);let p=Math.min(Math.ceil(c.measureText(e).width)+4,3e3),w=document.createElement("canvas");w.width=p,w.height=d,w.getContext("2d").drawImage(a,0,0);let x=25.4/288;return{url:w.toDataURL("image/png"),widthMm:p*x,heightMm:d*x}}function Me(e,t,o,r,{fontSizePt:s,bold:i=!1,italic:n=!1,color:l=[0,0,0],pdfFont:d="helvetica",align:a="left"}){if(t)if(Pt(t)){let c=Nt(t,{fontSizePt:s,bold:i,italic:n,color:l}),f=a==="right"?o-c.widthMm:o;e.addImage(c.url,"PNG",f,r-c.heightMm,c.widthMm,c.heightMm)}else e.setFont(d,n?i?"bolditalic":"italic":i?"bold":"normal"),e.setFontSize(s),e.setTextColor(...l),e.text(t,o,r,{align:a})}function ee(e,t,o,r,s,i="",n){let{doc:l,PAGE_WIDTH:d,MARGIN:a,scale:c,pdfFont:f}=e;n=n||c;let u=e.titleScale||1;return Me(l,t.toUpperCase(),a,a+10*n,{fontSizePt:28*n*u,bold:!0,color:[15,23,42],pdfFont:f}),Me(l,o,a,a+18*n,{fontSizePt:11*n*u,italic:!0,color:[100,116,139],pdfFont:f}),s?(l.setFont(f,"bold"),l.setFontSize(12*n),l.setTextColor(220,20,60),l.text("TEACHER ANSWER KEY",d-a,a+10*n,{align:"right"})):(i&&(l.setFont(f,"bold"),l.setFontSize(9*n),l.setTextColor(99,102,241),l.text(i,d-a,a+4*n,{align:"right"})),l.setFont(f,"bold"),l.setFontSize(9*n),l.setTextColor(100,116,139),l.text("NAME:",d-70,a+8*n),l.setDrawColor(200),l.setLineWidth(.3),l.line(d-55,a+8*n,d-a,a+8*n),l.text("DATE:",d-70,a+18*n),l.line(d-55,a+18*n,d-a,a+18*n)),l.setDrawColor(15,23,42),l.setLineWidth(.4),l.line(a,a+22*c,d-a,a+22*c),Me(l,r.toUpperCase(),a,a+29*n,{fontSizePt:10*n,bold:!0,italic:!0,color:[100,116,139],pdfFont:f}),a+38*c}function ae(e,t,o,r,s,i,n){if(!t)return;let{doc:l,PAGE_HEIGHT:d,MARGIN:a,scale:c,mmToPt:f,pdfFont:u,drawWatermark:p}=e;n=n||c;let w=i?6:9,x=Math.min(o.w/t.size,o.h/t.size,w),F=x*t.size,I=o.x+(o.w-F)/2,L=i?o.y+(o.h-F)/2:o.y;l.setLineWidth(.3);let A=f(x)*.6,W=e.wsInternalGrid||!1;for(let v=0;v<t.size;v++)for(let h=0;h<t.size;h++){let g=I+h*x,T=L+v*x;!i&&W&&(l.setDrawColor(200),l.rect(g,T,x,x,"S")),l.setFont("courier","bold"),l.setFontSize(A),i?(l.setDrawColor(0),l.rect(g,T,x,x,"S"),t.solution.has(`${h},${v}`)?l.setTextColor(15,23,42):(l.setTextColor(200),l.setFont("courier","normal"))):l.setTextColor(15,23,42),l.text(t.grid[v][h],g+x/2,T+x/2,{align:"center",baseline:"middle"})}if(l.setDrawColor(15,23,42),l.setLineWidth(.5),l.rect(I,L,F,F,"S"),!i){let v=L+F+10*c;l.setFont(u,"normal"),l.setTextColor(15,23,42),l.setFontSize(9*n);let h=t.placed.map(b=>{if(s&&r){let y=r.find(z=>z.word===b);if(y)return`${y.clue} (${b.length})`}return b}),g=s?2:3,T=F/g,C=Math.ceil(h.length/g),B=I,E=v,H=2.5*c;h.forEach((b,y)=>{y>0&&y%C===0&&(B+=T,E=v);let z=l.splitTextToSize(b,T-8*c);E+z.length*4*n>d-a&&(l.addPage(),p(),E=a+10*c),l.setDrawColor(100),l.setLineWidth(.3),l.rect(B,E-H+.5*c,H,H,"S"),z.forEach((N,k)=>{l.text(N,B+5*c,E),k<z.length-1&&(E+=4*n)}),E+=6*n})}}function ce(e,t,o,r,s){if(!t||!t.placed.length)return;let{doc:i,PAGE_HEIGHT:n,PAGE_WIDTH:l,MARGIN:d,scale:a,mmToPt:c,pdfFont:f,drawWatermark:u}=e;s=s||a;let p=r?6:9,w=Math.min(o.w/t.cols,o.h/t.rows,p),x=w*t.cols,F=w*t.rows,I=o.x+(o.w-x)/2,L=r?o.y+(o.h-F)/2:o.y;i.setDrawColor(15,23,42),i.setLineWidth(.4);let A=Math.max(7.5,c(w)*.42),W=c(w)*.65;for(let v=0;v<t.rows;v++)for(let h=0;h<t.cols;h++){let g=t.grid[v][h];if(g){let T=I+h*w,C=L+v*w;i.setFillColor(255,255,255),i.rect(T,C,w,w,"FD"),g.num&&!r&&(i.setFont(f,"normal"),i.setFontSize(A),i.setTextColor(15,23,42),i.text(g.num.toString(),T+w*.08,C+w*.08,{baseline:"top"})),r&&(i.setFont(f,"bold"),i.setFontSize(W),i.setTextColor(220,20,60),i.text(g.char,T+w/2,C+w/2+w*.05,{align:"center",baseline:"middle"}))}}if(!r){let v=L+F+10*a,h=t.placed.filter(y=>y.dir==="across").sort((y,z)=>y.num-z.num),g=t.placed.filter(y=>y.dir==="down").sort((y,z)=>y.num-z.num),T=o.w/2,C=n-d-v,B=(y,z)=>{let N=z*4/9,k=z*1.5/9,R=5*s;return i.setFontSize(z),y.forEach(P=>{let oe=i.splitTextToSize(`${P.num}. ${P.clue} (${P.word.length})`,T-10*a);R+=oe.length*N+k}),R},E=9*s,H=5;if(C>0)for(;E>H&&!(Math.max(B(h,E),B(g,E))<=C);)E=Math.max(H,E-.25);let b=(y,z,N)=>{if(!z.length)return;let k=v;i.setFont(f,"bold"),i.setFontSize(10*s),i.setTextColor(15,23,42),i.text(y,N,k),i.setDrawColor(100,116,139),i.setLineWidth(.15),i.line(N,k+1.5*a,N+T-4*a,k+1.5*a),k+=5*s;let $=E*4/9,R=E*1.5/9;i.setFont(f,"normal"),i.setFontSize(E),i.setTextColor(15,23,42),z.forEach(P=>{i.splitTextToSize(`${P.num}. ${P.clue} (${P.word.length})`,T-10*a).forEach(It=>{i.text(It,N,k),k+=$}),k+=R})};b("ACROSS",h,o.x),b("DOWN",g,o.x+T)}}function de(e,t,o,r,s,i){if(!t||!t.length)return;let{doc:n,scale:l,pdfFont:d}=e;if(i=i||l,r){let c=Math.ceil(t.length/2),f=o.w/2,u=Math.min(8*l,o.h/c);n.setFontSize(Math.min(u*2.5,Math.max(8,u*1.5)*i));let p=o.x,w=o.y+u;t.forEach((x,F)=>{F>0&&F%c===0&&(p+=f,w=o.y+u);let I=p+f*.45;n.setFont("courier","bold"),n.setTextColor(15,23,42),n.text(x.scrambled,p+5*l,w,{align:"left"}),n.setDrawColor(100,116,139),n.setLineWidth(.2),n.line(I,w+1,p+f-2,w+1),n.setFont(d,"bold"),n.setTextColor(220,20,60),n.text(x.original,p+f-2,w,{align:"right"}),w+=u})}else{let a=o.y+10*l,c=o.x,f=o.w/2;t.forEach(u=>{a>e.PAGE_HEIGHT-e.MARGIN-10*l&&(a=o.y+10*l,c+=f),n.setFont("courier","bold"),n.setFontSize(14*i),n.setTextColor(15,23,42);let p=c+f*.4;n.text(u.scrambled,c+10*l,a,{align:"left"}),n.setDrawColor(15,23,42),n.setLineWidth(.4);let w=s?c+f-20*l:c+f-10*l;n.line(p,a+2*l,w,a+2*l),s&&(n.setFont(d,"normal"),n.setFontSize(10*i),n.setTextColor(100,116,139),n.text(`(${u.original[0]}...)`,w+3*l,a,{align:"left"})),a+=12*i})}}function ct(e,t,o,r){let{doc:s,PAGE_WIDTH:i,PAGE_HEIGHT:n,MARGIN:l,scale:d,pdfFont:a,drawWatermark:c,notesConfig:f}=e;r=r||d;let u=o,p=i-l*2,w=t.length>0&&t[0].matchLetter!==void 0,x=f?f.showTerm!==!1:!0,F=f?f.showDef!==!1:!0,I=w?22:10,L=(f?.termWidth||20)/100,A=Math.max(28,(p-I)*L),W=l+I,v=W+A,h=p-I-A;s.setFont(a,"bold"),s.setFontSize(10*r),s.setTextColor(100,116,139),s.text("#",l,u),x&&s.text("TERM",W,u),F&&s.text("DEFINITION",v,u),s.setDrawColor(15,23,42),s.setLineWidth(.4),s.line(l,u+2*d,i-l,u+2*d),u+=8*r,s.setTextColor(15,23,42),t.forEach((g,T)=>{let C=w?`${T+1}. ____`:`${T+1}.`,B=w?`${g.matchLetter}. ${g.clue} (${g.term.length})`:`${g.clue} (${g.term.length})`;s.setFont(a,"bold");let E=x?s.splitTextToSize(g.term,A-4):[];s.setFont(a,"normal");let H=F?s.splitTextToSize(B,h):[],b=Math.max(E.length,H.length,1);u+b*4.5*r>n-l&&(s.addPage(),c(),u=l+10*d),s.setFont(a,"bold"),s.setTextColor(100,116,139),s.text(C,l,u),s.setTextColor(15,23,42),x&&s.text(E,W,u),s.setFont(a,"normal"),F&&s.text(H,v,u),u+=b*4.5*r+2*r,s.setDrawColor(226,232,240),s.setLineWidth(.15),s.line(l,u-1.5*r,i-l,u-1.5*r),u+=2.5*r})}function dt(e,t,o,r,s,i){let{doc:n,PAGE_WIDTH:l,PAGE_HEIGHT:d,MARGIN:a,scale:c,pdfFont:f,drawWatermark:u}=e;i=i||c,n.setFont(f,"bold"),n.setFontSize(28*i),n.setTextColor(15,23,42),n.text(t.toUpperCase(),a,a+10*i),n.setFont("helvetica","italic"),n.setFontSize(11*i),n.setTextColor(100,116,139),n.text(o,a,a+18*i),n.setFont(f,"bold"),n.setFontSize(12*i),n.setTextColor(220,20,60),n.text("TEACHER ANSWER KEY",l-a,a+10*i,{align:"right"}),n.setDrawColor(15,23,42),n.setLineWidth(.4),n.line(a,a+25*c,l-a,a+25*c);let p=a+35*c,w=r.notes?.length>0&&r.notes[0].matchLetter!==void 0,x=l-2*a,F=d-p-a,I=(x-10)/2,L=(F-10)/2,A=[{x:a,y:p,w:I,h:L},{x:a+I+10,y:p,w:I,h:L},{x:a,y:p+L+10,w:I,h:L},{x:a+I+10,y:p+L+10,w:I,h:L}],W=(h,g)=>(n.setLineDashPattern([2,2],0),n.setDrawColor(200),n.setLineWidth(.15),n.roundedRect(g.x,g.y,g.w,g.h,4,4,"S"),n.setLineDashPattern([],0),n.setFont(f,"bold"),n.setFontSize(10*i),n.setTextColor(99,102,241),n.text(h,g.x+5*c,g.y+8*i),n.setDrawColor(99,102,241),n.setLineWidth(.15),n.line(g.x+5*c,g.y+11*c,g.x+g.w-5*c,g.y+11*c),{x:g.x+5*c,y:g.y+15*c,w:g.w-10*c,h:g.h-(15*c+5)}),v=0;if(s.ws&&r.ws){let h=W("WORD SEARCH",A[v]);ae(e,r.ws,h,null,!1,!0,i),v++}if(s.cw&&r.cw){let h=W("CROSSWORD",A[v]);ce(e,r.cw,h,!0,i),v++}if(s.scr&&r.scr){let h=W("WORD SCRAMBLE",A[v]),g={...h,y:h.y+5*c,h:h.h-5*c};de(e,r.scr,g,!0,!1,i),v++}if(s.notes&&w&&r.notes){let h=W("MATCHING KEY",A[v]),g=3,T=Math.ceil(r.notes.length/g),C=h.w/g,B=Math.min(8*c,h.h/T);n.setFontSize(Math.max(8,B*1.5*i));let E=h.x,H=h.y+B;r.notes.forEach((b,y)=>{y>0&&y%T===0&&(E+=C,H=h.y+B),n.setTextColor(15,23,42),n.text(`${y+1}. `,E+2,H),n.setFont(f,"bold"),n.setTextColor(220,20,60),n.text(b.correctLetter,E+12*c,H),n.setFont(f,"normal"),H+=B})}}var me=!1,mt=e=>{let t="",o=e;for(;o>=0;)t=String.fromCharCode(65+o%26)+t,o=Math.floor(o/26)-1;return t};async function Rt(){let e=await le(m.settings);if(!e)return null;let t=m.settings.notesConfig.shuffle,o=m.words.map((r,s)=>({term:r.word,clue:r.clue,origIdx:s}));if(t){let r=[...o].sort(()=>Math.random()-.5);o=o.map((s,i)=>({term:s.term,clue:r[i].clue,matchLetter:mt(i),correctLetter:mt(r.findIndex(n=>n.origIdx===s.origIdx)),origIdx:s.origIdx,clueOrigIdx:r[i].origIdx}))}return e.notes=o,e}async function Le(){if(me)return;if(m.words.length===0){M("Please add words first.","error");return}G(),me=!0;let e=document.getElementById("export-btn-main");e&&(e.disabled=!0);let t=m.settings,o=t.pageOrder||["notes","ws","cw","scr","key"],r=t.opts,s=o.filter(p=>r[p]);if(s.length===0){M("Select at least one page.","error"),me=!1,e&&(e.disabled=!1);return}let i=document.getElementById("loading-overlay"),n=document.getElementById("loading-text"),l=document.getElementById("loading-progress"),d=t.title||"Puzzle",a=t.sub||"",c=(()=>{let p=document.getElementById("bulkCount");return p?parseInt(p.value,10):1})(),f=(()=>{let p=document.getElementById("exportFilename");return p?p.value:"MyPuzzle"})().replace(/[^a-z0-9-_]/gi,"_"),u=t.scrShowHint;i&&(i.style.display="flex",i.style.opacity="1"),n&&(n.innerText="Starting Export...");try{n&&(n.innerText="Loading PDF Engine...");let p=await at(),{jsPDF:w}=p,x=t.paperSize||"a4",F=x==="letter",I=F?215.9:210,L=F?279.4:297,A=new w({unit:"mm",format:x,orientation:"portrait"}),W=15,v=parseFloat(t.globalFontScale)||1,h=b=>{let y=t.scales?.[b.toLowerCase()];return v*(y!==void 0&&parseFloat(y)||1)},g="helvetica",T=null;m.watermarkSrc&&(T=await new Promise(b=>{let y=new Image;y.onload=()=>b(y),y.onerror=()=>b(null),y.src=m.watermarkSrc}));let C=Fe(A,g,T,v,{PAGE_WIDTH:I,PAGE_HEIGHT:L,MARGIN:W},t),B=t.font||"'Inter', sans-serif",E=lt[B];if(E){n&&(n.innerText="Loading fonts...");try{await Ce(A,E,400)&&(await Ce(A,E,700),g=E)}catch{}}C=Fe(A,g,T,v,{PAGE_WIDTH:I,PAGE_HEIGHT:L,MARGIN:W},t);let H=!0;for(let b=0;b<c;b++){n&&(n.innerText=`Generating Set ${b+1}/${c}`),l&&(l.style.width=Math.round(b/c*100)+"%"),await new Promise(k=>setTimeout(k,10));let y=await Rt();if(!y){b--;continue}let z=c>1?`SET ${b+1}`:"",N=()=>{H||A.addPage(),H=!1,C.drawWatermark()};for(let k of s)if(await new Promise($=>setTimeout($,0)),k==="notes"){N();let $=h("notes"),P=t.notesConfig?.shuffle?"\u{1F0CF} VOCABULARY MATCHING - MATCH EACH TERM TO ITS CORRECT DEFINITION.":"\u{1F4CB} LIST OF TERMS AND DEFINITIONS.",oe=ee(C,d,a,P,!1,z,$);ct(C,y.notes,oe,$)}else if(k==="ws"){N();let $=h("ws"),R=ee(C,d,a,"\u{1F50D} WORD SEARCH - HIGHLIGHT THE WORDS LISTED IN THE GRID.",!1,z,$),P={x:W,y:R,w:I-2*W,h:L-R-30*v};ae(C,y.ws,P,m.words,t.wsUseClues,!1,$)}else if(k==="cw"){N();let $=h("cw"),R=ee(C,d,a,"\u270F\uFE0F CROSSWORD - USE THE CLUES PROVIDED TO FILL IN THE GRID.",!1,z,$),P={x:W,y:R,w:I-2*W,h:(L-R)*.55};ce(C,y.cw,P,!1,$)}else if(k==="scr"){N();let $=h("scr"),R=ee(C,d,a,"\u{1F500} WORD SCRAMBLE - UNSCRAMBLE THE LETTERS TO FIND THE WORDS.",!1,z,$),P={x:W,y:R,w:I-2*W,h:L-R};de(C,y.scr,P,!1,u,$)}else if(k==="key"){N();let $=h("key");dt(C,d,a,y,r,$)}}n&&(n.innerText="Saving Vector PDF..."),l&&(l.style.width="100%"),await new Promise(b=>setTimeout(b,100)),A.save(f+".pdf"),M("PDF exported successfully!")}catch(p){console.error(p),M("PDF export failed. Check internet connection for required libraries.","error")}finally{me=!1,e&&(e.disabled=!1),i&&(i.style.opacity="0",setTimeout(()=>i.style.display="none",300))}}Z();ze();function ut(){let e=document.getElementById("sidebar-resizer");if(!e)return;let t=!1;e.addEventListener("mousedown",()=>{t=!0,document.body.style.userSelect="none",document.body.style.cursor="col-resize",e.classList.add("active")}),document.addEventListener("mousemove",o=>{if(!t)return;let r=Math.max(300,Math.min(650,o.clientX));document.documentElement.style.setProperty("--sidebar-width",r+"px")}),document.addEventListener("mouseup",()=>{t&&(t=!1,document.body.style.userSelect="",document.body.style.cursor="",e.classList.remove("active"),S())})}function Ae(){document.body.classList.toggle("sidebar-closed")}function ke(e){["content","design","export"].forEach(o=>{let r=document.getElementById("panel-"+o);r&&(r.style.display="none")});let t=document.getElementById("panel-"+e);t&&(t.style.display="block"),document.querySelectorAll(".nav-tab").forEach(o=>{let r=o.dataset.tab===e;o.classList.toggle("active",r),o.setAttribute("aria-selected",r?"true":"false"),o.setAttribute("tabindex",r?"0":"-1")})}function $e(){let e=document.body.getAttribute("data-theme")==="dark";document.body.setAttribute("data-theme",e?"light":"dark");let t=document.getElementById("btn-dark");t&&(t.innerHTML=e?'<i class="fas fa-moon"></i>':'<i class="fas fa-sun"></i>'),S()}U();function Oe(e){Ye(m.currentZoom+e),document.querySelectorAll(".page").forEach(t=>{t.style.transform=`scale(${m.currentZoom})`}),S()}function pt(){let e=document.getElementById("page-order-list");if(!e)return;let t=null;e.addEventListener("dragstart",o=>{t=o.target.closest(".sortable-item"),o.dataTransfer.effectAllowed="move",setTimeout(()=>t.classList.add("dragging"),0)}),e.addEventListener("dragend",()=>{t.classList.remove("dragging"),t=null,S()}),e.addEventListener("dragover",o=>{o.preventDefault();let r=_t(e,o.clientY),s=document.querySelector(".dragging");r==null?e.appendChild(s):e.insertBefore(s,r)}),e.querySelectorAll(".sortable-item").forEach(o=>{o.setAttribute("tabindex","0"),o.addEventListener("keydown",r=>{if(!r.altKey||!["ArrowUp","ArrowDown"].includes(r.key))return;r.preventDefault();let s=[...e.querySelectorAll(".sortable-item")],i=s.indexOf(o);r.key==="ArrowUp"&&i>0?e.insertBefore(o,s[i-1]):r.key==="ArrowDown"&&i<s.length-1&&e.insertBefore(s[i+1],o),o.focus(),S()})})}function _t(e,t){return[...e.querySelectorAll(".sortable-item:not(.dragging)")].reduce((r,s)=>{let i=s.getBoundingClientRect(),n=t-i.top-i.height/2;return n<0&&n>r.offset?{offset:n,element:s}:r},{offset:Number.NEGATIVE_INFINITY}).element}var He=null;function gt(e){He=e;let t;document.addEventListener("dragover",o=>{if(wt(o)){o.preventDefault();let r=document.getElementById("drop-zone");r&&r.classList.add("active"),clearTimeout(t)}}),document.addEventListener("dragleave",o=>{wt(o)&&(o.preventDefault(),t=setTimeout(()=>{let r=document.getElementById("drop-zone");r&&r.classList.remove("active")},100))}),document.addEventListener("drop",o=>{let r=document.getElementById("drop-zone");r&&r.classList.remove("active"),o.dataTransfer.files&&o.dataTransfer.files.length>0&&(o.preventDefault(),He&&He(o.dataTransfer.files[0]))})}function wt(e){return e.dataTransfer.types&&(e.dataTransfer.types.includes("Files")||e.dataTransfer.types.includes("application/x-moz-file"))}ht();U();Z();function Pe(){let e=JSON.stringify({words:m.words}),t=document.createElement("a");t.href="data:text/json;charset=utf-8,"+encodeURIComponent(e),t.download="puzzle-config.json",t.click(),M("Configuration saved")}var Dt=15,Gt=60,Ut=2e6;var Ne=(e,t)=>{let o;return(...r)=>{clearTimeout(o),o=setTimeout(()=>e(...r),t)}},yt=e=>{let t="",o=e;for(;o>=0;)t=String.fromCharCode(65+o%26)+t,o=Math.floor(o/26)-1;return t};async function jt(){let e=await le(m.settings);if(!e)return null;let t=m.settings.notesConfig.shuffle,o=m.words.map((r,s)=>({term:r.word,clue:r.clue,origIdx:s}));if(t){let r=[...o].sort(()=>Math.random()-.5);o=o.map((s,i)=>({term:s.term,clue:r[i].clue,matchLetter:yt(i),correctLetter:yt(r.findIndex(n=>n.origIdx===s.origIdx)),origIdx:s.origIdx,clueOrigIdx:r[i].origIdx}))}return e.notes=o,e}var xt=0;async function O(){G();let e=++xt;Je();let t=await jt();e!==xt||!t||(Xe(t),ue("search",!0),ue("crossword",!0),ge(),te(),J())}var pe=Ne(O,500),Xt=Ne(()=>{S(),we()},500),Yt=Ne(J,200);function qt(e,t=!1){let o=t?750:640,r=e==="search"?680:500,s,i;return e==="search"?s=i=Math.max(1,m.puzzleData.ws?.size||1):(s=Math.max(1,m.puzzleData.cw?.cols||1),i=Math.max(1,m.puzzleData.cw?.rows||1)),Math.min(Gt,Math.max(Dt,Math.floor(Math.min(o/s,r/i))))}function ue(e,t=!1){let o=document.getElementById(e==="search"?"scaleSearch":"scaleCrossword");o&&(o.value=qt(e),t||(J(),M("Auto-fitted!")))}function J(){G();let e=m.puzzleData,t=m.settings,o=m.words;nt(document.getElementById("p1-notes"),e,o,t,(r,s,i)=>xe(r,s,i)),et(document.getElementById("p2-area"),document.getElementById("p2-footer"),e.ws,o,t,!0),ot(document.getElementById("p3-area"),document.getElementById("p3-footer"),e.cw,t,!0),st(document.getElementById("p4-area"),e.scr,t),it(document.getElementById("key-container"),e,t),he()}function te(){let e=document.getElementById("wordList");Ke(e,m.words,m.puzzleData,m.activePage,xe,je),Ve(m.words,m.puzzleData,m.activePage)}function we(){let e=document.getElementById("fontSelect");e&&document.documentElement.style.setProperty("--user-font",e.value);let t=document.getElementById("titleInput")?.value||"Vocabulary Quiz",o=document.getElementById("subInput")?.value||"Unit Review";document.querySelectorAll(".disp-title").forEach(r=>r.innerText=t),document.querySelectorAll(".disp-sub").forEach(r=>r.innerText=o),ge()}function ge(){let e=document.getElementById("p1-instruction");if(!e)return;let t=document.getElementById("notesShuffle")?.checked??m.settings.notesConfig.shuffle;e.innerText=t?"\u{1F0CF} VOCABULARY MATCHING - MATCH EACH TERM TO ITS CORRECT DEFINITION.":"\u{1F4CB} LIST OF TERMS AND DEFINITIONS."}function he(){let e=(i,n)=>{let l=document.getElementById(i);return l?l.value:n},t=e("wsOpacity",1),o=e("cwOpacity",1),r=e("wsLineWidth",1),s=e("cwLineWidth",1);document.documentElement.style.setProperty("--ws-bg-color",`rgba(255,255,255,${t})`),document.documentElement.style.setProperty("--cw-bg-color",`rgba(255,255,255,${o})`),document.documentElement.style.setProperty("--ws-line-width",r+"px"),document.documentElement.style.setProperty("--cw-line-width",s+"px"),document.documentElement.style.setProperty("--ws-neg-margin",-1*parseFloat(r)+"px"),document.documentElement.style.setProperty("--cw-neg-margin",-1*parseFloat(s)+"px"),document.querySelectorAll(".mode-search.grid").forEach(i=>{i.style.paddingTop=r+"px",i.style.paddingLeft=r+"px"}),S()}function Re(){let e=document.getElementById("globalFontScale");if(e){let t=document.getElementById("globalFontScaleVal");t&&(t.innerText=parseFloat(e.value).toFixed(2)+"x"),document.documentElement.style.setProperty("--global-font-scale",e.value),S()}}function _e(){let e=document.getElementById("titleScale");if(!e)return;let t=parseFloat(e.value),o=document.getElementById("titleScaleVal");o&&(o.innerText=t.toFixed(2)+"x"),document.documentElement.style.setProperty("--title-scale",t),S()}function De(){let t=(document.getElementById("paperSize")?.value||"a4")==="letter";document.documentElement.style.setProperty("--page-width",t?"215.9mm":"210mm"),document.documentElement.style.setProperty("--page-height",t?"279.4mm":"297mm"),S()}function St(e){m.activePage!==e&&ye(e)}function Ge(){["Notes","WS","CW","Scr","Key"].forEach(e=>{let t=document.getElementById("scale"+e+"Font");if(t){let o=parseFloat(t.value).toFixed(2);document.getElementById("scale"+e+"FontVal").innerText=o+"x",document.documentElement.style.setProperty("--scale-"+e.toLowerCase(),o)}}),S(),J()}function ye(e){m.activePage=e,document.querySelectorAll(".page").forEach(o=>o.classList.remove("visible"));let t=document.getElementById("page"+e);t&&t.classList.add("visible"),document.querySelectorAll(".page-btn").forEach((o,r)=>o.classList.toggle("active",r+1===e)),J(),te()}function xe(e,t,o){if(t==="word"){D();let r=o.toUpperCase().replace(/[^A-Z]/g,"");m.words[e][t]=r;let s=document.getElementById("wsGridSize");if(s){let i=parseInt(s.value,10);if(r.length>i){let n=Math.min(25,r.length);s.value=n,r.length>25?M("Word exceeds max grid size. It may not fit.","error"):M(`Grid resized to ${n}`)}}S(),pe()}else m.words[e][t]=o,S(),Yt()}function Ue(){D(),m.words.push({word:"",clue:""}),te(),S(),setTimeout(()=>{let e=document.getElementById("wordList");e&&(e.scrollTop=e.scrollHeight);let t=document.querySelectorAll(".wm-word");t.length&&t[t.length-1].focus()},50)}function je(e){D(),m.words.splice(e,1),S(),O()}function Zt(e){if(e<=0||e>=m.words.length)return;D();let t=m.words[e];m.words[e]=m.words[e-1],m.words[e-1]=t,te(),S(),pe()}function Kt(e){if(e<0||e>=m.words.length-1)return;D();let t=m.words[e];m.words[e]=m.words[e+1],m.words[e+1]=t,te(),S(),pe()}function vt(){confirm(`Clear all ${m.words.length} words? This cannot be undone.`)&&(D(),X([]),S(),O())}function bt(e){if(!e.files[0])return;if(e.files[0].size>Ut){M("Image must be smaller than 2MB.","error"),e.value="";return}let t=new FileReader;t.onload=o=>{m.watermarkSrc="",document.querySelectorAll(".watermark-img").forEach(r=>{r.src="",r.style.display="none"}),m.watermarkSrc=o.target.result,document.querySelectorAll(".watermark-img").forEach(r=>{r.closest("#page5")||(r.src=m.watermarkSrc,r.style.display="block")}),S(),M("Watermark added")},t.onerror=()=>{M("Failed to read image file.","error"),e.value=""},t.readAsDataURL(e.files[0])}function Et(e){document.documentElement.style.setProperty("--wm-opacity",e),S()}function Tt(){m.watermarkSrc="",document.querySelectorAll(".watermark-img").forEach(t=>t.style.display="none");let e=document.getElementById("bgUpload");e&&(e.value=""),S(),M("Watermark removed")}window._puzzleApp={generateAll:O,addWordRow:Ue,updateWord:xe,delWord:je,moveWordUp:Zt,moveWordDown:Kt,clearList:vt,openModal:e=>We(e),closeModal:K,processImport:()=>V(O),downloadConfig:Pe,loadConfigFromFile:e=>{let t=e.files[0];t&&Be(t,o=>{se(o),O()},()=>V(O)),e.value=""},exportPDF:Le,toggleDarkMode:$e,toggleSidebar:Ae,switchTab:ke,adjustZoom:e=>Oe(e),showPage:ye,autoFit:ue,updateUI:we,updateGridStyles:he,updateGlobalFontScale:Re,updateTitleScale:_e,updatePaperSize:De,updatePageScales:Ge,focusPage:St,updateNotesStyles:()=>{G(),Te(m.settings),S()},updateNotesInstruction:ge,handleImage:bt,updateOpacity:Et,clearWatermark:Tt,hardReset:()=>be(),undo:()=>ne(()=>{S(),O()}),redo:()=>re(()=>{S(),O()})};Object.assign(window,{generateAll:O,addWordRow:Ue,updateWord:xe,delWord:je,clearList:vt,openModal:e=>We(e),closeModal:K,processImport:()=>V(O),downloadConfig:Pe,exportPDF:Le,toggleDarkMode:$e,toggleSidebar:Ae,switchTab:ke,adjustZoom:e=>Oe(e),showPage:ye,autoFit:ue,updateUI:we,updateGridStyles:he,updateGlobalFontScale:Re,updateTitleScale:_e,updatePaperSize:De,updatePageScales:Ge,focusPage:St,updateNotesStyles:()=>{G(),Te(m.settings),S()},updateNotesInstruction:ge,handleImage:bt,updateOpacity:Et,clearWatermark:Tt,hardReset:()=>be(),undo:()=>ne(()=>{S(),O()}),redo:()=>re(()=>{S(),O()}),loadConfigFromFile:e=>window._puzzleApp.loadConfigFromFile(e),debouncedGenerate:pe,renderActivePage:J,debouncedUpdateUI:Xt,saveState:S});window.addEventListener("load",async()=>{let e=document.getElementById("loading-overlay");try{let t=Ze();t&&se(t),m.watermarkSrc&&document.querySelectorAll(".watermark-img").forEach(o=>{o.closest("#page5")||(o.src=m.watermarkSrc,o.style.display="block")}),D(),await O(),he(),Ge(),Re(),_e(),De(),we(),await new Promise(o=>setTimeout(o,300)),e&&(e.style.opacity="0"),setTimeout(()=>{e&&(e.style.display="none",e.style.opacity="1")},300)}catch(t){console.error("Init failed",t),e&&(e.style.display="none"),M("Failed to load saved settings.","error")}document.addEventListener("keydown",t=>{if((t.ctrlKey||t.metaKey)&&t.key==="Enter"&&Ue(),t.key==="Escape"){let s=document.getElementById("modal-overlay");s&&s.style.display==="flex"&&K()}let o=document.activeElement?.tagName,r=o==="INPUT"||o==="TEXTAREA"||document.activeElement?.isContentEditable;if((t.ctrlKey||t.metaKey)&&t.key==="z"&&!t.shiftKey&&!r&&(t.preventDefault(),ne(()=>{S(),O()})),(t.ctrlKey||t.metaKey)&&(t.key==="y"||t.key==="z"&&t.shiftKey)&&!r&&(t.preventDefault(),re(()=>{S(),O()})),!r&&!t.ctrlKey&&!t.metaKey&&!t.altKey){let s=parseInt(t.key,10);s>=1&&s<=5&&ye(s)}}),ut(),pt(),gt(t=>Be(t,o=>{se(o),O()},()=>V(O)))});window.addEventListener("orientationchange",()=>{setTimeout(()=>{window.innerWidth<=900&&document.body.classList.add("sidebar-closed")},100)});})();
