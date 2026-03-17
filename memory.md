# memory.md — Project Memory & Design Decisions

This file tracks key decisions, reasoning, and hard-won lessons across sessions. It complements `CLAUDE.md` (which documents *what* the code does) by recording *why* it works the way it does.

---

## Project Purpose

Puzzle Suite is a teacher tool for generating printable vocabulary worksheets: notes/matching page, word search, crossword, word scramble, and answer key. PDF export via jsPDF.

The frontend is fully client-side and works without any server (Free tier). An optional Node.js/Express server (`server/`) handles Stripe payments, license key issuance and validation, and an admin dashboard. The frontend degrades gracefully if the server is unreachable — all features work on Free tier.

---

## Core Design Invariants

### 1. `puzzleData.notes` is not the source of truth for word content
`state.words` is always authoritative. `puzzleData.notes` is a *derived view* built at generate-time. In standard mode, renderers must read from live `words` (not `puzzleData.notes`) so edits are immediately reflected. Only in matching mode does `puzzleData.notes` carry data that can't be reconstructed from `words` on the fly (the shuffle assignments: `matchLetter`, `correctLetter`, `clueTermLength`).

**Decision rationale**: Keeping standard mode renderer reactive to `state.words` means clue edits show up instantly without requiring a full puzzle regenerate. Matching mode needs the shuffled structure, so it reads from `puzzleData.notes` — but clue text within that structure is patched in-place by `updateWord` to stay fresh.

### 2. Matching mode detection must be data-driven in renderers
Check `'matchLetter' in data[0]`, not `settings.notesConfig.shuffle`. The settings flag reflects *intent*; the data flag reflects *reality* (whether a puzzle has actually been generated in matching mode). Before generation, settings can say shuffle=true but the data won't have `matchLetter`.

**Decision rationale**: Settings-driven detection caused "undefined." text artifacts and wrong CSS grid classes before the first generate. Data-driven detection is already the pattern used in `pdfDrawNotes.js` — all renderers now follow it consistently.

### 3. `(N)` letter count shows the term the definition refers to, not the term in the same row
In matching mode, definitions are shuffled across rows. Row 1 might show term APPLE but display BANANA's definition. The `(N)` after the definition is a student hint — it should say how many letters the *answer to that definition* has (BANANA=6), not how many letters APPLE has.

**Decision rationale**: The field `clueTermLength` was added to the matching data object to carry this value, since `w.term.length` gives the wrong answer in matching mode. It is stored at shuffle time when the source term is known: `clues[i].term.length`.

### 4. The generation worker is always inlined as a Blob URL
This lets the app work from `file://` and any HTTP origin without CORS concerns. All three generators (WS, CW, scramble) run in the worker. Stale results are discarded using a sequence ID guard.

### 5. Undo/redo only covers word list mutations
History is `state.words` snapshots only. Settings changes are not undoable. `pushHistory()` must be called *before* the mutation, not after.

---

## Key Data Shapes

### `state.words` (always)
```js
[{ word: 'APPLE', clue: 'A round red fruit' }, ...]
```

### `puzzleData.ws`
```js
{ grid: char[][], size: N, placed: string[], solution: Set<"x,y"> }
```
`solution` is a `Set` reconstructed from `solutionArray` (plain array from worker, converted to `Set` in `workerBridge.js` on receipt).

### `puzzleData.cw`
```js
{ grid: ({ char, num }|null)[][], rows, cols, placed: [{ word, clue, dir, x, y, num }] }
```

### `puzzleData.scr`
```js
[{ original: 'APPLE', scrambled: 'ELPPA' }]
```

### `puzzleData.notes` — standard mode
```js
[{ term, clue, origIdx }]
```

### `puzzleData.notes` — matching mode
```js
[{
  term,           // word at this row position
  clue,           // a shuffled definition (from a different word)
  matchLetter,    // letter label for this definition slot (A, B, C…)
  correctLetter,  // the letter that matches THIS row's term
  origIdx,        // word index in state.words for this term
  clueOrigIdx,    // word index in state.words for the clue's source term
  clueTermLength  // letter count of the word the clue describes
}]
```

---

## Storage

### Browser (localStorage)
- Main state key: `puzzleSuiteV60` (bump version when schema changes incompatibly)
- Legacy fallback: `puzzleSuiteV59`
- AI keys stored separately: `puzzleSuiteAIKeys` (never included in main payload)
- License key: `puzzleSuiteLicense` (raw key string, uppercased)
- License validation cache: `puzzleSuiteLicenseCache` (JSON `{ key, data, ts }`, 24-hour TTL)
- Watermark src stored at top level of payload (can be large — main quota risk)

### Server (SQLite via better-sqlite3)
- Database file: `server/data/licenses.db` (created automatically; excluded from git)
- `licenses` table: `key, email, plan, billing_interval, active, stripe_session_id, stripe_subscription_id, created_at, activated_at, expires_at`
- `events` table: `id, license_key, event, note, created_at` — audit log for all state changes

---

## Patterns Established This Session

### Data-driven isMatching (2026-03-17)
All four detection sites now use the same pattern:
```js
const isMatching = data.length > 0 && 'matchLetter' in data[0];
```
Previously `notes.js` and `keys.js` used `settings.notesConfig.shuffle`, causing pre-generation artefacts. `pdfDrawNotes.js` already used data-driven detection — it became the reference pattern.

### Live words for standard mode (2026-03-17)
`renderNotes` now branches explicitly:
```js
const hasMatchingData = settings.notesConfig.shuffle &&
    puzzleData.notes?.length > 0 && 'matchLetter' in puzzleData.notes[0];
const targetData = hasMatchingData
    ? puzzleData.notes
    : words.map(w => ({ term: w.word, clue: w.clue }));
```
This replaced the original `puzzleData.notes || words.map(...)` fallback, which only used live words when notes were null — missing the stale-data case after generation.

### In-place patch for matching clue edits (2026-03-17)
```js
if (f === 'clue' && state.puzzleData.notes?.length > 0 && 'clueOrigIdx' in state.puzzleData.notes[0]) {
    const note = state.puzzleData.notes.find(n => n.clueOrigIdx === i);
    if (note) note.clue = v;
}
```
This keeps the matching preview live without triggering a full puzzle regenerate. The shuffle assignments (matchLetter, correctLetter, clueTermLength) remain stable because they depend on term identity, not clue text.

---

## Things That Were Tried / Avoided

- **Settings-driven isMatching in renderers** — tried first, caused "undefined." artifacts before first generate. Abandoned in favour of data-driven.
- **Patching `puzzleData.notes` for word (term) edits** — not needed; word edits already call `debouncedGenerate()` which rebuilds everything.
- **Triggering full regenerate on clue edits** — considered but rejected; too expensive and unnecessary. Clue text changes don't affect puzzle layout. In-place patch is sufficient.

---

## Payment System Design Decisions (2026-03-17)

### License-key auth over user accounts
User accounts (email/password, sessions, forgot-password, etc.) add significant complexity for a tool that is fundamentally stateless. License keys let users pay once, receive a key, and enter it — no registration, no cookie management, no password resets. The server stores only the key, email, plan, and timestamps.

**Decision rationale**: Teachers are the primary audience. They distrust yet-another-account and want a tool that "just works." A key they paste in once provides Pro access forever (Lifetime) or until their subscription lapses. Simpler server, simpler UI, fewer support requests.

### `onChange` listener pattern (not Promise.then)
`licenseManager.init()` is fire-and-forget (`.catch(() => {})`). UI update functions (`_updateProBadge`, `_updateBulkLimit`) are registered via `licenseManager.onChange()` BEFORE `init()` is called, not in a `.then()`. This means:
- They fire when init completes (even asynchronously)
- They fire again whenever the user activates or deactivates a key
- No duplication — one registration handles all state transitions

**Lesson**: Using `.then()` to update UI after `init()` AND `onChange()` for key activation caused double updates. `onChange` fires on init completion via `_notify()`, so `.then()` is redundant and should be removed.

### `_cachedPlans` prevents repeated network requests
Plan data (prices, features, plan IDs) from the server is cached in a module-level `let _cachedPlans = null`. `_loadPlansUI()` returns the cached array on subsequent calls. This prevents a fetch request every time the user opens the Upgrade modal.

### XSS discipline: all server data through `escapeHTML`
All server-supplied strings rendered via `innerHTML` — `p.label`, `p.price`, `p.features[n]`, `p.id`, `info.email`, `info.plan` — must be wrapped in `escapeHTML()`. The existing `escapeHTML` utility in `main.js` handles this. Raw strings from fetch responses are never safe to inject directly.

**Lesson**: XSS in the plans renderer was caught in review. `_renderPlans()` was extracted as a dedicated helper that enforces this discipline in one place.

### Stripe webhook raw body requirement
Express's `express.json()` middleware consumes and parses `req.body`, destroying the raw buffer that Stripe needs for signature verification. The webhook route (`POST /api/webhook`) uses `express.raw({ type: 'application/json' })` and must be registered BEFORE `app.use(express.json())` in `server/index.js`.

**Lesson**: If the webhook route is registered after `express.json()`, Stripe's `constructEvent()` throws "No signatures found matching the expected signature for payload" — even with a correct `STRIPE_WEBHOOK_SECRET`.

### Idempotent webhook processing
Stripe may deliver the same webhook event more than once (retries on network error or non-2xx response). The `checkout.session.completed` handler calls `db.getLicenseBySession(session.id)` before creating a new license. If a license with that Stripe session ID already exists, it logs and returns 200 without creating a duplicate.

### `datetime('now')` — single quotes required in SQLite
SQLite identifiers use double quotes; string literals use single quotes. `datetime("now")` throws `SqliteError: no such column: now` because SQLite interprets `"now"` as a column reference. All SQLite date expressions must use `datetime('now')`, `date('now')`, etc.

### localStorage keys for license state
- `puzzleSuiteLicense` — the raw license key string (trimmed, uppercased)
- `puzzleSuiteLicenseCache` — JSON `{ key, data, ts }` — 24-hour validation cache
These are separate from the main `puzzleSuiteV60` state key so they survive state resets.

---

## Open Areas / Potential Future Work

- **Matching mode: clue edits via the word list when notes page is not active** — the in-place patch keeps the matching preview correct. But if a user edits many clues and then clicks Generate, the shuffle re-randomises. Expected behaviour; could add a "re-shuffle" button separate from "generate" for fine control.
- **>26 words in matching mode** — `getLetter(i)` produces AA, AB… for indices ≥ 26. This works, but the matching table gets unwieldy. No current limit enforced.
- **Crossword 1500 ms timeout per seed attempt** — with 5 attempts, worst case is 7.5 s on the UI thread (worker prevents UI freeze, but generation appears slow). Consider a progress indicator.
- **Storage quota** — watermark image src is base64-encoded in localStorage. With a large watermark and many words, `QuotaExceededError` is caught and toasted but not resolved. A future improvement could compress or externally host the watermark.
- **PDF matching key column overflow** — with very long terms (>12 chars), `${i+1}. ${n.term}` could overflow a 3-column layout at the current font size. No truncation is applied; the PDF renderer does not split text in the key quadrant.
