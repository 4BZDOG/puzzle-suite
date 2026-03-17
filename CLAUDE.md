# CLAUDE.md — Developer Notes for Claude

## Build & Run

### Frontend (puzzle app)
```bash
bash build.sh                  # esbuild bundles main.js → bundle.js
python3 -m http.server 8082    # serve at http://localhost:8082/puzzle-suite.html
```
After any JS change: rebuild, then bump `?v=N` in `<script src="bundle.js?v=N">` (puzzle-suite.html, last `<script>` tag) to bypass browser cache.

### Payment server (optional — required for license features)
```bash
cd server
cp .env.example .env           # fill in Stripe keys, SMTP, ADMIN_SECRET
npm install
npm start                      # listens on http://localhost:3001
# For local Stripe webhook testing:
stripe listen --forward-to localhost:3001/api/webhook
```
The frontend falls back to Free tier silently if the server is unreachable. License validation is always non-blocking.

---

## Architecture

### State management (`core/state.js`)
- `state` is the single source of truth
- `syncSettingsFromDOM()` — reads all DOM control values → `state.settings` (call before using state if debounce hasn't fired)
- `applyStateToDOM()` — restores saved state to DOM controls (called once at init)
- `saveState()` — debounced 500 ms → `saveStateNow()` → `syncSettingsFromDOM()` → localStorage
- **Pattern**: when an `oninput` handler needs the current value immediately, call `syncSettingsFromDOM()` first

### CSS Layer Architecture
Layers in order (higher = wins): `base` → `layout` → `components` → `pages` → `utils`

**Critical**: Dark mode overrides must be in `@layer components` or higher, NOT `@layer base`, or they lose to component rules. License UI styles are in a separate `@layer components` block at the bottom of `puzzle-suite.css`.

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
All functions exposed both as `window.fnName` (for HTML `onclick`/`oninput`) and on `window._puzzleApp` (for programmatic use). When adding a new function, add it to BOTH export blocks near the bottom of main.js.

License functions on window: `openLicenseModal`, `closeLicenseModal`, `activateLicenseKey`, `deactivateLicense`, `startCheckout`, `showUpgradePrompt`, `_switchLicTab`.

### License Management (`license/licenseManager.js`)
Frontend singleton managing tier state. Key points:

- `licenseManager.init()` — call at startup; validates stored key against server (or 24-hour cache); always resolves (falls back to free on error)
- `licenseManager.onChange(fn)` — register a callback that fires whenever tier changes; also fires immediately if `_ready` is true at registration time
- `licenseManager.getLimit('words')` / `getLimit('bulkSets')` — returns numeric limit for current tier
- `licenseManager.activateKey(rawKey)` — validates with server (force refresh), stores on success
- `licenseManager.startCheckout(planId, email)` — creates Stripe session via server, redirects browser

**Init sequencing in `main.js`**:
```js
licenseManager.onChange(() => { _updateProBadge(); _updateBulkLimit(); });
licenseManager.init().catch(() => {});  // non-blocking; onChange fires when done
```
The `onChange` listener is registered *before* `init()` is called. When `init()` resolves, it calls `_notify()` which triggers all registered listeners. Do NOT add a `.then()` block that repeats the same calls — that would double-fire the updates.

**`_cachedPlans`**: plans fetched from `/api/checkout/plans` are cached in a module-level variable after the first successful fetch. `_loadPlansUI()` checks this before hitting the network.

**Server URL**: defaults to `http://localhost:3001`. Override by setting `window.PUZZLE_SUITE_SERVER_URL` before `bundle.js` loads.

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

---

## Server Architecture (`server/`)

The payment server is a separate Node.js + Express process. It is **optional** — the puzzle app works fully without it (all features just run on the Free tier).

### Key files
| File | Role |
|------|------|
| `server/index.js` | Express app; registers routes; CORS; Stripe init |
| `server/db.js` | SQLite via better-sqlite3; all DB helpers |
| `server/email.js` | Nodemailer; `sendLicenseEmail`, `sendKeyReminder` |
| `server/routes/checkout.js` | `POST /api/checkout/session`, `GET /api/checkout/plans` |
| `server/routes/webhook.js` | `POST /api/webhook` — Stripe events |
| `server/routes/license.js` | `GET /api/license/validate` |
| `server/routes/admin.js` | `GET/POST/PUT/DELETE /api/admin/*` |
| `server/admin.html` | Self-contained admin dashboard SPA |

### Database schema (`server/db.js`)
Two tables:
- **`licenses`**: `key` (PK, e.g. `PSP-XXXXX-XXXXX-XXXXX-XXXXX`), `email`, `plan` (pro/school/lifetime), `billing_interval` (monthly/annual/null), Stripe IDs, `active` (0/1), timestamps
- **`events`**: audit log of key lifecycle (created/activated/deactivated/reactivated/expired/plan_changed)

Key format uses a 32-character unambiguous alphabet (no 0, O, I, 1) grouped as `PSP-XXXXX-XXXXX-XXXXX-XXXXX`.

### Webhook MUST receive raw body
`POST /api/webhook` is registered **before** `express.json()` middleware. Stripe uses the raw body to verify the `stripe-signature` header. Do not apply `json()` to this route. The route file uses `express.raw({ type: 'application/json' })` directly.

### Admin API authentication
All `/api/admin/*` routes require `Authorization: Bearer <ADMIN_SECRET>`. The secret is set in `.env`. Admin dashboard at `/admin` uses localStorage to persist the token in the browser session.

### Tier limits
Defined in two places (must be kept in sync):
- **Frontend**: `TIERS` object in `license/licenseManager.js`
- **Server**: `TIER_LIMITS` in `server/routes/license.js` (returned to frontend on validation) and `PLAN_LIMITS` in `server/email.js` (used in license delivery email)

| Tier | Words | Bulk Sets |
|------|-------|-----------|
| free | 30 | 3 |
| pro | 50 | 25 |
| school | 50 | 25 |
| lifetime | 50 | 25 |

### Stripe plans
| Plan key | Mode | DB plan | Interval |
|----------|------|---------|----------|
| `pro_monthly` | subscription | pro | monthly |
| `pro_annual` | subscription | pro | annual |
| `school_monthly` | subscription | school | monthly |
| `lifetime` | payment | lifetime | null |

Price IDs are read from env vars at module load (`PLAN_PRICE_IDS` is a plain const, not a function — env vars are immutable at runtime).

---

## Common Pitfalls

### Frontend
- **Bundle caching**: `http.server` caches aggressively. Always bump `?v=N` after `build.sh`.
- **CSS layer priority**: Adding dark-mode overrides to `@layer base` won't work if same selector is in `@layer components`. Put overrides in `@layer components`.
- **`innerText` vs `textContent`**: `innerText` returns `""` for elements inside collapsed `<details>`. Use `textContent` or call `syncSettingsFromDOM()` which uses `.value` / `.checked` (not innerText).
- **`updatePageScales()` calls `renderActivePage()`**: it only re-renders the active page. After navigation, `showPage(n)` calls `renderActivePage()` automatically.
- **`saveState()` is debounced 500 ms**: for sliders that need to immediately read state (e.g., `updateNotesStyles()`), always call `syncSettingsFromDOM()` first.
- **Stale state on toggle changes**: `renderActivePage()` calls `syncSettingsFromDOM()` at the start so toggle/checkbox changes take effect immediately without waiting for the 500ms debounce.
- **Matching `isMatching` detection**: ALWAYS check `'matchLetter' in data[0]`, never `settings.notesConfig.shuffle` alone in a renderer. Settings-driven detection causes "undefined." rendering and wrong layout class when puzzle hasn't been generated yet.
- **`clueTermLength` in matching mode**: when writing any code that displays `(N)` after a definition in matching context, use `w.clueTermLength` not `w.term.length`. They diverge because definitions are shuffled across rows.
- **Editing clues in matching mode**: `updateWord` patches `puzzleData.notes` in-place via `clueOrigIdx`. If you add new code paths that mutate clues, follow this same pattern or call `debouncedGenerate()`.

### License / payment
- **Double-calling badge/bulk updates**: `licenseManager._notify()` fires `onChange` callbacks. Don't also manually call `_updateProBadge`/`_updateBulkLimit` in the same flow — that causes two redundant DOM updates. Let `onChange` handle them; only call `_refreshLicenseModal()` manually when you need the modal content refreshed.
- **XSS from server data**: all plan fields (label, price, priceNote, features, id) and user info (email) from server responses must be passed through `escapeHTML()` before injection into `innerHTML`. Use `textContent` for text-only nodes, or `_renderPlans()` which escapes everything.
- **`_cachedPlans` not invalidated**: plan data is cached for the session. If you change plan definitions on the server, users need a page reload to see them. This is acceptable for static plan configurations.
- **Webhook raw body**: if you add new Express middleware before the webhook route, ensure it doesn't consume or transform the raw body.

### Server
- **`.env` must exist**: server fails to start usefully without env vars. Copy `.env.example` and fill in values. The server starts but logs warnings for missing vars.
- **SQLite WAL mode**: the DB is opened in WAL mode. Don't delete `licenses.db-wal` or `licenses.db-shm` while the server is running.
- **Admin secret length**: `ADMIN_SECRET` should be at least 32 random characters. The `requireAdmin` middleware rejects the exact placeholder string from `.env.example`.
- **Stripe webhook secret**: the `STRIPE_WEBHOOK_SECRET` (`whsec_...`) comes from the Stripe dashboard webhook configuration, not the API keys page.

---

## Adding a New Setting
1. Add default to `state.settings` in `core/state.js`
2. Add read in `syncSettingsFromDOM()`
3. Add restore in `applyStateToDOM()`
4. Add DOM control in `puzzle-suite.html`
5. Add update function in `main.js`; export on both `window` and `window._puzzleApp`
6. Call in init sequence in `main.js` (after `applyStateToDOM`)
7. If affects PDF, pass via `cfg` (which is `state.settings`) or add to `buildCtx()` return

## Adding a New License-Gated Feature
1. Define the limit in all three places: `TIERS` (licenseManager.js), `TIER_LIMITS` (routes/license.js), `PLAN_LIMITS` (email.js)
2. Call `licenseManager.getLimit('yourLimit')` at the enforcement point
3. Call `showUpgradePrompt(message)` for free-tier users hitting the wall; `showToast(message, 'warning')` for pro users at their (higher) cap
4. If it affects a DOM control (like `bulkCount`), update `_updateBulkLimit()` or write an equivalent function and register it in the `onChange` callback

---

## Recent Fixes & Improvements (Session: 2026-03-17 — Payment System)

### Stripe Payment & License Key System
Added a complete payment flow: Node.js/Express server, Stripe Checkout, SQLite license database, Nodemailer email delivery, and admin dashboard.

- **Frontend**: `license/licenseManager.js` singleton manages tier state with 24-hour localStorage cache. Validates against server on startup (non-blocking). `onChange` fires whenever tier changes.
- **Server**: `server/` directory — Express app with routes for checkout, webhook, license validation, and admin CRUD.
- **Tiers**: Free (30 words, 3 bulk sets) → Pro/School/Lifetime (50 words, 25 bulk sets).
- **Key format**: `PSP-XXXXX-XXXXX-XXXXX-XXXXX` using unambiguous alphabet.
- **Admin dashboard**: `/admin` on the server — login, stats, paginated license table, create/deactivate/resend flows.

### Review Fixes Applied (same session)
- **XSS hardening**: all server-supplied plan/user data escaped via `escapeHTML()` before `innerHTML` injection in `_renderPlans()` and `_refreshLicenseModal()`
- **Deduped init calls**: removed redundant `.then()` block; `onChange` fires via `_notify()` when `init()` resolves
- **Plans cached**: `_cachedPlans` variable prevents network fetch on every modal open; `_renderPlans()` helper extracted
- **Atomic DELETE**: admin delete route wraps both `DELETE FROM licenses` and `DELETE FROM events` in `db.transaction()`
- **Single cache read**: `_validate()` error handler reuses `cachedBeforeFetch` instead of re-reading localStorage
- **`PLAN_PRICE_IDS` as const**: was a function re-reading env on every request; now a plain object read once at module load

---

## Session Fixes (2026-03-17 — Puzzle Renderer)

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
**Improvement**: HTML key (`keys.js`) and PDF key (`pdfDrawNotes.js`) previously showed only `1. C` in the matching answer key. Now shows `1. APPLE  C` — term on left, correct letter right-aligned.

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
