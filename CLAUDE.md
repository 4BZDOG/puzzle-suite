# CLAUDE.md — Developer Notes for Claude

## Build & Run

### Frontend (puzzle app)
```bash
bash build.sh                  # esbuild bundles main.js → bundle.js, stamps cache-bust hash
python3 -m http.server 8082    # serve at http://localhost:8082/puzzle-suite.html
```
After any JS change just rerun `bash build.sh` — it stamps a fresh content-hash into
the `<script src="bundle.js?v=…">` tag automatically. No manual bump needed.

```bash
npm run test:pdf               # PDF layout regression tests (headless, no browser)
npm run test:pdf -- --write    # …and write sample PDFs to tests/__out__/
```
`tests/pdfLayout.test.mjs` drives the real drawers with real generated puzzle
data and asserts on where things landed: crossword on one page, pages filled
past 80%, no two text runs overlapping on a baseline, no Times fallback, key
numbers present, scaffolding toggles honoured. Run it after touching anything
in `pdf/`.

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
3. Builds a `ctx` context object via `buildCtx()` — carries doc, dimensions, scale, pdfFont, drawWatermark, plus the scaffolding flags (`showExample`, `showLetterCount`, `cwShowBank`)
4. Loops over sets (bulk export), then page types in `cfg.pageOrder`
5. Each page: `drawHeader(ctx, title, sub, instruction, isKey, setIndicator, pScale, { label, accent, icon, firstOfSet })` → returns Y where content starts. Every page uses the same **two-tier grid** so nothing jumps when a student turns the sheet: title left and the `SET N` badge right on tier one, a divider, then the student input row *below* the rule. `firstOfSet: false` draws a **slim running header** (small title, no subtitle, one full-width NAME rule); sheet one of each set gets NAME / DATE / CLASS in equal cells via `_formRow()`, where every rule starts one label-column in so all three are the same length. The key gets a `TEACHER ANSWER KEY — SET N` banner in the same slot
6. Passes a layout `{ x, y, w, h }` (`contentBox(sy)`, which reserves `FOOTER_H`) to each `drawXxx()` function
7. `drawFooter(ctx, pScale, { right, setLabel, pageInSet, pagesInSet })` closes each page with a hairline, the worksheet title and **per-set** pagination (`Set 10 — Page 1 of 4`). Footers are drawn in a **second pass** after every set is laid out, because a set's page count is not known until it is drawn (a crossword that splits costs one sheet more); `pdfExport.js` collects a `footerQueue` and replays it with `doc.setPage()`. Never restore a document-wide `getNumberOfPages()` counter to a student-facing footer

### Duplex packaging (CRITICAL)
A class set is printed double-sided, so pages `2k-1` and `2k` are physically
the same sheet. Two settings keep that safe, both default **on**:

| Setting | Effect |
|---------|--------|
| `keysAtEnd` | Every teacher key is pulled out of the student packet and drawn in an **appendix after all sets**. Otherwise a 6-page packet prints the answer key on the reverse of the student's own crossword clues. |
| `duplexSafe` | Each student packet is padded to an **even** page count (`drawBlankFiller`), so no sheet ever carries two students' work, and the appendix always starts on a fresh sheet. |

`pdfExport.js` therefore runs three passes: student pages per set (with
padding), then the key appendix, then the deferred footer pass. Appendix
footers carry a `pageText` override (`Answer key 2 of 5 · Set 2`) because they
belong to no student packet. **Never draw a key inside the student page loop
when `keysAtEnd` is on**, and never make a packet odd-length.

`PAGE_META` maps each page type to its header chip label and accent colour.
Usage metering reports `doc.internal.getNumberOfPages()` (actual sheets), not
the pre-export estimate, because a crossword that has to split costs one more.

### Page budgeting (layout engine)
Every activity page is *measured before it is drawn* and then fitted, so a
short word list does not leave a third of the sheet blank and a long one does
not spill onto a second sheet:

| Page | Strategy |
|------|----------|
| Notes | Binary-search a single scale `k` (type size + leading together, 0.72–1.7) for the largest that still fits one page. Term-column width is measured **at the chosen size**. Leftover below 40 mm is centred; above that it becomes a ruled `NOTES` writing area (`drawRuledArea`). |
| Word search | Word-bank height is computed first, then the grid is sized into what remains (cells up to 11 mm) and the slack centred. |
| Crossword | `drawCrosswordPage()` — see below. |
| Scramble | Two columns by default (one for ≤ 8 items, three for > 24); rows spread across the height left by the word bank, capped at 22 mm and centred; dotted leaders bridge word → answer line; answer lines capped at 52 mm because a writing line only has to fit a word. A `scrShowBank` word bank (default on) frames every answer, alphabetised, at the foot of the page. |
| Answer key | Quadrants adapt to how many keys are actually present (1 → full page, 2 → halves, 3–4 → quadrants). |

### Single-page crossword compiler (`pdf/pdfDrawCrossword.js`)
`drawCrosswordPage(ctx, cwData, layout, pScale, forceSplit)` solves grid cell
size and clue type size **together** instead of giving the grid a fixed 45% of
the page. It scans cell sizes from 12 mm down to 4.6 mm and, for each, finds the
largest clue point size that fits, in two candidate arrangements:

- **below** — clues in two columns under the grid, ACROSS then DOWN (the
  familiar worksheet shape)
- **below3** — the same clues flowed down *three* columns (`_flowClues` /
  `_distribute`), breaking only between clues and never orphaning a section
  heading. Three shorter columns need far less height than two, which is what
  keeps a twenty-word puzzle off a second sheet
- **beside** — clues in one column next to the grid (suits tall, narrow grids and
  soaks up the whitespace a portrait grid leaves)

Score is `min(pt, IDEAL_PT) * 100 + cellSize`: legibility wins until clues reach
9.5 pt, after which the grid takes the remaining room. Clue heights are memoised
per (list, column width, point size), so the scan is cheap.

**Cell geometry** (`_drawGrid`): the clue number owns a reserved top-left zone
(`ZONE_W/ZONE_H`) and its type is sized to *that zone*, not to the cell — set at
the one-digit size, "10" ran straight into the upright of a prefilled L. Letters
sit on a low baseline (`BASE_NUMBERED`) that clears the zone, so the two can
never share space. Below `KEY_NUM_MIN_CELL` (6 mm) a key thumbnail drops its
clue numbers entirely: a four-up key cannot fit a two-digit number and a
solution letter in one 4 mm cell.

A dedicated clue page (`drawCrosswordClues`) draws **no filler**. Ruling the
leftover with a WORKING OUT area only disguised the real problem, which was the
grid being stranded on the previous sheet.

It returns `{ splitNeeded }`. `true` only when the teacher explicitly asked for
`cwSeparateClues`, or when the puzzle genuinely cannot fit at minimum size — the
caller then draws `drawCrosswordClues()` on a following page. **Clues never
split by accident.**

### Shared PDF primitives (`pdf/pdfHelpers.js`)
- `PALETTE` — one colour language: `example` (blue) for scaffolding, `key` (crimson) for teacher answers
- `setFontSafe` / `resolveStyle` / `hasFontStyle` — **never** call `doc.setFont(font, style)` directly. Custom fonts are registered in `normal` and `bold` only; asking jsPDF for a style a font lacks makes it silently fall back to **Times**, which is what used to put a Times-italic subtitle under an Inter title.
- `drawCapsule` — stadium outline along a word path, built as a real polygon so it can be stroked without painting over grid lines or letters. Used for the student's worked example (blue) and every word-search solution on the key (crimson).
- `drawExamplePill` / `examplePillWidth` / `placeExamplePill` — the single EXAMPLE marker used by all four activities. Always reserve `examplePillWidth()` when wrapping the text it will sit beside.
- `drawBlankFiller` — the labelled blank back of a duplex sheet (see Duplex packaging).
- `drawLeader` — dotted leader (scramble answer lines, matching-key answers)
- `drawRuledArea` — ruled writing space for leftover page height
- `drawHeader` auto-fits the title and subtitle to the width left by the NAME/DATE block, so a real unit name no longer runs through the rule.

### Vector icons (`pdf/pdfIcons.js`, `ui/icons.js`)
Activity icons are drawn with jsPDF vector primitives (`drawIcon(doc, name, x,
y, size, color)`) and, on screen, as inline SVG (`svgIcon(name)`). They print
sharp at 600 dpi; the system emoji they replaced went through the canvas raster
fallback and printed soft. `PAGE_ICONS` maps page type → icon name. Do **not**
put emoji back into header instruction strings.

### Emoji in PDF
PDF fonts (helvetica + custom loaded fonts) don't support emoji. The canvas fallback in `pdf/pdfHelpers.js`:
- `hasEmoji(str)` — detects emoji via Unicode property escapes
- `textToImgPDF(text, opts)` — renders to HTML canvas (system emoji font), returns PNG dataURL + mm dimensions
- `drawText()` — unified draw helper that checks `hasEmoji()` for title/subtitle/instructions; routes to canvas or `doc.text()` accordingly
- Instruction strings in `pdfExport.js` now include emoji prefixes (`📋` Notes, `🃏` Matching, `🔍` Word Search, `✏️` Crossword, `🔀` Scramble)
- `drawHeader()` uses `drawText()` for all three text elements (title, subtitle, instructions) so emoji render correctly

### Renderers (HTML preview)
`renderNotes / renderWordSearch / renderCrossword / renderScramble` write to DOM containers directly. They are called by `renderActivePage()` (main.js) which routes to the correct renderer based on `state.activePage`.

The crossword renderer keeps the whole page on one sheet via
`_fitCrosswordPage()` after DOM insertion: clue type, the word bank **and** the
grid give way together (the Grid Scale slider becomes a requested maximum
rather than a hard size). Scaling only the clues used to drive them to 5.5 pt
while the word bank still hung off the bottom of the page.

The word-search renderer draws highlights as an SVG capsule overlay
(`capsuleOverlay()`, exported from `renderers/wordSearch.js` and reused by
`renderers/keys.js`) rather than tinting individual cells — a diagonal or
backwards word tinted cell-by-cell reads as scattered specks, not a word. The
overlay needs `z-index: 2` because `.cell` sits at `z-index: 1`.

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

**Seeded generation**: `generateAllAsync(settings, variantSeed)` drives every
random choice from a `mulberry32` PRNG, so a seed reproduces a puzzle exactly
and two seeds diverge. Three things make topologies actually differ:
1. a real Fisher-Yates shuffle before the (stable) length sort
2. the seed word starts across **or** down, chosen by the PRNG
3. placement takes a random move from a narrow near-best score band rather than
   always the single global optimum

Each result carries `cw.signature` (a sorted word@x,y+dir string). `pdfExport.js`
keeps a `usedTopologies` set, re-rolls a duplicate up to 3 times, and finally
falls back to `transposeCrossword(cw)`. **Transpose is the only rigid transform
available** — a rotation or mirror would leave every word reading backwards.

`generateWS` places the worked example **first and forwards** (`dir [1,0]`),
marked `isExample: true`, and picks a moderate 5–7 letter word for it.

### Puzzle Data Builder (`core/puzzleDataBuilder.js`)
Shared module exporting `getLetter(i)` and `createPuzzleData(variantSeed)`. Used by both `main.js` (live preview) and `pdf/pdfExport.js` (PDF generation). Avoids code duplication.

`createPuzzleData(variantSeed)` forwards the seed to the worker. Bulk export
passes a **distinct seed per set** (`_setSeed(i, attempt)` in `pdfExport.js`) so
two students never get the same crossword; it also flags `isExampleTerm` /
`isExampleDef` on each note.

### Dependency-free shared models (`core/notesModel.js`, `core/exampleModel.js`)
Both are imported by the HTML renderers, the PDF drawers **and** the Node test
harness, so they must never touch the DOM, the worker, or app state.

| Export | Module | Purpose |
|--------|--------|---------|
| `isMatchingNotes(notes)` | notesModel | matching mode is a property of the DATA, never of settings |
| `exampleDefIndex(notes)` | notesModel | row carrying the EXAMPLE badge on the **definition** side |
| `stripLetterCount(clue)` | notesModel | drops a trailing `(12)` from a definition |
| `pickCrosswordExample(across)` | exampleModel | 5–7 letters preferred, else nearest to 6 |
| `pickWSExample(wsData)` | exampleModel | the word the generator marked, placed left-to-right |

**The two-sided worked example (CRITICAL)**: in matching mode the example spans
*two different rows*. The term side (prefilled answer box) is always row 0. The
definition side (EXAMPLE badge) is `exampleDefIndex(notes)` — the row whose
definition describes term 1. Pinning the badge to row 0 marks a definition that
is **not** the answer to the example. Never use `i === 0` for the badge.

### Undo/Redo (`core/history.js`)
`pushHistory()` must be called BEFORE mutating `state.words`. Max 50 entries. Word reorder, add, and delete operations push history; clue/term inline edits do not. Undo saves the current post-mutation state for redo before restoring. A `_mutatedSinceSnap` flag prevents duplicate history entries when undoing from a mid-history position.

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
| `server/tiers.js` | **Single source of truth** for tier limits, feature flags, PDF page quotas |
| `server/routes/checkout.js` | `POST /api/checkout/session`, `GET /api/checkout/plans` |
| `server/routes/webhook.js` | `POST /api/webhook` — Stripe events |
| `server/routes/license.js` | `GET /api/license/validate` (returns limits + features + usage) |
| `server/routes/usage.js` | `GET /api/usage`, `POST /api/usage/pdf` — PDF page metering |
| `server/routes/admin.js` | `GET/POST/PUT/DELETE /api/admin/*` (incl. `GET /api/admin/usage`) |
| `server/admin.html` | Self-contained admin dashboard SPA (Dashboard / PDF Usage / Licenses / Create) |
| `server/rateLimit.js` | In-memory sliding-window rate limiter (no deps) |

### Database schema (`server/db.js`)
Three tables:
- **`licenses`**: `key` (PK, e.g. `PSP-XXXXX-XXXXX-XXXXX-XXXXX`), `email`, `plan` (pro/school/lifetime), `billing_interval` (monthly/annual/null), Stripe IDs, `active` (0/1), timestamps
- **`events`**: audit log of key lifecycle (created/activated/deactivated/reactivated/expired/plan_changed)
- **`usage_events`**: one row per PDF export — `identity` (license key or `anon:<clientId>`), `license_key`, `tier`, `pages`, `sets`, `page_types`, `month` (`YYYY-MM` for fast rollups). This is the metering basis for monetising PDF generation by page.

### PDF page metering (monetisation)
- Every PDF export reports its **total page count** (sets × pages-per-set) to `POST /api/usage/pdf`. A crossword with "clues on separate page" counts as 2 pages.
- Free/anonymous users are tracked by an opaque `clientId` (localStorage `puzzleSuiteClientId`); licensed users by their key.
- Monthly quota per tier is `limits.pdfPagesPerMonth` in `tiers.js` (`null` = unlimited). The frontend pre-checks via `licenseManager.canExport(pages)` and blocks/​warns when over quota; **non-blocking if the server is unreachable** (consistent with license validation).
- The server records actuals even when over quota (for analytics/overage); enforcement is the frontend's pre-export check.
- Admin dashboard "PDF Usage" tab reads `GET /api/admin/usage` (month totals, per-tier breakdown, 30-day daily chart, top consumers). Per-license usage shows in the license detail modal.

Key format uses a 32-character unambiguous alphabet (no 0, O, I, 1) grouped as `PSP-XXXXX-XXXXX-XXXXX-XXXXX`.

### Webhook MUST receive raw body
`POST /api/webhook` is registered **before** `express.json()` middleware. Stripe uses the raw body to verify the `stripe-signature` header. Do not apply `json()` to this route. The route file uses `express.raw({ type: 'application/json' })` directly.

### Admin API authentication
All `/api/admin/*` routes require `Authorization: Bearer <ADMIN_SECRET>`. The secret is set in `.env`. Admin dashboard at `/admin` uses localStorage to persist the token in the browser session. The secret comparison uses `crypto.timingSafeEqual` to prevent timing side-channel attacks.

### Rate limiting
`/api/checkout`, `/api/license`, and `/api/usage` have in-memory rate limits (30, 10, and 60 req/min per IP respectively). The limiter is in `server/rateLimit.js` — a sliding-window counter with no external dependencies. Admin routes are not rate-limited (already behind ADMIN_SECRET).

### Tier limits & features (TUNABLE)
**`server/tiers.js` is now the single source of truth** for limits, feature flags, and PDF page quotas. `routes/license.js`, `routes/usage.js`, `email.js`, and `routes/checkout.js` all import it — change a number there and it propagates everywhere server-side. The **frontend mirrors** these in the `TIERS` object in `license/licenseManager.js` as an offline fallback; the **server response always wins** when reachable (`licenseManager.getLimit()` / `hasFeature()` prefer `info.limits` / `info.features`), so you can re-price or re-gate without shipping new frontend code.

| Tier | Words | Bulk Sets | PDF Pages/mo | separateCluePages | premiumFonts |
|------|-------|-----------|--------------|-------------------|--------------|
| free | 30 | 3 | 30 | ✗ | ✗ |
| pro | 50 | 25 | 1,000 | ✓ | ✓ |
| school | 50 | 25 | 10,000 | ✓ | ✓ |
| lifetime | 50 | 25 | 2,000 | ✓ | ✓ |
| admin | 200 | 100 | unlimited | ✓ | ✓ |

Feature gating is enforced at the PDF export boundary (`pdf/pdfExport.js`): locked features in use → upgrade prompt + abort. Add new gates by adding a flag to `tiers.js` features + the frontend mirror, then calling `licenseManager.hasFeature('name')`.

### Admin & test access (full access for the owner / QA)
There are two independent access mechanisms — keep them mentally separate:

1. **Admin dashboard** (`/admin`) — operational access to manage licenses & view usage. Auth = `ADMIN_SECRET` (Bearer token). This is *not* a feature tier; it's the back-office.
2. **`admin` feature tier** — an all-access in-app tier (every feature, unlimited PDF pages). It is **not sold via Stripe**. Two ways to obtain it:
   - **`DEV_LICENSE_KEY`** (env): a single secret that validates as the `admin` tier with no DB row and no Stripe. Paste it into the app's "I have a key" box for instant full access. Off by default; min 24 chars; compared with a constant-time SHA-256 digest in `db.getDevLicense()`. Set `DEV_LICENSE_TIER` to grant a specific tier instead (e.g. `pro`) for testing real paid-tier limits.
   - **Quick Test Account** button in the admin dashboard ("Create License" page) → `POST /api/admin/test-account` creates a DB-backed `admin`-tier license and returns the key (no email sent).

`VALID_PLANS` in `tiers.js` includes `admin`, so it's creatable via the admin API. Stripe webhook plan validation is separate (`webhook.js` hardcodes pro/school/lifetime) so customers can never self-provision `admin`.

**TEMPORARY — offline admin unlock** (`OFFLINE_ADMIN_HASH` in `license/licenseManager.js`): until the server is deployed, the static site has no backend to validate keys, so a client-side fallback grants the `admin` tier when a key matching the baked SHA-256 hash is entered. `_offlineGrant()` runs at the top of `_validate()` (so it works on activation and on reload) and requires no network. Only the hash is in the bundle (preimage-resistant). **Remove this once the licensing server is live** — the real `DEV_LICENSE_KEY` then provides server-validated full access. To rotate the secret: `node -e "console.log(require('crypto').createHash('sha256').update(SECRET.toUpperCase()).digest('hex'))"` and replace the constant.

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
- **Bundle caching**: `http.server` caches aggressively. `build.sh` stamps a fresh content-hash into `<script src="bundle.js?v=…">` automatically — no manual bump needed.
- **CSS layer priority**: Adding dark-mode overrides to `@layer base` won't work if same selector is in `@layer components`. Put overrides in `@layer components`.
- **`innerText` vs `textContent`**: `innerText` returns `""` for elements inside collapsed `<details>`. Use `textContent` or call `syncSettingsFromDOM()` which uses `.value` / `.checked` (not innerText).
- **`updatePageScales()` calls `renderActivePage()`**: it only re-renders the active page. After navigation, `showPage(n)` calls `renderActivePage()` automatically.
- **`saveState()` is debounced 500 ms**: for sliders that need to immediately read state (e.g., `updateNotesStyles()`), always call `syncSettingsFromDOM()` first.
- **Stale state on toggle changes**: `renderActivePage()` calls `syncSettingsFromDOM()` at the start so toggle/checkbox changes take effect immediately without waiting for the 500ms debounce.
- **Matching `isMatching` detection**: ALWAYS use `isMatchingNotes(data)` from `core/notesModel.js`, never `settings.notesConfig.shuffle` alone in a renderer. Settings-driven detection causes "undefined." rendering and wrong layout class when puzzle hasn't been generated yet.
- **The EXAMPLE badge is not row 0 in matching mode**: use `exampleDefIndex(notes)` for the badge and `0` for the prefilled answer box. They are different rows because definitions are shuffled. Pinning the badge to row 0 marks the wrong definition — the P0 defect of the Sept 2026 review.
- **No `(n)` letter counts on a matching sheet**: the count identifies the answer outright (only one word has three letters). `showLetterCount` is forced off when `isMatching`, and clue text goes through `stripLetterCount()`. Crossword clues keep the count.
- **Never clamp the EXAMPLE pill back over its text**: use `placeExamplePill()`, which drops the pill onto its own line when it cannot fit after the last line, and add that line's height in the measuring pass too.
- **Grid numbers and letters must not share space**: `_drawGrid` gives the number a reserved top-left zone and sizes its type to that zone, then puts the letter on a baseline below it. Do not size the number off the cell (a two-digit number then collides) and do not paint a knockout chip behind it (the chip clips the letter on a small key thumbnail).
- **A teacher key must never share a sheet with a student page**: keys go in an appendix and packets are padded to even lengths. See **Duplex packaging**.
- **Never mark the example with a half-row background**: shading one side of a row breaks the table's alternating bands into a checkerboard. Use the blue outline (`ex-term` / `ex-def` cell borders in CSS, `roundedRect` stroke in the PDF).
- **Word-search cell geometry is load-bearing**: `.mode-search .cell` states `width`/`height` as `--cell-size + --ws-line-width` (the negative margin collapses the rule into the neighbour). `capsuleOverlay()` measures cell centres from exactly that geometry via its `lineW` option — change one and you must change the other, or highlights drift off the letters.
- **`clueTermLength` in matching mode**: when writing any code that displays `(N)` after a definition in matching context, use `w.clueTermLength` not `w.term.length`. They diverge because definitions are shuffled across rows.
- **Editing clues in matching mode**: `updateWord` patches `puzzleData.notes` in-place via `clueOrigIdx`. If you add new code paths that mutate clues, follow this same pattern or call `debouncedGenerate()`.
- **Never call `doc.setFont()` directly in PDF code**: use `setFontSafe()`. A missing style (italic, in every custom font) makes jsPDF fall back to Times without warning.
- **Reserve room for the EXAMPLE pill**: when wrapping text the pill will sit beside, subtract `examplePillWidth()` from the wrap width, in the measuring pass *and* the drawing pass, or the pill lands on the words.
- **Measure at the size you will draw at**: the notes page picks its type size after measuring, so column widths must be measured at the chosen size, not at a nominal 10 pt.
- **XSS in renderers**: ALL six renderer files (notes, crossword, wordSearch, scramble, keys, wordList) use `escapeHTML()` on user-controlled strings before innerHTML injection. When adding new renderers or modifying existing ones, always escape term/clue/word data. Input sanitization (A-Z only) is defense layer 1; output escaping is defense layer 2.
- **Word charset is A-Z only**: `updateWord` strips non-A-Z, `processImport` strips non-A-Z, `applyStateToDOM` sanitizes JSON imports to A-Z. All three paths must stay consistent.
- **JSON import sanitization**: `applyStateToDOM` validates and sanitizes `s.words` — filters non-objects, strips non-A-Z from terms, coerces types. This prevents stored XSS via crafted config files.

### License / payment
- **Double-calling badge/bulk updates**: `licenseManager._notify()` fires `onChange` callbacks. Don't also manually call `_updateProBadge`/`_updateBulkLimit` in the same flow — that causes two redundant DOM updates. Let `onChange` handle them; only call `_refreshLicenseModal()` manually when you need the modal content refreshed.
- **XSS from server data**: all plan fields (label, price, priceNote, features, id) and user info (email) from server responses must be passed through `escapeHTML()` before injection into `innerHTML`. Use `textContent` for text-only nodes, or `_renderPlans()` which escapes everything. The admin dashboard (`server/admin.html`) uses its own `esc()` function for the same purpose.
- **`_cachedPlans` not invalidated**: plan data is cached for the session. If you change plan definitions on the server, users need a page reload to see them. This is acceptable for static plan configurations.
- **Webhook raw body**: if you add new Express middleware before the webhook route, ensure it doesn't consume or transform the raw body.
- **Webhook errors return 500**: handler errors in `routes/webhook.js` return HTTP 500 so Stripe retries. Never swallow errors with 200 — a customer who pays must always get their license key.

### Server
- **`.env` must exist**: server fails to start usefully without env vars. Copy `.env.example` and fill in values. The server starts but logs warnings for missing vars.
- **SQLite WAL mode**: the DB is opened in WAL mode. Don't delete `licenses.db-wal` or `licenses.db-shm` while the server is running.
- **Admin secret length**: `ADMIN_SECRET` should be at least 32 random characters. The `requireAdmin` middleware rejects the exact placeholder string from `.env.example`.
- **Stripe webhook secret**: the `STRIPE_WEBHOOK_SECRET` (`whsec_...`) comes from the Stripe dashboard webhook configuration, not the API keys page.

---

## Difficulty scaffolding toggles
Three settings control how much help a worksheet gives; all three flow through
`buildCtx()` into every drawer, and the HTML preview reads them from
`state.settings` so preview and print agree:

| Setting | Control | Effect |
|---------|---------|--------|
| `showExample` | Difficulty & Scaffolding card | One worked example per activity, marked with the shared EXAMPLE pill |
| `showLetterCount` | Difficulty & Scaffolding card | The `(n)` letter-count hint after definitions, clues and clue-style word banks |
| `cwShowBank` | Crossword card | Word bank under the crossword clues (**now honoured in the PDF**, not just the preview) |

## Adding a New Setting
1. Add default to `state.settings` in `core/state.js`
2. Add read in `syncSettingsFromDOM()`
3. Add restore in `applyStateToDOM()`
4. Add DOM control in `puzzle-suite.html`
5. Add update function in `main.js`; export on both `window` and `window._puzzleApp`
6. Call in init sequence in `main.js` (after `applyStateToDOM`)
7. If affects PDF, pass via `cfg` (which is `state.settings`) or add to `buildCtx()` return

## Adding a New License-Gated Feature
1. Define the limit/flag in **`server/tiers.js`** (the source of truth) and mirror it in the `TIERS` object in `license/licenseManager.js` (offline fallback). `email.js`, `routes/license.js`, `routes/usage.js`, `routes/checkout.js` already read `tiers.js` automatically.
2. For a numeric cap: call `licenseManager.getLimit('yourLimit')`. For a boolean feature: call `licenseManager.hasFeature('yourFeature')`. Both prefer the server-supplied value (`info.limits` / `info.features`) and fall back to the local mirror.
3. Call `showUpgradePrompt(message)` for free-tier users hitting the wall; `showToast(message, 'warning')` for pro users at their (higher) cap
4. If it affects a DOM control (like `bulkCount`), update `_updateBulkLimit()` or write an equivalent function and register it in the `onChange` callback
5. To meter usage of a metered resource, record it via the usage endpoint pattern (`POST /api/usage/*`) keyed by `licenseManager.getClientId()` / stored key.

---

## Deployment
GitHub Actions (`.github/workflows/deploy.yml`) auto-deploys on every push to `main`:
1. `bash build.sh` → stage `dist/` → deploy to GitHub Pages
2. **Only runtime files are published** (`puzzle-suite.html`, `index.html`,
   `puzzle-suite.css`, `bundle.js`, `.nojekyll`). Internal docs (`CLAUDE.md`,
   `memory.md`, `monetisation.md`), `server/`, and `.claude/` are deliberately
   NOT deployed — when adding a new runtime asset, add it to the "Stage
   deployable files" step in `deploy.yml`.
3. `index.html` redirects `/` → `puzzle-suite.html` for a clean entry URL

The payment server (`server/`) is **not** deployed by this workflow — deploy it separately per `DEPLOY.md` (Fly.io, Render, Railway, or a VPS).

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

---

## Session Fixes (2026-09-14b — Layout Review v2)

Second round on the same 25-set class pack. The v1 fixes held; these are the
defects the reviewer found in the updated output. `npm run test:pdf` now runs
74 checks.

### The duplex catastrophe (`BUG-DUP-01`, P0)
A six-page packet printed double-sided put the **complete teacher answer key on
the reverse of the student's crossword clues**. The teacher could neither hand
the sheet over nor withhold it. Keys now go in an appendix after every student
set (`keysAtEnd`), and each packet is padded to an even page count
(`duplexSafe`), which also stops one sheet carrying two students' work. Both
default on; see **Duplex packaging**.

### Crossword
- **`BUG-XWD-05`**: deleted the artificial `WORKING OUT` ruling from the
  dedicated clue page. It was filler hiding whitespace, and a vocabulary
  crossword needs no calculation space.
- **`BUG-XWD-06`**: the clue number owns a reserved corner zone and is sized to
  it; the letter sits on a baseline below. Sized off the cell, "10" ran into
  the upright of a prefilled `L`.
- **`BUG-KEY-01`**: a key thumbnail below 6 mm per cell drops its clue numbers.
  In a four-up quadrant a two-digit number and a solution letter cannot share
  the cell, and the knockout chip added in v1 was clipping the letter.

### Header, scramble, striping
- **`BUG-HDR-01`**: one two-tier header on every page — title and `SET N` above
  the rule, student input row below it. The badge no longer moves between the
  margin and the name row, and the key names its set in the banner, not just
  the footer.
- **`BUG-SCR-01`**: the scramble runs in two columns with answer lines capped
  at 52 mm, and a framed `WORD BANK` (`scrShowBank`, default on) gives Year 8
  students something to work from on a 12-letter anagram.
- **`BUG-VOC-05`**: the worked example is marked with a blue outline instead of
  a half-row background fill, which had broken the zebra striping into a
  checkerboard.

---

## Session Fixes (2026-09-10 — Worksheet Layout & Answer Key Review)

Acting on a teacher review of a printed 6-page worksheet.

### Layout engine
- **Single-page crossword compiler** (`drawCrosswordPage`): grid size and clue
  type are solved together over two candidate arrangements (clues below, clues
  beside). Grid and clues no longer split across two sheets unless asked for.
- **Page budgeting everywhere**: notes scale type+leading to fill the sheet
  (and turn genuine leftover into ruled writing space); the word search sizes
  its grid around the word bank; scramble rows spread down the page in as few
  columns as fit; key quadrants adapt to how many keys exist.
- **Header auto-fit**: long unit titles no longer run through the NAME rule.

### Answer key
- **`COORDINATEA` fixed**: the matching key reserves a letter column, trims the
  term with an ellipsis if needed and joins the two with a dotted leader. Same
  treatment for the scramble key, whose size is solved from the widest pair.
- **Word-search key**: crimson capsule rings trace each solution path; filler
  letters recede to mid-grey instead of near-white.
- **Crossword key**: clue numbers are drawn alongside the solution letters.
- The key page now goes through `drawHeader()` instead of duplicating it.

### Consistency & typography
- **One example language**: a single blue EXAMPLE pill plus a blue capsule /
  pre-filled answer, in all four activities and in the HTML preview.
- **Times fallback removed**: `setFontSafe()`/`resolveStyle()` keep every run
  inside the selected family (the italic subtitle was silently becoming Times).
- **Ghost cells fixed**: word-search highlights are one connected capsule
  (vector in the PDF, SVG overlay in the preview), not per-cell tints.
- Activity chips + a running footer (title, activity, page number) give each
  page identity and make a printed class set collatable.

### Scaffolding controls
- New `showLetterCount` toggle for `(n)` hints; `cwShowBank` now reaches the
  PDF; `showExample` unchanged.

### Tests
- `tests/pdfLayout.test.mjs` (`npm run test:pdf`) — 25 assertions over real
  generated puzzles, including a general "no two text runs overlap on a
  baseline" check that would have caught the answer-key collision.

---

## Session Fixes (2026-09-14 — Layout Review Punch List)

Acting on a bug & layout review of a printed 25-set class pack (Year 8
Mathematics: Linear Relationships). All thirteen items closed; the review's
verification plan is now part of `npm run test:pdf`.

### Vocabulary (P0s)
- **`BUG-VOC-01` example badge followed the shuffle**: the `[EXAMPLE]` badge was
  pinned to definition row A while the prefilled answer box was on term row 1.
  In ~95% of shuffles row A belongs to a different term, so the one worked
  example taught the wrong pairing. `exampleDefIndex()` now binds the badge to
  the definition describing term 1; the example tint splits across the two rows.
- **`BUG-VOC-02` badge overlapped definition text**: `placeExamplePill()` gives
  the badge a guaranteed slot, dropping it to its own line rather than clamping
  it back over the words. The preview's `.notes-clue` is a wrapping flex row
  with `flex-shrink: 0` on the pill.
- **`BUG-VOC-03` letter counts leaked the answers**: `(3)`, `(12)` after a
  shuffled definition identify the term outright. Counts are now suppressed on
  matching sheets (and stripped from clue text) while crossword clues keep them.
- **`BUG-VOC-04` column widths and box alignment**: proportional columns
  (# 5%, answer box 8%, term, definition) and the answer box centred on the
  row's whole text block instead of its first baseline. Default term width
  20% → 27%.

### Crossword
- **`BUG-XWD-01`**: added the three-column clue flow; grid + clues now fit one
  page at 8/12/15/20/25 words. A dedicated clue page (teacher's explicit
  choice) fills its leftover with a ruled WORKING OUT area.
- **`BUG-XWD-02`**: letters are drawn before numbers, and the number sits on a
  knockout chip; a letter sharing its cell with a number is set 10% smaller and
  nudged down.
- **`BUG-XWD-03`**: seeded generation plus randomised near-best placement and a
  per-set signature check. 25 sets now produce 25 distinct topologies (they
  previously collapsed onto a handful — sets 2, 6, 7 and 23 were identical).
- **`BUG-XWD-04`**: `pickCrosswordExample()` prefers a 5–7 letter across word,
  so no set prefills a 12-letter SUBSTITUTION.

### Word search
- **`BUG-WSR-01`**: cell width/height are stated explicitly (strict 1:1) and
  `capsuleOverlay()` tracks true cell centres with a padded viewport, so
  diagonal capsules stop skewing off the letters.
- **`BUG-WSR-02`**: the generator places the example word first, forwards
  left-to-right, and marks it `isExample`.

### Base layout
- **`BUG-DOC-01`**: footers paginate per set (`Set 10 — Page 1 of 4`) via a
  deferred footer pass.
- **`BUG-DOC-02`**: full NAME / DATE / CLASS block on sheet one of a set, a slim
  running header after; all three rules share a start column and an end, so
  they are exactly the same length.
- **`BUG-DOC-03`**: vector icons replace system emoji in both PDF and preview.

---

## Session Fixes (2026-06-11 — Technical Audit)

### Security Fixes
- **XSS hardening (all renderers)**: `escapeHTML()` applied to all user-controlled strings (term, clue, word, scrambled, original, matchLetter, correctLetter) across all 6 renderer files, admin dashboard, and plan display
- **Input sanitization**: `applyStateToDOM` now validates/sanitizes words from JSON imports (A-Z only, type coercion, array/object validation)
- **Import charset unified**: `importWords.js` changed from A-Z0-9 to A-Z only, matching `updateWord`
- **Timing attack fix**: admin secret comparison uses `crypto.timingSafeEqual`
- **Rate limiting**: in-memory sliding-window limiter on `/api/checkout` (30/min) and `/api/license` (10/min)
- **SRI hash**: jsPDF CDN script loads with sha384 subresource integrity check
- **Anthropic CORS header**: fixed from `anthropic-dangerous-allow-browser` to `anthropic-dangerous-direct-browser-access`

### Reliability Fixes
- **Webhook errors**: return 500 instead of swallowing with 200, enabling Stripe retries on transient failures
- **validateKey side-effect**: split into read-only `validateKey()` + explicit `markActivated()` called by route handler
- **Undo/redo**: fixed broken redo — undo now saves post-mutation state for recovery; dirty-tracking prevents duplicates

### Code Quality
- **Deduplicated `createPuzzleData`/`getLetter`**: extracted to `core/puzzleDataBuilder.js`, removing copies from `main.js` and `pdf/pdfExport.js`
- **Deleted dead code**: `workers/generation.worker.js` (266 lines, never imported)
- **Removed unused dep**: `uuid` from `server/package.json`
- **Null guard**: `updatePageScales` no longer crashes on missing DOM elements
