(()=>{var Q=(e,o)=>()=>(e&&(o=e(e=0)),o);function X(e){m.words=e}function Xe(e){m.puzzleData=e}function Ye(e){m.currentZoom=Math.max(.5,Math.min(2,e))}function G(){let e=(s,i)=>{let n=document.getElementById(s);return n?n.value:i},o=(s,i)=>{let n=document.getElementById(s);return n?n.checked:i},t=m.settings;t.theme=document.body.getAttribute("data-theme")||"light",t.title=e("titleInput",t.title),t.sub=e("subInput",t.sub),t.font=e("fontSelect",t.font),t.globalFontScale=parseFloat(e("globalFontScale",t.globalFontScale)),t.scales={notes:parseFloat(e("scaleNotesFont",t.scales.notes)),ws:parseFloat(e("scaleWSFont",t.scales.ws)),cw:parseFloat(e("scaleCWFont",t.scales.cw)),scr:parseFloat(e("scaleScrFont",t.scales.scr)),key:parseFloat(e("scaleKeyFont",t.scales.key))},t.wsSize=parseInt(e("wsGridSize",t.wsSize),10),t.wsDiag=o("wsDiag",t.wsDiag),t.wsBack=o("wsBack",t.wsBack),t.wsInternalGrid=o("wsInternalGrid",t.wsInternalGrid),t.wsOpacity=parseFloat(e("wsOpacity",t.wsOpacity)),t.wsLineWidth=parseFloat(e("wsLineWidth",t.wsLineWidth)),t.wsHardFiller=o("wsHardFiller",t.wsHardFiller),t.wsCustomFillers=e("wsCustomFillers",t.wsCustomFillers),t.wsUseClues=o("wsUseClues",t.wsUseClues),t.cwOpacity=parseFloat(e("cwOpacity",t.cwOpacity)),t.cwLineWidth=parseFloat(e("cwLineWidth",t.cwLineWidth)),t.cwShowBank=o("cwShowBank",t.cwShowBank),t.scrShowHint=o("scrShowHint",t.scrShowHint),t.titleScale=parseFloat(e("titleScale",t.titleScale)),t.paperSize=e("paperSize",t.paperSize),t.wmOpacity=parseFloat(document.documentElement.style.getPropertyValue("--wm-opacity")||t.wmOpacity),t.notesConfig={termWidth:parseFloat(e("notesTermWidth",t.notesConfig.termWidth)),showTerm:o("notesShowTerm",t.notesConfig.showTerm),showDef:o("notesShowDef",t.notesConfig.showDef),shuffle:o("notesShuffle",t.notesConfig.shuffle)},t.opts={ws:o("sel-ws",t.opts.ws),cw:o("sel-cw",t.opts.cw),scr:o("sel-scr",t.opts.scr),notes:o("sel-notes",t.opts.notes),key:o("sel-key",t.opts.key)};let r=document.querySelectorAll("#page-order-list .sortable-item");r.length&&(t.pageOrder=Array.from(r).map(s=>s.dataset.page)),t.sidebarWidth=document.documentElement.style.getPropertyValue("--sidebar-width")||t.sidebarWidth}function se(e){let o=(i,n)=>{let l=document.getElementById(i);l&&n!==void 0&&(l.value=n)},t=(i,n)=>{let l=document.getElementById(i);l&&n!==void 0&&(l.checked=n)};e.words&&(m.words=e.words);let r=e.watermarkSrc||e.settings?.watermarkSrc;if(r!==void 0&&(m.watermarkSrc=r),e.settings||e){let i=e.settings||e;Object.assign(m.settings,i),i.scales&&Object.assign(m.settings.scales,i.scales),i.opts&&Object.assign(m.settings.opts,i.opts),i.notesConfig&&Object.assign(m.settings.notesConfig,i.notesConfig)}let s=m.settings;if(s.theme){document.body.setAttribute("data-theme",s.theme);let i=document.getElementById("btn-dark");i&&(i.innerHTML=s.theme==="dark"?'<i class="fas fa-sun"></i>':'<i class="fas fa-moon"></i>')}if(o("titleInput",s.title),o("subInput",s.sub),o("fontSelect",s.font),o("globalFontScale",s.globalFontScale),s.scales&&(o("scaleNotesFont",s.scales.notes),o("scaleWSFont",s.scales.ws),o("scaleCWFont",s.scales.cw),o("scaleScrFont",s.scales.scr),o("scaleKeyFont",s.scales.key)),o("wsGridSize",s.wsSize),t("wsDiag",s.wsDiag),t("wsBack",s.wsBack),t("wsInternalGrid",s.wsInternalGrid),o("wsOpacity",s.wsOpacity),o("wsLineWidth",s.wsLineWidth),t("wsHardFiller",s.wsHardFiller),o("wsCustomFillers",s.wsCustomFillers),t("wsUseClues",s.wsUseClues),o("cwOpacity",s.cwOpacity),o("cwLineWidth",s.cwLineWidth),t("cwShowBank",s.cwShowBank),t("scrShowHint",s.scrShowHint),o("titleScale",s.titleScale),o("paperSize",s.paperSize),s.wmOpacity!==void 0&&document.documentElement.style.setProperty("--wm-opacity",s.wmOpacity),s.notesConfig&&(o("notesTermWidth",s.notesConfig.termWidth),t("notesShowTerm",s.notesConfig.showTerm),t("notesShowDef",s.notesConfig.showDef),t("notesShuffle",s.notesConfig.shuffle)),s.opts&&(t("sel-ws",s.opts.ws),t("sel-cw",s.opts.cw),t("sel-scr",s.opts.scr),t("sel-notes",s.opts.notes),t("sel-key",s.opts.key)),s.pageOrder&&s.pageOrder.length>0){let i=document.getElementById("page-order-list");if(i){let n={};Array.from(i.children).forEach(l=>{n[l.dataset.page]=l}),i.innerHTML="",s.pageOrder.forEach(l=>{n[l]&&i.appendChild(n[l])}),Object.keys(n).forEach(l=>{s.pageOrder.includes(l)||i.appendChild(n[l])})}}if(s.sidebarWidth&&document.documentElement.style.setProperty("--sidebar-width",s.sidebarWidth),e.zoom!==void 0||s.zoom!==void 0){let i=e.zoom??s.zoom;m.currentZoom=Math.max(.5,Math.min(2,parseFloat(i)||1)),document.querySelectorAll(".page").forEach(n=>{n.style.transform=`scale(${m.currentZoom})`})}}var m,U=Q(()=>{m={words:[{word:"GALAXY",clue:"A system of millions of stars"},{word:"PLANET",clue:"Celestial body orbiting a star"},{word:"ORBIT",clue:"The curved path of a celestial object"},{word:"COMET",clue:"Object of ice and dust"},{word:"NEBULA",clue:"Cloud of gas and dust"},{word:"GRAVITY",clue:"Force that attracts objects"}],puzzleData:{ws:null,cw:null,scr:null,notes:null},activePage:1,currentZoom:1,watermarkSrc:"",settings:{theme:"light",title:"Vocabulary Quiz",sub:"Unit Review",font:"'Inter', sans-serif",globalFontScale:1,scales:{notes:1,ws:1,cw:1,scr:1,key:1},wsSize:15,wsDiag:!0,wsBack:!0,wsInternalGrid:!1,wsOpacity:1,wsLineWidth:1,wsHardFiller:!1,wsCustomFillers:"",wsUseClues:!1,cwOpacity:1,cwLineWidth:1,cwShowBank:!1,scrShowHint:!1,wmOpacity:.15,titleScale:1,paperSize:"a4",notesConfig:{termWidth:20,showTerm:!0,showDef:!0,shuffle:!1},opts:{ws:!0,cw:!0,scr:!0,notes:!0,key:!0},pageOrder:["notes","ws","cw","scr","key"],sidebarWidth:"420px"}}});function D(){j=j.slice(0,_+1),j.push(JSON.parse(JSON.stringify(m.words))),j.length>Ct?j.shift():_++,xe()}function ne(e){_<=0||(_--,X(JSON.parse(JSON.stringify(j[_]))),xe(),e&&e())}function re(e){_>=j.length-1||(_++,X(JSON.parse(JSON.stringify(j[_]))),xe(),e&&e())}function Mt(){return _>0}function Ft(){return _<j.length-1}function xe(){let e=document.getElementById("btn-undo"),o=document.getElementById("btn-redo");e&&(e.disabled=!Mt()),o&&(o.disabled=!Ft())}var Ct,j,_,Se=Q(()=>{U();Ct=50,j=[],_=-1});function M(e,o="success"){let t=document.getElementById("toast-container");if(!t)return;t.setAttribute("aria-live",o==="error"?"assertive":"polite");let r=document.createElement("div");r.className=`toast ${o}`,r.innerHTML=`<i class="fas fa-${o==="success"?"check-circle":"exclamation-circle"}"></i> ${e}`,t.appendChild(r),setTimeout(()=>r.classList.add("show"),10),setTimeout(()=>{r.classList.remove("show"),setTimeout(()=>r.remove(),300)},3e3)}var Z=Q(()=>{});function ft(e){if(e.key!=="Tab")return;let o=document.querySelector(".modal");if(!o)return;let t=Array.from(o.querySelectorAll('button, textarea, input, [tabindex]:not([tabindex="-1"])')).filter(i=>!i.disabled);if(!t.length)return;let r=t[0],s=t[t.length-1];e.shiftKey?document.activeElement===r&&(e.preventDefault(),s.focus()):document.activeElement===s&&(e.preventDefault(),r.focus())}function Le(e){fe=e||document.activeElement;let o=document.getElementById("modal-overlay"),t=document.getElementById("import-text");o&&(o.style.display="flex",o.addEventListener("keydown",ft)),t&&t.focus()}function V(){let e=document.getElementById("modal-overlay");e&&(e.style.display="none",e.removeEventListener("keydown",ft)),fe&&(fe.focus(),fe=null)}var fe,We=Q(()=>{fe=null});function K(e){let o=document.getElementById("import-text");if(!o)return;let t=o.value;if(!t.trim())return;D();let r=[...m.words],s=new Set(r.map(i=>i.word));t.split(`
`).forEach(i=>{if(!i.trim())return;let n=i.match(/^([^-:,\t\s]+)[-:,\t\s]+(.*)$/),l,d;n&&n[1]?(l=n[1].trim().toUpperCase().replace(/[^A-Z0-9]/g,""),d=n[2].trim()||"Find the word"):(l=i.trim().toUpperCase().replace(/[^A-Z0-9]/g,""),d="Find the word"),l&&l.length>1&&!s.has(l)&&(r.push({word:l,clue:d}),s.add(l))}),X(r),V(),o.value="",M("Import successful"),e&&e()}function He(e,o,t){let r=new FileReader;r.onload=s=>{let i=s.target.result;if(e.name.endsWith(".json"))try{let n=JSON.parse(i);o&&o(n),M("Loaded config!")}catch{M("Invalid JSON config","error")}else{let n=document.getElementById("import-text");n&&(n.value=i,t?t():K())}},r.readAsText(e)}var ht=Q(()=>{U();Se();Z();We()});U();Se();U();Z();var ie="puzzleSuiteV60",Lt="puzzleSuiteV59",Wt=500,qe=null;function zt(){try{G();let e={words:m.words,settings:m.settings,zoom:m.currentZoom,watermarkSrc:m.watermarkSrc,theme:m.settings.theme,title:m.settings.title,sub:m.settings.sub};localStorage.setItem(ie,JSON.stringify(e))}catch(e){e.name==="QuotaExceededError"||e.message&&e.message.toLowerCase().includes("quota")?M("Storage full. Remove watermark image or reduce words.","error"):console.error("Save failed",e)}}function x(){clearTimeout(qe),qe=setTimeout(zt,Wt)}function Ze(){try{let e=localStorage.getItem(ie)||localStorage.getItem(Lt);return e?JSON.parse(e):null}catch{return localStorage.removeItem(ie),M("Saved data was corrupted and has been reset.","error"),null}}function ve(){localStorage.removeItem(ie),location.reload()}U();var At=`
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
`,Y=null,kt=0,$t=0,q={};function Ot(){if(Y)return Y;try{let e=new Blob([At],{type:"application/javascript"});Y=new Worker(URL.createObjectURL(e))}catch{return console.warn("Worker creation failed \u2014 running without generation worker."),Y=null,null}return Y.onmessage=e=>{let{id:o,result:t}=e.data;t&&t.ws&&(t.ws.solution=new Set(t.ws.solutionArray)),q[o]&&(q[o](t),delete q[o])},Y.onerror=e=>{console.error("Worker error:",e);for(let o in q)q[o](null),delete q[o]},Y}function le(e){let o=Ot();return o?new Promise(t=>{let r=++kt;$t=r,q[r]=t;let s=e||m.settings;o.postMessage({id:r,words:m.words,wsSize:s.wsSize||15,wsDiag:s.wsDiag??!0,wsBack:s.wsBack??!0,wsHard:s.wsHardFiller||!1,wsCustomFillers:s.wsCustomFillers||""})}):Promise.resolve(null)}var be=e=>e.replace(/[&<>'"]/g,o=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[o]);function Ve(e,o,t,r,s,i){if(!e)return;if(e.innerHTML="",o.length===0){e.innerHTML='<div class="empty-state"><i class="fas fa-feather-alt"></i><br>No words yet. Add some or import!</div>';return}let n="";o.forEach((l,d)=>{let a=t.ws?.placed.includes(l.word),c=t.cw?.placed.some(p=>p.word===l.word),f=t.scr?.some(p=>p.original===l.word),u;r===2?u=a?"placed":"failed":r===3?u=c?"placed":"failed":r===4?u=f?"placed":"failed":u=a||c?"placed":"failed",n+=`<div class="wm-row">
            <div class="wm-status ${u}"></div>
            <div style="display:flex; flex-direction:column; gap:2px; flex-shrink:0; padding-right:2px;">
                <button class="wm-btn" style="height:16px; width:16px; font-size:10px; padding:0" onclick="window._puzzleApp.moveWordUp(${d})" ${d===0?"disabled":""} aria-label="Move Up">
                    <i class="fas fa-chevron-up"></i>
                </button>
                <button class="wm-btn" style="height:16px; width:16px; font-size:10px; padding:0" onclick="window._puzzleApp.moveWordDown(${d})" ${d===o.length-1?"disabled":""} aria-label="Move Down">
                    <i class="fas fa-chevron-down"></i>
                </button>
            </div>
            <div style="flex:1">
                <input class="wm-input wm-word" value="${be(l.word)}"
                    onchange="window._puzzleApp.updateWord(${d},'word',this.value)"
                    placeholder="WORD" aria-label="Word ${d+1}">
            </div>
            <div style="flex:2">
                <input class="wm-input wm-clue" value="${be(l.clue)}"
                    onkeyup="window._puzzleApp.updateWord(${d},'clue',this.value)"
                    placeholder="Clue" aria-label="Clue for word ${d+1}">
            </div>
            <button class="wm-btn" onclick="window._puzzleApp.delWord(${d})"
                aria-label="Delete word ${be(l.word)||d+1}">
                <i class="fas fa-times"></i>
            </button>
        </div>`}),e.innerHTML=n}function Ke(e,o,t){let r=0;e.forEach(n=>{t===2?o.ws?.placed.includes(n.word)&&r++:t===3?o.cw?.placed.some(l=>l.word===n.word)&&r++:t===4?o.scr?.some(l=>l.original===n.word)&&r++:(o.ws?.placed.includes(n.word)||o.cw?.placed.some(l=>l.word===n.word))&&r++});let s=document.getElementById("placed-count");s&&(s.innerText=`${r}/${e.length}`);let i=document.getElementById("status-icon");i&&(r===e.length&&e.length>0?(i.className="status-icon icon-success",i.innerHTML='<i class="fas fa-check"></i>'):(i.className="status-icon icon-warning",i.innerHTML='<i class="fas fa-exclamation"></i>'))}function Je(){let e=document.getElementById("status-icon");e&&(e.className="status-icon icon-generating",e.innerHTML='<i class="fas fa-circle-notch fa-spin"></i>')}function Qe(e,o=!1){let t=o?750:640,r=680,s=Math.max(1,e?.size||1);return Math.min(60,Math.max(15,Math.floor(Math.min(t/s,r/s))))}function et(e,o,t,r,s,i=!0){let n=i?(()=>{let l=document.getElementById("scaleSearch");return l?parseInt(l.value,10):Qe(t)})():Qe(t);if(e){if(e.innerHTML="",!t){e.innerHTML='<div style="color:var(--text-muted)">No Data</div>';return}let d=`<div class="grid mode-search ${s.wsInternalGrid?"with-internal-grid":""}" style="grid-template-columns: repeat(${t.size}, ${n}px); grid-template-rows: repeat(${t.size}, ${n}px);">`;for(let a=0;a<t.size;a++)for(let c=0;c<t.size;c++)d+=`<div class="cell" style="--cell-size: ${n}px;">${t.grid[a][c]}</div>`;d+="</div>",e.innerHTML=d}if(o&&t){let l=s.wsUseClues,d=t.placed.reduce((u,p)=>Math.max(u,p.length),0),a=3;l||d>12?a=2:d<=8&&(a=4);let c=t.placed.map(u=>{if(l){let p=r.find(g=>g.word===u);return p?`${p.clue} <span class="notes-clue-length">(${u.length})</span>`:u}return u}),f=t.size*n;o.innerHTML=`<div style="width:${f}px; margin:0 auto;">
            <div class="word-bank-styled" style="column-count:${a}; display:block; column-gap:20px;">
                ${c.map(u=>`<div class="wb-item" style="margin-bottom:6px; break-inside:avoid;"><span class="wb-check"></span> <div>${u}</div></div>`).join("")}
            </div>
        </div>`}}function tt(e,o=!1){let t=o?750:640,r=500,s=Math.max(1,e?.cols||1),i=Math.max(1,e?.rows||1);return Math.min(60,Math.max(15,Math.floor(Math.min(t/s,r/i))))}function ot(e,o,t,r,s=!0){let i=s?(()=>{let n=document.getElementById("scaleCrossword");return n?parseInt(n.value,10):tt(t)})():tt(t);if(e){if(e.innerHTML="",!t||t.placed.length===0){e.innerHTML=`<div style="color:var(--danger); text-align:center; padding:40px;">
                <i class="fas fa-exclamation-triangle" style="font-size:2rem; margin-bottom:12px; display:block;"></i>
                <h3 style="margin:0 0 8px 0;">Crossword Generation Incomplete</h3>
                <p style="color:var(--text-muted); margin:0;">Words could not connect well. Try adding more or longer words.</p>
            </div>`,o&&(o.innerHTML="");return}let n=`<table class="mode-cw" style="--cell-size: ${i}px;">`;for(let l=0;l<t.rows;l++){n+="<tr>";for(let d=0;d<t.cols;d++){let a=t.grid[l][d];a?n+=`<td class="cell" style="width: ${i}px; height: ${i}px;"><span class="cell-num">${a.num||""}</span></td>`:n+=`<td class="cell empty" style="width: ${i}px; height: ${i}px;"></td>`}n+="</tr>"}n+="</table>",e.innerHTML=n}if(o&&t&&t.placed.length){let n=t.placed.filter(c=>c.dir==="across").sort((c,f)=>c.num-f.num),l=t.placed.filter(c=>c.dir==="down").sort((c,f)=>c.num-f.num),d=c=>c.map(f=>`<div class="clue-row"><span class="clue-num-bold">${f.num}.</span><span>${f.clue} <span class="notes-clue-length">(${f.word.length})</span></span></div>`).join(""),a='<div class="clues-two-col">';if(n.length&&(a+=`<div class="clue-col"><div class="clue-group-title first">ACROSS</div>${d(n)}</div>`),l.length&&(a+=`<div class="clue-col"><div class="clue-group-title first">DOWN</div>${d(l)}</div>`),a+="</div>",r.cwShowBank){let c=t.placed.map(p=>p.word).sort(),f=c.reduce((p,g)=>Math.max(p,g.length),0),u=4;f>10&&(u=3),f>15&&(u=2),a+=`<div style="border-top:1px solid #cbd5e1; margin-top:20px; padding-top:20px;">
                <div class="word-bank-styled" style="column-count:${u}; display:block; column-gap:20px;">
                    ${c.map(p=>`<div class="wb-item" style="margin-bottom:6px"><span class="wb-check"></span> ${p}</div>`).join("")}
                </div>
            </div>`}o.innerHTML=a,s&&Ht(o)}}function Ht(e){let o=e.closest(".page");if(!o)return;let t=e.querySelector(".clues-two-col");if(!t)return;t.style.fontSize="";let r=parseFloat(getComputedStyle(o).minHeight);if(o.scrollHeight<=r+2)return;let s=parseFloat(getComputedStyle(t).fontSize),i=5.5,n=s*.75;for(;o.scrollHeight>r+2&&n>i;)n=Math.max(i,n-.25),t.style.fontSize=n+"pt"}function st(e,o,t){if(!e)return;if(!o||!o.length){e.innerHTML='<div style="color:var(--text-muted)">No Data</div>';return}let r=o,s=t.scrShowHint,i='<div class="scramble-container">';r.forEach(n=>{i+=`<div class="scramble-item">
            <div class="scramble-text">${n.scrambled}</div>
            <div class="scramble-line"></div>
            ${s?`<div class="scramble-hint">(${n.original[0]}...)</div>`:""}
        </div>`}),i+="</div>",e.innerHTML=i}function nt(e,o,t,r,s){if(!e)return;rt(r);let i=o.notes||t.map(a=>({term:a.word,clue:a.clue}));if(i.length===0){e.innerHTML='<div style="text-align:center; color:var(--text-muted); padding:40px;">No words added yet.</div>';return}let n=r.notesConfig.shuffle,l="notes-table";r.notesConfig.showTerm||(l+=" hide-term"),r.notesConfig.showDef||(l+=" hide-def");let d=`<div class="${l}">
        <div class="notes-header">
            <span class="notes-num" style="${n?"width:60px":""}">#</span>
            <span class="notes-word-header">TERM</span>
            <span class="notes-clue-header">DEFINITION</span>
        </div>`;i.forEach((a,c)=>{d+='<div class="notes-row">',d+=n?`<span class="notes-num" style="width:60px">${c+1}. ____</span>`:`<span class="notes-num">${c+1}.</span>`,d+=`<div class="notes-word"><div class="notes-editable" ${n?"":'contenteditable="true"'} ${n?"":`onblur="window._puzzleApp.updateWord(${c}, 'word', this.innerText)"`}>${a.term}</div></div>`,d+='<div class="notes-clue">',n?(d+=`<div class="notes-editable">${a.matchLetter}. ${a.clue}</div>`,d+=`<span class="notes-clue-length">(${a.term.length})</span>`):(d+=`<div class="notes-editable" contenteditable="true" onblur="window._puzzleApp.updateWord(${c}, 'clue', this.innerText)">${a.clue}</div>`,d+=`<span class="notes-clue-length">(${a.term.length})</span>`),d+="</div></div>"}),d+="</div>",e.innerHTML=d}function Ee(e){rt(e)}function rt(e){let o=e.notesConfig,t=o.termWidth,r=document.getElementById("notesWidthVal");r&&(r.innerText=t+"%"),document.documentElement.style.setProperty("--notes-term-width",t+"%");let s=document.querySelector(".notes-table");s&&(s.classList.toggle("hide-term",!o.showTerm),s.classList.toggle("hide-def",!o.showDef))}function it(e,o,t){if(!e)return;let r=o.ws&&o.ws.placed.length>0,s=o.cw&&o.cw.placed.length>0,i=o.scr&&o.scr.length>0,n=t.notesConfig.shuffle,l=(r?1:0)+(s?1:0)+(i?1:0)+(n?1:0);if(l===0){e.innerHTML='<div style="text-align:center; padding:40px; color:var(--text-muted);">No answer keys to display</div>';return}e.className=l>2?"split-grid":"split-page";let d=300,a="";if(r){let c='<div class="split-half"><div class="split-title">WORD SEARCH</div>',f=o.ws,u=Math.min(16,Math.floor(d/f.size));c+=`<div style="flex:1; display:flex; justify-content:center; align-items:center;">
            <div class="pdf-force-key">
            <div class="grid mode-search" style="grid-template-columns: repeat(${f.size},${u}px); grid-template-rows: repeat(${f.size},${u}px);">`;for(let p=0;p<f.size;p++)for(let g=0;g<f.size;g++){let S=f.solution.has(`${g},${p}`)?" found":"";c+=`<div class="cell${S}" style="--cell-size: ${u}px">${f.grid[p][g]}</div>`}c+="</div></div></div></div>",a+=c}if(s){let c='<div class="split-half"><div class="split-title">CROSSWORD</div>',f=o.cw,u=Math.min(16,Math.floor(d/Math.max(f.cols,f.rows)));c+=`<div style="flex:1; display:flex; justify-content:center; align-items:center;">
            <table class="mode-cw key-overlay pdf-force-key" style="--cell-size: ${u}px">`;for(let p=0;p<f.rows;p++){c+="<tr>";for(let g=0;g<f.cols;g++){let S=f.grid[p][g];S?c+=`<td class="cell" style="width:${u}px; height:${u}px"><span class="cell-num">${S.num||""}</span><span class="cell-char">${S.char}</span></td>`:c+=`<td class="cell empty" style="width:${u}px; height:${u}px"></td>`}c+="</tr>"}c+="</table></div></div>",a+=c}if(i){let c='<div class="split-half"><div class="split-title">WORD SCRAMBLE</div><div class="scramble-solution">';o.scr.forEach(f=>{c+=`<div class="scr-sol-row"><span>${f.scrambled}</span><b>${f.original}</b></div>`}),c+="</div></div>",a+=c}if(n&&o.notes){let c='<div class="split-half"><div class="split-title">MATCHING KEY</div><div class="scramble-solution">';o.notes.forEach((f,u)=>{c+=`<div class="scr-sol-row"><span>${u+1}.</span><b style="color:var(--danger)">${f.correctLetter}</b></div>`}),c+="</div></div>",a+=c}e.innerHTML=a}U();Z();var Te={},Bt={ComicNeue:"comic-neue",Lora:"lora",Roboto:"roboto",Inter:"inter"},lt={"'Comic Neue', cursive":"ComicNeue","'Lora', serif":"Lora","'Roboto', sans-serif":"Roboto","'Inter', sans-serif":"Inter"};async function at(){return window.jspdf?window.jspdf:new Promise((e,o)=>{let t=document.createElement("script");t.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",t.onload=()=>e(window.jspdf),t.onerror=()=>{o(new Error("PDF engine failed to load"))},document.head.appendChild(t)})}async function Ie(e,o,t){let r=`${o}:${t}`,s=t>=700?"bold":"normal",i=`${o}-${s}.ttf`;if(Te[r])return e.addFileToVFS(i,Te[r]),e.addFont(i,o,s),!!e.getFontList()[o];let n=Bt[o];if(!n)return!1;let l=`https://cdn.jsdelivr.net/fontsource/fonts/${n}@latest/latin-${t}-normal.ttf`;try{let d=await fetch(l);if(!d.ok)throw new Error(`HTTP ${d.status}`);let a=new Uint8Array(await d.arrayBuffer()),c=(a[0]<<24|a[1]<<16|a[2]<<8|a[3])>>>0;if(c!==65536&&c!==1330926671&&c!==1953658213)throw new Error("Not a valid TTF");let f="",u=8190;for(let p=0;p<a.length;p+=u)f+=btoa(String.fromCharCode(...a.subarray(p,Math.min(p+u,a.length))));if(e.addFileToVFS(i,f),e.addFont(i,o,s),!e.getFontList()[o])throw new Error("jsPDF font registration failed");return Te[r]=f,!0}catch(d){return console.warn(`PDF font load failed (${o} ${t}):`,d.message),!1}}function Me(e,o,t,r,{PAGE_WIDTH:s,PAGE_HEIGHT:i,MARGIN:n},l={}){return{doc:e,PAGE_WIDTH:s,PAGE_HEIGHT:i,MARGIN:n,scale:r,mmToPt:c=>c*2.83465,pdfFont:o,wmImg:t,drawWatermark:()=>{if(!t)return;let c=l.wmOpacity!==void 0?l.wmOpacity:parseFloat(document.documentElement.style.getPropertyValue("--wm-opacity"))||.15;e.setGState(new e.GState({opacity:c}));let f=t.width/t.height,u=150,p=u/f;p>200&&(p=200,u=p*f),e.addImage(t,"PNG",(s-u)/2,(i-p)/2,u,p),e.setGState(new e.GState({opacity:1}))},notesConfig:l.notesConfig||{showTerm:!0,showDef:!0},wsInternalGrid:l.wsInternalGrid||!1,titleScale:l.titleScale||1}}function Pt(e){return/\p{Emoji_Presentation}|\p{Extended_Pictographic}/u.test(e)}function Nt(e,{fontSizePt:o,bold:t=!1,italic:r=!1,color:s=[0,0,0]}){let l=o*1.3333333333333333*3,d=Math.ceil(l*1.4),a=document.createElement("canvas");a.width=3e3,a.height=d;let c=a.getContext("2d"),f=t?"bold":"normal",u=r?"italic":"normal";c.font=`${u} ${f} ${l}px system-ui, -apple-system, sans-serif`,c.fillStyle=`rgb(${s.join(",")})`,c.textBaseline="bottom",c.fillText(e,0,d);let p=Math.min(Math.ceil(c.measureText(e).width)+4,3e3),g=document.createElement("canvas");g.width=p,g.height=d,g.getContext("2d").drawImage(a,0,0);let S=25.4/288;return{url:g.toDataURL("image/png"),widthMm:p*S,heightMm:d*S}}function Ce(e,o,t,r,{fontSizePt:s,bold:i=!1,italic:n=!1,color:l=[0,0,0],pdfFont:d="helvetica",align:a="left"}){if(o)if(Pt(o)){let c=Nt(o,{fontSizePt:s,bold:i,italic:n,color:l}),f=a==="right"?t-c.widthMm:t;e.addImage(c.url,"PNG",f,r-c.heightMm,c.widthMm,c.heightMm)}else e.setFont(d,n?i?"bolditalic":"italic":i?"bold":"normal"),e.setFontSize(s),e.setTextColor(...l),e.text(o,t,r,{align:a})}function ee(e,o,t,r,s,i="",n){let{doc:l,PAGE_WIDTH:d,MARGIN:a,scale:c,pdfFont:f}=e;n=n||c;let u=e.titleScale||1;return Ce(l,o.toUpperCase(),a,a+10*n,{fontSizePt:28*n*u,bold:!0,color:[15,23,42],pdfFont:f}),Ce(l,t,a,a+18*n,{fontSizePt:11*n*u,italic:!0,color:[100,116,139],pdfFont:f}),s?(l.setFont(f,"bold"),l.setFontSize(12*n),l.setTextColor(220,20,60),l.text("TEACHER ANSWER KEY",d-a,a+10*n,{align:"right"})):(i&&(l.setFont(f,"bold"),l.setFontSize(9*n),l.setTextColor(99,102,241),l.text(i,d-a,a+4*n,{align:"right"})),l.setFont(f,"bold"),l.setFontSize(9*n),l.setTextColor(100,116,139),l.text("NAME:",d-70,a+8*n),l.setDrawColor(200),l.setLineWidth(.3),l.line(d-55,a+8*n,d-a,a+8*n),l.text("DATE:",d-70,a+18*n),l.line(d-55,a+18*n,d-a,a+18*n)),l.setDrawColor(15,23,42),l.setLineWidth(.4),l.line(a,a+22*c,d-a,a+22*c),Ce(l,r.toUpperCase(),a,a+29*n,{fontSizePt:10*n,bold:!0,italic:!0,color:[100,116,139],pdfFont:f}),a+38*c}function ae(e,o,t,r,s,i,n){if(!o)return;let{doc:l,PAGE_HEIGHT:d,MARGIN:a,scale:c,mmToPt:f,pdfFont:u,drawWatermark:p}=e;n=n||c;let g=i?6:9,S=Math.min(t.w/o.size,t.h/o.size,g),F=S*o.size,I=t.x+(t.w-F)/2,L=i?t.y+(t.h-F)/2:t.y;l.setLineWidth(.3);let A=f(S)*.6,W=e.wsInternalGrid||!1;for(let v=0;v<o.size;v++)for(let h=0;h<o.size;h++){let w=I+h*S,T=L+v*S;!i&&W&&(l.setDrawColor(200),l.rect(w,T,S,S,"S")),l.setFont("courier","bold"),l.setFontSize(A),i?(l.setDrawColor(0),l.rect(w,T,S,S,"S"),o.solution.has(`${h},${v}`)?l.setTextColor(15,23,42):(l.setTextColor(200),l.setFont("courier","normal"))):l.setTextColor(15,23,42),l.text(o.grid[v][h],w+S/2,T+S/2,{align:"center",baseline:"middle"})}if(l.setDrawColor(15,23,42),l.setLineWidth(.5),l.rect(I,L,F,F,"S"),!i){let v=L+F+10*c;l.setFont(u,"normal"),l.setTextColor(15,23,42),l.setFontSize(9*n);let h=o.placed.map(b=>{if(s&&r){let y=r.find(z=>z.word===b);if(y)return`${y.clue} (${b.length})`}return b}),w=s?2:3,T=F/w,C=Math.ceil(h.length/w),B=I,E=v,H=2.5*c;h.forEach((b,y)=>{y>0&&y%C===0&&(B+=T,E=v);let z=l.splitTextToSize(b,T-8*c);E+z.length*4*n>d-a&&(l.addPage(),p(),E=a+10*c),l.setDrawColor(100),l.setLineWidth(.3),l.rect(B,E-H+.5*c,H,H,"S"),z.forEach((N,k)=>{l.text(N,B+5*c,E),k<z.length-1&&(E+=4*n)}),E+=6*n})}}function ce(e,o,t,r,s){if(!o||!o.placed.length)return;let{doc:i,PAGE_HEIGHT:n,PAGE_WIDTH:l,MARGIN:d,scale:a,mmToPt:c,pdfFont:f,drawWatermark:u}=e;s=s||a;let p=r?6:9,g=Math.min(t.w/o.cols,t.h/o.rows,p),S=g*o.cols,F=g*o.rows,I=t.x+(t.w-S)/2,L=r?t.y+(t.h-F)/2:t.y;i.setDrawColor(15,23,42),i.setLineWidth(.4);let A=Math.max(7.5,c(g)*.42),W=c(g)*.65;for(let v=0;v<o.rows;v++)for(let h=0;h<o.cols;h++){let w=o.grid[v][h];if(w){let T=I+h*g,C=L+v*g;i.setFillColor(255,255,255),i.rect(T,C,g,g,"FD"),w.num&&!r&&(i.setFont(f,"normal"),i.setFontSize(A),i.setTextColor(15,23,42),i.text(w.num.toString(),T+g*.08,C+g*.08,{baseline:"top"})),r&&(i.setFont(f,"bold"),i.setFontSize(W),i.setTextColor(220,20,60),i.text(w.char,T+g/2,C+g/2+g*.05,{align:"center",baseline:"middle"}))}}if(!r){let v=L+F+10*a,h=o.placed.filter(y=>y.dir==="across").sort((y,z)=>y.num-z.num),w=o.placed.filter(y=>y.dir==="down").sort((y,z)=>y.num-z.num),T=t.w/2,C=n-d-v,B=(y,z)=>{let N=z*4/9,k=z*1.5/9,R=5*s;return i.setFontSize(z),y.forEach(P=>{let oe=i.splitTextToSize(`${P.num}. ${P.clue} (${P.word.length})`,T-10*a);R+=oe.length*N+k}),R},E=9*s,H=5;if(C>0)for(;E>H&&!(Math.max(B(h,E),B(w,E))<=C);)E=Math.max(H,E-.25);let b=(y,z,N)=>{if(!z.length)return;let k=v;i.setFont(f,"bold"),i.setFontSize(10*s),i.setTextColor(15,23,42),i.text(y,N,k),i.setDrawColor(100,116,139),i.setLineWidth(.15),i.line(N,k+1.5*a,N+T-4*a,k+1.5*a),k+=5*s;let $=E*4/9,R=E*1.5/9;i.setFont(f,"normal"),i.setFontSize(E),i.setTextColor(15,23,42),z.forEach(P=>{i.splitTextToSize(`${P.num}. ${P.clue} (${P.word.length})`,T-10*a).forEach(It=>{i.text(It,N,k),k+=$}),k+=R})};b("ACROSS",h,t.x),b("DOWN",w,t.x+T)}}function de(e,o,t,r,s,i){if(!o||!o.length)return;let{doc:n,scale:l,pdfFont:d}=e;if(i=i||l,r){let c=Math.ceil(o.length/2),f=t.w/2,u=Math.min(8*l,t.h/c);n.setFontSize(Math.min(u*2.5,Math.max(8,u*1.5)*i));let p=t.x,g=t.y+u;o.forEach((S,F)=>{F>0&&F%c===0&&(p+=f,g=t.y+u);let I=p+f*.45;n.setFont("courier","bold"),n.setTextColor(15,23,42),n.text(S.scrambled,p+5*l,g,{align:"left"}),n.setDrawColor(100,116,139),n.setLineWidth(.2),n.line(I,g+1,p+f-2,g+1),n.setFont(d,"bold"),n.setTextColor(220,20,60),n.text(S.original,p+f-2,g,{align:"right"}),g+=u})}else{let a=t.y+10*l,c=t.x,f=t.w/2;o.forEach(u=>{a>e.PAGE_HEIGHT-e.MARGIN-10*l&&(a=t.y+10*l,c+=f),n.setFont("courier","bold"),n.setFontSize(14*i),n.setTextColor(15,23,42);let p=c+f*.4;n.text(u.scrambled,c+10*l,a,{align:"left"}),n.setDrawColor(15,23,42),n.setLineWidth(.4);let g=s?c+f-20*l:c+f-10*l;n.line(p,a+2*l,g,a+2*l),s&&(n.setFont(d,"normal"),n.setFontSize(10*i),n.setTextColor(100,116,139),n.text(`(${u.original[0]}...)`,g+3*l,a,{align:"left"})),a+=12*i})}}function ct(e,o,t,r){let{doc:s,PAGE_WIDTH:i,PAGE_HEIGHT:n,MARGIN:l,scale:d,pdfFont:a,drawWatermark:c,notesConfig:f}=e;r=r||d;let u=t,p=i-l*2,g=o.length>0&&o[0].matchLetter!==void 0,S=f?f.showTerm!==!1:!0,F=f?f.showDef!==!1:!0,I=g?22:10,L=(f?.termWidth||20)/100,A=Math.max(28,(p-I)*L),W=l+I,v=W+A,h=p-I-A;s.setFont(a,"bold"),s.setFontSize(10*r),s.setTextColor(100,116,139),s.text("#",l,u),S&&s.text("TERM",W,u),F&&s.text("DEFINITION",v,u),s.setDrawColor(15,23,42),s.setLineWidth(.4),s.line(l,u+2*d,i-l,u+2*d),u+=8*r,s.setTextColor(15,23,42),o.forEach((w,T)=>{let C=g?`${T+1}. ____`:`${T+1}.`,B=g?`${w.matchLetter}. ${w.clue} (${w.term.length})`:`${w.clue} (${w.term.length})`;s.setFont(a,"bold");let E=S?s.splitTextToSize(w.term,A-4):[];s.setFont(a,"normal");let H=F?s.splitTextToSize(B,h):[],b=Math.max(E.length,H.length,1);u+b*4.5*r>n-l&&(s.addPage(),c(),u=l+10*d),s.setFont(a,"bold"),s.setTextColor(100,116,139),s.text(C,l,u),s.setTextColor(15,23,42),S&&s.text(E,W,u),s.setFont(a,"normal"),F&&s.text(H,v,u),u+=b*4.5*r+2*r,s.setDrawColor(226,232,240),s.setLineWidth(.15),s.line(l,u-1.5*r,i-l,u-1.5*r),u+=2.5*r})}function dt(e,o,t,r,s,i){let{doc:n,PAGE_WIDTH:l,PAGE_HEIGHT:d,MARGIN:a,scale:c,pdfFont:f,drawWatermark:u}=e;i=i||c,n.setFont(f,"bold"),n.setFontSize(28*i),n.setTextColor(15,23,42),n.text(o.toUpperCase(),a,a+10*i),n.setFont("helvetica","italic"),n.setFontSize(11*i),n.setTextColor(100,116,139),n.text(t,a,a+18*i),n.setFont(f,"bold"),n.setFontSize(12*i),n.setTextColor(220,20,60),n.text("TEACHER ANSWER KEY",l-a,a+10*i,{align:"right"}),n.setDrawColor(15,23,42),n.setLineWidth(.4),n.line(a,a+25*c,l-a,a+25*c);let p=a+35*c,g=r.notes?.length>0&&r.notes[0].matchLetter!==void 0,S=l-2*a,F=d-p-a,I=(S-10)/2,L=(F-10)/2,A=[{x:a,y:p,w:I,h:L},{x:a+I+10,y:p,w:I,h:L},{x:a,y:p+L+10,w:I,h:L},{x:a+I+10,y:p+L+10,w:I,h:L}],W=(h,w)=>(n.setLineDashPattern([2,2],0),n.setDrawColor(200),n.setLineWidth(.15),n.roundedRect(w.x,w.y,w.w,w.h,4,4,"S"),n.setLineDashPattern([],0),n.setFont(f,"bold"),n.setFontSize(10*i),n.setTextColor(99,102,241),n.text(h,w.x+5*c,w.y+8*i),n.setDrawColor(99,102,241),n.setLineWidth(.15),n.line(w.x+5*c,w.y+11*c,w.x+w.w-5*c,w.y+11*c),{x:w.x+5*c,y:w.y+15*c,w:w.w-10*c,h:w.h-(15*c+5)}),v=0;if(s.ws&&r.ws){let h=W("WORD SEARCH",A[v]);ae(e,r.ws,h,null,!1,!0,i),v++}if(s.cw&&r.cw){let h=W("CROSSWORD",A[v]);ce(e,r.cw,h,!0,i),v++}if(s.scr&&r.scr){let h=W("WORD SCRAMBLE",A[v]),w={...h,y:h.y+5*c,h:h.h-5*c};de(e,r.scr,w,!0,!1,i),v++}if(s.notes&&g&&r.notes){let h=W("MATCHING KEY",A[v]),w=3,T=Math.ceil(r.notes.length/w),C=h.w/w,B=Math.min(8*c,h.h/T);n.setFontSize(Math.max(8,B*1.5*i));let E=h.x,H=h.y+B;r.notes.forEach((b,y)=>{y>0&&y%T===0&&(E+=C,H=h.y+B),n.setTextColor(15,23,42),n.text(`${y+1}. `,E+2,H),n.setFont(f,"bold"),n.setTextColor(220,20,60),n.text(b.correctLetter,E+12*c,H),n.setFont(f,"normal"),H+=B})}}var me=!1,mt=e=>{let o="",t=e;for(;t>=0;)o=String.fromCharCode(65+t%26)+o,t=Math.floor(t/26)-1;return o};async function Rt(){let e=await le(m.settings);if(!e)return null;let o=m.settings.notesConfig.shuffle,t=m.words.map((r,s)=>({term:r.word,clue:r.clue,origIdx:s}));if(o){let r=[...t].sort(()=>Math.random()-.5);t=t.map((s,i)=>({term:s.term,clue:r[i].clue,matchLetter:mt(i),correctLetter:mt(r.findIndex(n=>n.origIdx===s.origIdx)),origIdx:s.origIdx,clueOrigIdx:r[i].origIdx}))}return e.notes=t,e}async function Fe(){if(me)return;if(m.words.length===0){M("Please add words first.","error");return}G(),me=!0;let e=document.getElementById("export-btn-main");e&&(e.disabled=!0);let o=m.settings,t=o.pageOrder||["notes","ws","cw","scr","key"],r=o.opts,s=t.filter(p=>r[p]);if(s.length===0){M("Select at least one page.","error"),me=!1,e&&(e.disabled=!1);return}let i=document.getElementById("loading-overlay"),n=document.getElementById("loading-text"),l=document.getElementById("loading-progress"),d=o.title||"Puzzle",a=o.sub||"",c=(()=>{let p=document.getElementById("bulkCount");return p?parseInt(p.value,10):1})(),f=(()=>{let p=document.getElementById("exportFilename");return p?p.value:"MyPuzzle"})().replace(/[^a-z0-9-_]/gi,"_"),u=o.scrShowHint;i&&(i.style.display="flex",i.style.opacity="1"),n&&(n.innerText="Starting Export...");try{n&&(n.innerText="Loading PDF Engine...");let p=await at(),{jsPDF:g}=p,S=o.paperSize||"a4",F=S==="letter",I=F?215.9:210,L=F?279.4:297,A=new g({unit:"mm",format:S,orientation:"portrait"}),W=15,v=parseFloat(o.globalFontScale)||1,h=b=>{let y=o.scales?.[b.toLowerCase()];return v*(y!==void 0&&parseFloat(y)||1)},w="helvetica",T=null;m.watermarkSrc&&(T=await new Promise(b=>{let y=new Image;y.onload=()=>b(y),y.onerror=()=>b(null),y.src=m.watermarkSrc}));let C=Me(A,w,T,v,{PAGE_WIDTH:I,PAGE_HEIGHT:L,MARGIN:W},o),B=o.font||"'Inter', sans-serif",E=lt[B];if(E){n&&(n.innerText="Loading fonts...");try{await Ie(A,E,400)&&(await Ie(A,E,700),w=E)}catch{}}C=Me(A,w,T,v,{PAGE_WIDTH:I,PAGE_HEIGHT:L,MARGIN:W},o);let H=!0;for(let b=0;b<c;b++){n&&(n.innerText=`Generating Set ${b+1}/${c}`),l&&(l.style.width=Math.round(b/c*100)+"%"),await new Promise(k=>setTimeout(k,10));let y=await Rt();if(!y){b--;continue}let z=c>1?`SET ${b+1}`:"",N=()=>{H||A.addPage(),H=!1,C.drawWatermark()};for(let k of s)if(await new Promise($=>setTimeout($,0)),k==="notes"){N();let $=h("notes"),P=o.notesConfig?.shuffle?"\u{1F0CF} VOCABULARY MATCHING - MATCH EACH TERM TO ITS CORRECT DEFINITION.":"\u{1F4CB} LIST OF TERMS AND DEFINITIONS.",oe=ee(C,d,a,P,!1,z,$);ct(C,y.notes,oe,$)}else if(k==="ws"){N();let $=h("ws"),R=ee(C,d,a,"\u{1F50D} WORD SEARCH - HIGHLIGHT THE WORDS LISTED IN THE GRID.",!1,z,$),P={x:W,y:R,w:I-2*W,h:L-R-30*v};ae(C,y.ws,P,m.words,o.wsUseClues,!1,$)}else if(k==="cw"){N();let $=h("cw"),R=ee(C,d,a,"\u270F\uFE0F CROSSWORD - USE THE CLUES PROVIDED TO FILL IN THE GRID.",!1,z,$),P={x:W,y:R,w:I-2*W,h:(L-R)*.55};ce(C,y.cw,P,!1,$)}else if(k==="scr"){N();let $=h("scr"),R=ee(C,d,a,"\u{1F500} WORD SCRAMBLE - UNSCRAMBLE THE LETTERS TO FIND THE WORDS.",!1,z,$),P={x:W,y:R,w:I-2*W,h:L-R};de(C,y.scr,P,!1,u,$)}else if(k==="key"){N();let $=h("key");dt(C,d,a,y,r,$)}}n&&(n.innerText="Saving Vector PDF..."),l&&(l.style.width="100%"),await new Promise(b=>setTimeout(b,100)),A.save(f+".pdf"),M("PDF exported successfully!")}catch(p){console.error(p),M("PDF export failed. Check internet connection for required libraries.","error")}finally{me=!1,e&&(e.disabled=!1),i&&(i.style.opacity="0",setTimeout(()=>i.style.display="none",300))}}Z();We();function ut(){let e=document.getElementById("sidebar-resizer");if(!e)return;let o=!1;e.addEventListener("mousedown",()=>{o=!0,document.body.style.userSelect="none",document.body.style.cursor="col-resize",e.classList.add("active")}),document.addEventListener("mousemove",t=>{if(!o)return;let r=Math.max(300,Math.min(650,t.clientX));document.documentElement.style.setProperty("--sidebar-width",r+"px")}),document.addEventListener("mouseup",()=>{o&&(o=!1,document.body.style.userSelect="",document.body.style.cursor="",e.classList.remove("active"),x())})}function ze(){document.body.classList.toggle("sidebar-closed")}function Ae(e){["content","design","export"].forEach(t=>{let r=document.getElementById("panel-"+t);r&&(r.style.display="none")});let o=document.getElementById("panel-"+e);o&&(o.style.display="block"),document.querySelectorAll(".nav-tab").forEach(t=>{let r=t.dataset.tab===e;t.classList.toggle("active",r),t.setAttribute("aria-selected",r?"true":"false"),t.setAttribute("tabindex",r?"0":"-1")})}function ke(){let e=document.body.getAttribute("data-theme")==="dark";document.body.setAttribute("data-theme",e?"light":"dark");let o=document.getElementById("btn-dark");o&&(o.innerHTML=e?'<i class="fas fa-moon"></i>':'<i class="fas fa-sun"></i>'),x()}U();function $e(e){Ye(m.currentZoom+e),document.querySelectorAll(".page").forEach(o=>{o.style.transform=`scale(${m.currentZoom})`}),x()}function pt(){let e=document.getElementById("page-order-list");if(!e)return;let o=null;e.addEventListener("dragstart",t=>{o=t.target.closest(".sortable-item"),t.dataTransfer.effectAllowed="move",setTimeout(()=>o.classList.add("dragging"),0)}),e.addEventListener("dragend",()=>{o.classList.remove("dragging"),o=null,x()}),e.addEventListener("dragover",t=>{t.preventDefault();let r=_t(e,t.clientY),s=document.querySelector(".dragging");r==null?e.appendChild(s):e.insertBefore(s,r)}),e.querySelectorAll(".sortable-item").forEach(t=>{t.setAttribute("tabindex","0"),t.addEventListener("keydown",r=>{if(!r.altKey||!["ArrowUp","ArrowDown"].includes(r.key))return;r.preventDefault();let s=[...e.querySelectorAll(".sortable-item")],i=s.indexOf(t);r.key==="ArrowUp"&&i>0?e.insertBefore(t,s[i-1]):r.key==="ArrowDown"&&i<s.length-1&&e.insertBefore(s[i+1],t),t.focus(),x()})})}function _t(e,o){return[...e.querySelectorAll(".sortable-item:not(.dragging)")].reduce((r,s)=>{let i=s.getBoundingClientRect(),n=o-i.top-i.height/2;return n<0&&n>r.offset?{offset:n,element:s}:r},{offset:Number.NEGATIVE_INFINITY}).element}var Oe=null;function wt(e){Oe=e;let o;document.addEventListener("dragover",t=>{if(gt(t)){t.preventDefault();let r=document.getElementById("drop-zone");r&&r.classList.add("active"),clearTimeout(o)}}),document.addEventListener("dragleave",t=>{gt(t)&&(t.preventDefault(),o=setTimeout(()=>{let r=document.getElementById("drop-zone");r&&r.classList.remove("active")},100))}),document.addEventListener("drop",t=>{let r=document.getElementById("drop-zone");r&&r.classList.remove("active"),t.dataTransfer.files&&t.dataTransfer.files.length>0&&(t.preventDefault(),Oe&&Oe(t.dataTransfer.files[0]))})}function gt(e){return e.dataTransfer.types&&(e.dataTransfer.types.includes("Files")||e.dataTransfer.types.includes("application/x-moz-file"))}ht();U();Z();function Be(){let e=JSON.stringify({words:m.words}),o=document.createElement("a");o.href="data:text/json;charset=utf-8,"+encodeURIComponent(e),o.download="puzzle-config.json",o.click(),M("Configuration saved")}var Dt=15,Gt=60,Ut=2e6;var Pe=(e,o)=>{let t;return(...r)=>{clearTimeout(t),t=setTimeout(()=>e(...r),o)}},yt=e=>{let o="",t=e;for(;t>=0;)o=String.fromCharCode(65+t%26)+o,t=Math.floor(t/26)-1;return o};async function jt(){let e=await le(m.settings);if(!e)return null;let o=m.settings.notesConfig.shuffle,t=m.words.map((r,s)=>({term:r.word,clue:r.clue,origIdx:s}));if(o){let r=[...t].sort(()=>Math.random()-.5);t=t.map((s,i)=>({term:s.term,clue:r[i].clue,matchLetter:yt(i),correctLetter:yt(r.findIndex(n=>n.origIdx===s.origIdx)),origIdx:s.origIdx,clueOrigIdx:r[i].origIdx}))}return e.notes=t,e}var xt=0;async function O(){G();let e=++xt;Je();let o=await jt();e!==xt||!o||(Xe(o),ue("search",!0),ue("crossword",!0),we(),te(),J())}var pe=Pe(O,500),Xt=Pe(()=>{x(),ge()},500),Yt=Pe(J,200);function qt(e,o=!1){let t=o?750:640,r=e==="search"?680:500,s,i;return e==="search"?s=i=Math.max(1,m.puzzleData.ws?.size||1):(s=Math.max(1,m.puzzleData.cw?.cols||1),i=Math.max(1,m.puzzleData.cw?.rows||1)),Math.min(Gt,Math.max(Dt,Math.floor(Math.min(t/s,r/i))))}function ue(e,o=!1){let t=document.getElementById(e==="search"?"scaleSearch":"scaleCrossword");t&&(t.value=qt(e),o||(J(),M("Auto-fitted!")))}function J(){G();let e=m.puzzleData,o=m.settings,t=m.words;nt(document.getElementById("p1-notes"),e,t,o,(r,s,i)=>ye(r,s,i)),et(document.getElementById("p2-area"),document.getElementById("p2-footer"),e.ws,t,o,!0),ot(document.getElementById("p3-area"),document.getElementById("p3-footer"),e.cw,o,!0),st(document.getElementById("p4-area"),e.scr,o),it(document.getElementById("key-container"),e,o),he()}function te(){let e=document.getElementById("wordList");Ve(e,m.words,m.puzzleData,m.activePage,ye,je),Ke(m.words,m.puzzleData,m.activePage)}function ge(){let e=document.getElementById("fontSelect");e&&document.documentElement.style.setProperty("--user-font",e.value);let o=document.getElementById("titleInput")?.value||"Vocabulary Quiz",t=document.getElementById("subInput")?.value||"Unit Review";document.querySelectorAll(".disp-title").forEach(r=>r.innerText=o),document.querySelectorAll(".disp-sub").forEach(r=>r.innerText=t),we()}function we(){let e=document.getElementById("p1-instruction");if(!e)return;let o=document.getElementById("notesShuffle")?.checked??m.settings.notesConfig.shuffle;e.innerText=o?"\u{1F0CF} VOCABULARY MATCHING - MATCH EACH TERM TO ITS CORRECT DEFINITION.":"\u{1F4CB} LIST OF TERMS AND DEFINITIONS."}function he(){let e=(i,n)=>{let l=document.getElementById(i);return l?l.value:n},o=e("wsOpacity",1),t=e("cwOpacity",1),r=e("wsLineWidth",1),s=e("cwLineWidth",1);document.documentElement.style.setProperty("--ws-bg-color",`rgba(255,255,255,${o})`),document.documentElement.style.setProperty("--cw-bg-color",`rgba(255,255,255,${t})`),document.documentElement.style.setProperty("--ws-line-width",r+"px"),document.documentElement.style.setProperty("--cw-line-width",s+"px"),document.documentElement.style.setProperty("--ws-neg-margin",-1*parseFloat(r)+"px"),document.documentElement.style.setProperty("--cw-neg-margin",-1*parseFloat(s)+"px"),document.querySelectorAll(".mode-search.grid").forEach(i=>{i.style.paddingTop=r+"px",i.style.paddingLeft=r+"px"}),x()}function Ne(){let e=document.getElementById("globalFontScale");if(e){let o=document.getElementById("globalFontScaleVal");o&&(o.innerText=parseFloat(e.value).toFixed(2)+"x"),document.documentElement.style.setProperty("--global-font-scale",e.value),x()}}function Re(){let e=document.getElementById("titleScale");if(!e)return;let o=parseFloat(e.value),t=document.getElementById("titleScaleVal");t&&(t.innerText=o.toFixed(2)+"x"),document.documentElement.style.setProperty("--title-scale",o),x()}function _e(){let o=(document.getElementById("paperSize")?.value||"a4")==="letter";document.documentElement.style.setProperty("--page-width",o?"215.9mm":"210mm"),document.documentElement.style.setProperty("--page-height",o?"279.4mm":"297mm"),x()}function St(e){m.activePage!==e&&Ge(e)}function De(){["Notes","WS","CW","Scr","Key"].forEach(e=>{let o=document.getElementById("scale"+e+"Font");if(o){let t=parseFloat(o.value).toFixed(2);document.getElementById("scale"+e+"FontVal").innerText=t+"x",document.documentElement.style.setProperty("--scale-"+e.toLowerCase(),t)}}),x(),J()}function Ge(e){m.activePage=e,document.querySelectorAll(".page").forEach(t=>t.classList.remove("visible"));let o=document.getElementById("page"+e);o&&o.classList.add("visible"),document.querySelectorAll(".page-btn").forEach((t,r)=>t.classList.toggle("active",r+1===e)),J(),te()}function ye(e,o,t){if(o==="word"){D();let r=t.toUpperCase().replace(/[^A-Z]/g,"");m.words[e][o]=r;let s=document.getElementById("wsGridSize");if(s){let i=parseInt(s.value,10);if(r.length>i){let n=Math.min(25,r.length);s.value=n,r.length>25?M("Word exceeds max grid size. It may not fit.","error"):M(`Grid resized to ${n}`)}}x(),pe()}else m.words[e][o]=t,x(),Yt()}function Ue(){D(),m.words.push({word:"",clue:""}),te(),x(),setTimeout(()=>{let e=document.getElementById("wordList");e&&(e.scrollTop=e.scrollHeight);let o=document.querySelectorAll(".wm-word");o.length&&o[o.length-1].focus()},50)}function je(e){D(),m.words.splice(e,1),x(),O()}function Zt(e){if(e<=0||e>=m.words.length)return;D();let o=m.words[e];m.words[e]=m.words[e-1],m.words[e-1]=o,te(),x(),pe()}function Vt(e){if(e<0||e>=m.words.length-1)return;D();let o=m.words[e];m.words[e]=m.words[e+1],m.words[e+1]=o,te(),x(),pe()}function vt(){confirm(`Clear all ${m.words.length} words? This cannot be undone.`)&&(D(),X([]),x(),O())}function bt(e){if(!e.files[0])return;if(e.files[0].size>Ut){M("Image must be smaller than 2MB.","error"),e.value="";return}let o=new FileReader;o.onload=t=>{m.watermarkSrc="",document.querySelectorAll(".watermark-img").forEach(r=>{r.src="",r.style.display="none"}),m.watermarkSrc=t.target.result,document.querySelectorAll(".watermark-img").forEach(r=>{r.closest("#page5")||(r.src=m.watermarkSrc,r.style.display="block")}),x(),M("Watermark added")},o.onerror=()=>{M("Failed to read image file.","error"),e.value=""},o.readAsDataURL(e.files[0])}function Et(e){document.documentElement.style.setProperty("--wm-opacity",e),x()}function Tt(){m.watermarkSrc="",document.querySelectorAll(".watermark-img").forEach(o=>o.style.display="none");let e=document.getElementById("bgUpload");e&&(e.value=""),x(),M("Watermark removed")}window._puzzleApp={generateAll:O,addWordRow:Ue,updateWord:ye,delWord:je,moveWordUp:Zt,moveWordDown:Vt,clearList:vt,openModal:e=>Le(e),closeModal:V,processImport:()=>K(O),downloadConfig:Be,loadConfigFromFile:e=>{let o=e.files[0];o&&He(o,t=>{se(t),O()},()=>K(O)),e.value=""},exportPDF:Fe,toggleDarkMode:ke,toggleSidebar:ze,switchTab:Ae,adjustZoom:e=>$e(e),showPage:Ge,autoFit:ue,updateUI:ge,updateGridStyles:he,updateGlobalFontScale:Ne,updateTitleScale:Re,updatePaperSize:_e,updatePageScales:De,focusPage:St,updateNotesStyles:()=>{G(),Ee(m.settings),x()},updateNotesInstruction:we,handleImage:bt,updateOpacity:Et,clearWatermark:Tt,hardReset:()=>ve(),undo:()=>ne(()=>{x(),O()}),redo:()=>re(()=>{x(),O()})};Object.assign(window,{generateAll:O,addWordRow:Ue,updateWord:ye,delWord:je,clearList:vt,openModal:e=>Le(e),closeModal:V,processImport:()=>K(O),downloadConfig:Be,exportPDF:Fe,toggleDarkMode:ke,toggleSidebar:ze,switchTab:Ae,adjustZoom:e=>$e(e),showPage:Ge,autoFit:ue,updateUI:ge,updateGridStyles:he,updateGlobalFontScale:Ne,updateTitleScale:Re,updatePaperSize:_e,updatePageScales:De,focusPage:St,updateNotesStyles:()=>{G(),Ee(m.settings),x()},updateNotesInstruction:we,handleImage:bt,updateOpacity:Et,clearWatermark:Tt,hardReset:()=>ve(),undo:()=>ne(()=>{x(),O()}),redo:()=>re(()=>{x(),O()}),loadConfigFromFile:e=>window._puzzleApp.loadConfigFromFile(e),debouncedGenerate:pe,renderActivePage:J,debouncedUpdateUI:Xt,saveState:x});window.addEventListener("load",async()=>{let e=document.getElementById("loading-overlay");try{let o=Ze();o&&se(o),m.watermarkSrc&&document.querySelectorAll(".watermark-img").forEach(t=>{t.closest("#page5")||(t.src=m.watermarkSrc,t.style.display="block")}),D(),await O(),he(),De(),Ne(),Re(),_e(),ge(),await new Promise(t=>setTimeout(t,300)),e&&(e.style.opacity="0"),setTimeout(()=>{e&&(e.style.display="none",e.style.opacity="1")},300)}catch(o){console.error("Init failed",o),e&&(e.style.display="none"),M("Failed to load saved settings.","error")}document.addEventListener("keydown",o=>{if((o.ctrlKey||o.metaKey)&&o.key==="Enter"&&Ue(),o.key==="Escape"){let s=document.getElementById("modal-overlay");s&&s.style.display==="flex"&&V()}let t=document.activeElement?.tagName,r=t==="INPUT"||t==="TEXTAREA"||document.activeElement?.isContentEditable;(o.ctrlKey||o.metaKey)&&o.key==="z"&&!o.shiftKey&&!r&&(o.preventDefault(),ne(()=>{x(),O()})),(o.ctrlKey||o.metaKey)&&(o.key==="y"||o.key==="z"&&o.shiftKey)&&!r&&(o.preventDefault(),re(()=>{x(),O()}))}),ut(),pt(),wt(o=>He(o,t=>{se(t),O()},()=>K(O)))});window.addEventListener("orientationchange",()=>{setTimeout(()=>{window.innerWidth<=900&&document.body.classList.add("sidebar-closed")},100)});})();
