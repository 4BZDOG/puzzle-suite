---
name: puzzle-dev
description: Development guide for puzzle-suite — covers build workflow, adding settings/features, renderer patterns, license gating, and common gotchas.
category: project
---

# Puzzle-Suite Developer Skill

Use this skill when adding features, fixing bugs, or navigating the puzzle-suite codebase.

---

## Project Layout (Quick Reference)

```
main.js                  Entry point; wires everything; exports window API
core/state.js            Single source of truth — all app state lives here
core/history.js          Undo/redo (push BEFORE mutating state.words)
core/storage.js          localStorage persistence (key: puzzleSuiteV60)
renderers/*.js           HTML preview renderers (one per page type)
pdf/pdfExport.js         PDF orchestrator — loops sets, then page types
pdf/pdfDraw*.js          PDF draw functions (mirror of each renderer)
workers/workerBridge.js  generateAllAsync(settings) → Promise; runs in Web Worker
license/licenseManager.js  Tier state singleton; validates key against server
server/                  Optional Node/Express backend (Stripe, SQLite, email)
build.sh                 npx esbuild main.js --bundle --minify → bundle.js
```

---

## Build & Serve

```bash
bash build.sh                          # bundle JS → bundle.js, stamps cache-bust hash
python3 -m http.server 8082            # serve at http://localhost:8082/puzzle-suite.html
```

**After every JS change**: just rerun `bash build.sh` — it stamps a fresh content-hash
into `<script src="bundle.js?v=…">` automatically. No manual bump needed.

### Payment server (optional)
```bash
cd server && npm install && npm start  # http://localhost:3001
stripe listen --forward-to localhost:3001/api/webhook
```

---

## State Management Pattern

`state` in `core/state.js` is the **only** source of truth. The DOM is a view.

| Direction   | Function              | When to call                                  |
|-------------|-----------------------|-----------------------------------------------|
| DOM → state | `syncSettingsFromDOM()` | Before reading `state.settings` in any immediate handler |
| State → DOM | `applyStateToDOM(saved)` | Once at init                                |
| Persist     | `saveState()`         | Debounced 500ms; call in `oninput` handlers   |

**Gotcha**: sliders and toggles that need the current value immediately must call
`syncSettingsFromDOM()` first — the 500ms debounce hasn't fired yet.

---

## Adding a New Setting (7-step checklist)

1. Add default value to `state.settings` in `core/state.js`
2. Read it in `syncSettingsFromDOM()` (DOM → state)
3. Restore it in `applyStateToDOM()` (state → DOM)
4. Add the DOM control (input/select/checkbox) in `puzzle-suite.html`
5. Write an update function in `main.js`; export on **both** `window` and `window._puzzleApp`
6. Call the update function in the init sequence (after `applyStateToDOM`)
7. If the setting affects PDF output, pass it via `cfg` (which is `state.settings`) or add it to `buildCtx()` in `pdf/pdfExport.js`

---

## Adding a Renderer Feature

Every visual feature has **two** implementations that must stay in sync:

| HTML preview        | PDF output                   |
|---------------------|------------------------------|
| `renderers/notes.js` | `pdf/pdfDrawNotes.js`       |
| `renderers/wordSearch.js` | `pdf/pdfDrawWordSearch.js` |
| `renderers/crossword.js` | `pdf/pdfDrawCrossword.js` |
| `renderers/scramble.js` | `pdf/pdfDrawScramble.js`  |
| `renderers/keys.js` | `pdf/pdfDrawNotes.js` (key section) |

When you change a renderer, update the matching PDF draw file too.

### PDF coordinate system
- `drawHeader(ctx, title, sub, instruction, isKey, setIndicator, pScale)` returns `y` (where content starts)
- Pass layout as `{ x, y, w, h }` in mm to each `drawXxx()` function
- Use `drawText()` (in `pdfHelpers.js`) for any text that may contain emoji — it auto-routes to canvas fallback

---

## Matching Mode — Critical Rules

Matching mode shuffles definitions across rows. The data shape changes:

```js
// Standard mode item:
{ term, clue, origIdx }

// Matching mode item:
{ term, clue, matchLetter, correctLetter, origIdx, clueOrigIdx, clueTermLength }
```

**Detection**: always check `'matchLetter' in data[0]`, **never** `settings.notesConfig.shuffle`.
Using the settings flag causes broken rendering before the first generation.

**Letter count** `(N)` after a definition must use `w.clueTermLength`, not `w.term.length`.
They diverge because definitions are shuffled across rows.

**Clue edits in matching mode**: `updateWord(i, 'clue', v)` patches `puzzleData.notes` in-place
by finding `note.clueOrigIdx === i`. Follow this pattern for any new code paths that mutate clues.

---

## Adding a License-Gated Feature (4-step checklist)

1. Define the limit in **all three** places (keep them in sync):
   - `TIERS` object in `license/licenseManager.js`
   - `TIER_LIMITS` in `server/routes/license.js`
   - `PLAN_LIMITS` in `server/email.js`

2. Enforce at the feature boundary:
   ```js
   const limit = licenseManager.getLimit('yourLimit');
   if (value > limit) { ... }
   ```

3. Show the right prompt:
   - Free tier hitting wall → `showUpgradePrompt(message)`
   - Pro tier at their (higher) cap → `showToast(message, 'warning')`

4. If a DOM control reflects the limit (like `bulkCount`), update it in `_updateBulkLimit()`
   or a new equivalent, and register it in the `onChange` callback in main.js.

**Init sequencing** — register `onChange` **before** calling `init()`:
```js
licenseManager.onChange(() => { _updateProBadge(); _updateBulkLimit(); });
licenseManager.init().catch(() => {});  // non-blocking
```
Do **not** add a `.then()` that repeats the same calls — `_notify()` fires them when `init()` resolves.

---

## CSS Layer Priority

Layers in ascending priority (higher wins):
```
base → layout → components → pages → utils
```

Dark-mode overrides must go in `@layer components` or higher. Adding them to
`@layer base` silently loses to component-layer rules with the same specificity.

---

## Common Gotchas

| Symptom | Root cause | Fix |
|---------|-----------|-----|
| JS changes not showing in browser | Stale bundle, forgot to rebuild | Rerun `bash build.sh` — it stamps `?v=` automatically |
| "undefined. [clue]" in Notes before generation | Reading `settings.notesConfig.shuffle` instead of data | Check `'matchLetter' in data[0]` |
| Clue edit reverts on re-render | Renderer reading stale `puzzleData.notes` | Standard mode must derive from live `state.words` |
| Slider reads wrong value immediately | 500ms debounce hasn't fired | Call `syncSettingsFromDOM()` first |
| Dark-mode override has no effect | Override in `@layer base` | Move to `@layer components` |
| Undo skips a word change | `pushHistory()` called after mutation | Always push history **before** mutating `state.words` |
| Badge/bulk limit updates twice at init | `.then()` block duplicates `onChange` | Remove `.then()`; let `onChange` handle it |
| XSS from server plan data | Server strings injected via `innerHTML` raw | Use `escapeHTML()` or `textContent` |
| Stripe webhook signature fails | Middleware consuming raw body | Webhook route must be registered **before** `express.json()` |

---

## Window API Convention

All public functions must be exported **twice** in main.js:
```js
// Inline HTML handlers (onclick, oninput):
window.myFunction = myFunction;

// Programmatic / test access:
window._puzzleApp.myFunction = myFunction;
```
Both export blocks live near the bottom of main.js.

---

## Generation Worker

```js
import { generateAllAsync } from './workers/workerBridge.js';
const puzzleData = await generateAllAsync(state.settings);
```

- Runs in an inlined Blob Web Worker — does not block the UI thread
- Stale results are auto-discarded via sequence ID guard
- Crossword: up to 5 seed-word attempts; 1500ms hard timeout per attempt; picks best score

---

## Example Commands

```bash
# Full rebuild + cache-bust (stamps ?v=<hash> automatically)
bash build.sh

# Check current storage key (useful when schema bumps)
grep -r 'puzzleSuiteV' core/storage.js

# Find all window exports
grep -n 'window\.' main.js | grep -v '//'

# Check tier limits are in sync across all 3 files
grep -n 'words\|bulkSets' license/licenseManager.js server/routes/license.js server/email.js

# Verify no raw innerHTML injection of server data
grep -n 'innerHTML' main.js license/licenseManager.js
```
