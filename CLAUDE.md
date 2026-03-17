# CLAUDE.md — Developer Notes for Claude

## Build & Run
```bash
bash build.sh                  # esbuild bundles main.js → bundle.js
python3 -m http.server 8082    # serve at http://localhost:8082/puzzle-suite.html
```
After any JS change: rebuild, then bump `?v=N` in `<script src="bundle.js?v=N">` (puzzle-suite.html line ~461) to bypass browser cache.

## Architecture

### State management (`core/state.js`)
- `state` is the single source of truth
- `syncSettingsFromDOM()` — reads all DOM control values → `state.settings` (call before using state if debounce hasn't fired)
- `applyStateToDOM()` — restores saved state to DOM controls (called once at init)
- `saveState()` — debounced 500 ms → `saveStateNow()` → `syncSettingsFromDOM()` → localStorage
- **Pattern**: when an `oninput` handler needs the current value immediately, call `syncSettingsFromDOM()` first

### CSS Layer Architecture
Layers in order (higher = wins): `base` → `layout` → `components` → `pages` → `utils`

**Critical**: Dark mode overrides must be in `@layer components` or higher, NOT `@layer base`, or they lose to component rules.

CSS custom properties used throughout:
- `--global-font-scale` — set by `updateGlobalFontScale()`
- `--page-scale` — per-page var, resolved from `--scale-notes/ws/cw/scr/key`
- `--title-scale` — set by `updateTitleScale()`
- `--page-width` / `--page-height` — set by `updatePaperSize()`, drives `.page` dimensions
- `--user-font` — the selected font family string
- `--wm-opacity` — watermark opacity

### DOM ↔ State sync
| Direction | Function | When |
|-----------|----------|------|
| DOM → state | `syncSettingsFromDOM()` | Before reading state in any immediate handler |
| State → DOM | `applyStateToDOM(saved)` | Once at init (restores saved session) |

### Window API (`main.js`)
All functions exposed both as `window.fnName` (for HTML `onclick`/`oninput`) and on `window._puzzleApp` (for programmatic use). When adding a new function, add it to BOTH export blocks (~lines 566 and 617 in main.js).

### PDF Export (`pdf/pdfExport.js`)
1. Creates jsPDF doc with paper size from `cfg.paperSize`
2. Loads custom font (Inter/Roboto/Lora/Comic) via `pdfFonts.js`
3. Builds a `ctx` context object via `buildCtx()` — carries doc, dimensions, scale, pdfFont, drawWatermark
4. Loops over sets (bulk export), then page types in `cfg.pageOrder`
5. Each page: `drawHeader(ctx, title, sub, instruction, isKey, setIndicator, pScale)` → returns Y where content starts
6. Passes layout `{ x, y, w, h }` to each `drawXxx()` function

### Emoji in PDF
PDF fonts (helvetica + custom loaded fonts) don't support emoji. The canvas fallback in `pdf/pdfHelpers.js`:
- `hasEmoji(str)` — detects emoji via Unicode property escapes
- `textToImgPDF(text, opts)` — renders to HTML canvas (system emoji font), returns PNG dataURL + mm dimensions
- `drawText()` — unified draw helper that checks `hasEmoji()` for title/subtitle/instructions; routes to canvas or `doc.text()` accordingly
- Instruction strings in `pdfExport.js` now include emoji prefixes (`📋` Notes, `🃏` Matching, `🔍` Word Search, `✏️` Crossword, `🔀` Scramble)
- `drawHeader()` uses `drawText()` for all three text elements (title, subtitle, instructions) so emoji render correctly

### Renderers (HTML preview)
`renderNotes / renderWordSearch / renderCrossword / renderScramble` write to DOM containers directly. They are called by `renderActivePage()` (main.js) which routes to the correct renderer based on `state.activePage`.

The crossword renderer auto-scales clues to fit one page via `_autoScaleCluesToFit()` after DOM insertion.

### Word List Status Coloring
`renderWordList()` and `renderStatus()` now accept an `activePage` parameter:
- **Page 2 (Word Search)**: status dots reflect WS placement only
- **Page 3 (Crossword)**: status dots reflect CW placement only
- **Page 4 (Scramble)**: status dots reflect SCR placement (all words always included)
- **Pages 1 & 5 (Notes & Key)**: status dots reflect overall placement (WS or CW)
- When switching pages, `showPage(n)` calls `_renderWordListAndStatus()` to update dots immediately

### Matching Mode Data Model (CRITICAL)
`puzzleData.notes` is `null` before generation. After `createPuzzleData()` runs it is an array of objects.

**Non-matching mode** (shuffle off): each item is `{ term, clue, origIdx }` — term and clue are aligned (row i describes word i).

**Matching mode** (shuffle on): definitions are shuffled across rows. Each item is:
```js
{
  term,          // the word at this row position (original order)
  clue,          // a DIFFERENT word's definition (shuffled)
  matchLetter,   // letter label shown next to this definition (A, B, C…)
  correctLetter, // the letter that answers "which definition matches THIS term"
  origIdx,       // original index of the term
  clueOrigIdx,   // original index of the word whose clue appears here
  clueTermLength // letter count of the word the clue actually describes ← KEY FIELD
}
```

**Why `clueTermLength` exists**: because `(N)` shown after a definition must reflect the length of the term that definition *refers to*, not the term shown in the same table row. These differ in matching mode because definitions are shuffled.

**Data source rules for renderers**:
- Use `puzzleData.notes` ONLY when `hasMatchingData = shuffle && notes[0].matchLetter exists`
- In standard mode always use live `words.map(w => ({ term: w.word, clue: w.clue }))` — this keeps clue edits reactive without regeneration
- **Never** detect matching mode from `settings.notesConfig.shuffle` alone in a renderer — check the actual data

**In-place clue patch**: `updateWord(i, 'clue', v)` patches `puzzleData.notes` in-place when in matching mode (finds note where `clueOrigIdx === i`). This keeps the preview live without requiring a full re-generate.

### Generation Worker (`workers/workerBridge.js`)
All three puzzle generators (WS, CW, scramble) run in a Web Worker inlined as a Blob URL, so they don't block the UI thread. `generateAllAsync(settings)` returns a Promise.

Sequencing: each call increments `_msgId`; only the latest message id is retained. Stale results are discarded (the `seqId !== generationSequenceId` guard in `generateAll()`).

The crossword attempts up to 5 different seed words and picks the layout with the best score (fewest unplaced × 10000 + area + aspect). 1500 ms hard timeout per attempt.

### Undo/Redo (`core/history.js`)
`pushHistory()` must be called BEFORE mutating `state.words`. Max 50 entries. Word reorder, add, and delete operations push history; clue/term inline edits do not.

### AI Word Generation (`ai/aiGenerate.js`)
BYOK (bring your own key). API keys stored in `puzzleSuiteAIKeys` localStorage key, separate from main state. Supported providers: Google Gemini, Groq, OpenAI, Anthropic Claude, OpenRouter. All requests go browser → provider directly (no server).

### Import/Export
- `downloadConfig()` — saves `{ words }` as `puzzle-config.json`
- `processImport()` — parses `word - clue` or `word: clue` format, also bare words; deduplicates
- `handleDroppedFile()` — `.json` files apply full config state; other files go to text import
- Storage key: `puzzleSuiteV60` (bumped from V59 when schema changed; V59 still loaded as fallback)

### Common Pitfalls
- **Bundle caching**: `http.server` caches aggressively. Always bump `?v=N` after `build.sh`.
- **CSS layer priority**: Adding dark-mode overrides to `@layer base` won't work if same selector is in `@layer components`. Put overrides in `@layer components`.
- **`innerText` vs `textContent`**: `innerText` returns `""` for elements inside collapsed `<details>`. Use `textContent` or call `syncSettingsFromDOM()` which uses `.value` / `.checked` (not innerText).
- **`updatePageScales()` calls `renderActivePage()`**: it only re-renders the active page. After navigation, `showPage(n)` calls `renderActivePage()` automatically.
- **`saveState()` is debounced 500 ms**: for sliders that need to immediately read state (e.g., `updateNotesStyles()`), always call `syncSettingsFromDOM()` first.
- **Stale state on toggle changes**: `renderActivePage()` calls `syncSettingsFromDOM()` at the start so toggle/checkbox changes take effect immediately without waiting for the 500ms debounce.
- **Matching `isMatching` detection**: ALWAYS check `'matchLetter' in data[0]`, never `settings.notesConfig.shuffle` alone in a renderer. Settings-driven detection causes "undefined." rendering and wrong layout class when puzzle hasn't been generated yet.
- **`clueTermLength` in matching mode**: when writing any code that displays `(N)` after a definition in matching context, use `w.clueTermLength` not `w.term.length`. They diverge because definitions are shuffled across rows.
- **Editing clues in matching mode**: `updateWord` patches `puzzleData.notes` in-place via `clueOrigIdx`. If you add new code paths that mutate clues, follow this same pattern or call `debouncedGenerate()`.

## Adding a New Setting
1. Add default to `state.settings` in `core/state.js`
2. Add read in `syncSettingsFromDOM()`
3. Add restore in `applyStateToDOM()`
4. Add DOM control in `puzzle-suite.html`
5. Add update function in `main.js`; export on both `window` and `window._puzzleApp`
6. Call in init sequence in `main.js` (after `applyStateToDOM`)
7. If affects PDF, pass via `cfg` (which is `state.settings`) or add to `buildCtx()` return

## Recent Fixes & Improvements (Session: 2026-03-17)

### 1. Matching Mode Clue Letter Count (correct answer length)
**Bug**: `(N)` after each definition in matching mode showed the length of the term in the *same row*, not the term the definition actually describes (they differ because definitions are shuffled).
**Fix**: Added `clueTermLength: clues[i].term.length` at shuffle time in `main.js` and `pdfExport.js`. Renderers (`notes.js`, `pdfDrawNotes.js`) now use `w.clueTermLength` instead of `w.term.length` in matching mode.

### 2. Data-Driven `isMatching` Detection
**Bug**: `notes.js` and `keys.js` used `settings.notesConfig.shuffle` to detect matching mode. With shuffle enabled but before generation, fallback data had no `matchLetter`, causing:
- Notes page: "undefined. [clue]" in every definition cell
- Keys page: `activeCount` inflated by 1, wrong CSS grid class applied
**Fix**: Both renderers now check `'matchLetter' in targetData[0]`, matching the pattern `pdfDrawNotes.js` already used.

### 3. Live Words in Standard Mode
**Bug**: `renderNotes` always read from `puzzleData.notes` (stale after generate). Editing a clue via the inline editor or word list sidebar updated `state.words` but the re-render read stale notes data, silently reverting the edit.
**Fix**: `puzzleData.notes` is now only used when actual matching data is present (`hasMatchingData`). Standard mode always derives from live `words`, making clue edits immediately reactive.

### 4. Matching Key Shows Term + Letter
**Improvement**: HTML key (`keys.js`) and PDF key (`pdfDrawNotes.js`) previously showed only `1. C` in the matching answer key. Teacher had to cross-reference the exercise page to know what term "1" was. Now shows `1. APPLE  C` — term on left, correct letter right-aligned.

### 5. In-Place Clue Patch for Matching Mode
**Bug**: Editing a clue from the word list sidebar while in matching mode left `puzzleData.notes` stale (it stores shuffled clue text). The re-render showed old text.
**Fix**: `updateWord` now patches `puzzleData.notes` in-place when in matching mode: finds the note item where `clueOrigIdx === i` and updates its `clue` field. Shuffle assignments remain stable; no full re-generate needed.

---

## Previous Session Fixes (v5)

### Word List Button Spacing
Fixed reorder buttons spaced too far from word input. Changed container from `flex:1` to `flex-shrink:0`.

### Emoji in PDF Instructions
PDF instruction text displays emoji correctly via canvas fallback route in `drawHeader()`.

### Color-Code Active Words
Status dots reflect placement in the currently-visible puzzle page.

### Stale State on Toggle Changes
`renderActivePage()` calls `syncSettingsFromDOM()` at start so toggles take effect instantly.
