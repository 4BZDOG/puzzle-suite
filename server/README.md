# Puzzle Suite — Payment Server

Node.js + Express + SQLite server that handles Stripe payments, license key issuance and validation, and an admin dashboard.

The frontend works fully without this server — all users get the Free tier. The server is only required to accept payments, issue license keys, and validate Pro/School/Lifetime licenses.

---

## Quick Start (local development)

```bash
cd server
cp .env.example .env     # fill in values (see Environment Variables below)
npm install
npm run dev              # auto-reload on changes (nodemon)
# or:
npm start                # production start
```

Server runs at `http://localhost:3001` by default.

```
Admin dashboard:  http://localhost:3001/admin
Health check:     http://localhost:3001/health
```

### Local Stripe webhooks

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/webhook
# Stripe prints a webhook secret — add it to .env as STRIPE_WEBHOOK_SECRET
```

Use test card `4242 4242 4242 4242` with any future expiry date and any CVC.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in all values.

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | HTTP port (default: `3001`) |
| `STRIPE_SECRET_KEY` | Yes | `sk_live_...` or `sk_test_...` from Stripe Dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | Yes | `whsec_...` from Stripe Dashboard → Webhooks (or from `stripe listen` output) |
| `STRIPE_PRICE_PRO_MONTHLY` | Yes | `price_...` — create in Stripe Dashboard → Products |
| `STRIPE_PRICE_PRO_ANNUAL` | Yes | `price_...` |
| `STRIPE_PRICE_SCHOOL_MONTHLY` | Yes | `price_...` |
| `STRIPE_PRICE_LIFETIME` | Yes | `price_...` (one-time payment) |
| `ADMIN_SECRET` | Yes | Long random string (min 32 chars). Protects all `/api/admin/*` endpoints. |
| `ALLOWED_ORIGINS` | Yes | Comma-separated frontend URLs, e.g. `https://yourname.github.io,http://localhost:8082` |
| `SUCCESS_URL` | No | Stripe redirect after successful payment (default: `http://localhost:8082/puzzle-suite.html?checkout=success`) |
| `CANCEL_URL` | No | Stripe redirect on cancelled payment (default: `http://localhost:8082/puzzle-suite.html?checkout=cancel`) |
| `SMTP_HOST` | Yes* | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | No | SMTP port (default: `587`) |
| `SMTP_USER` | Yes* | SMTP username / email address |
| `SMTP_PASS` | Yes* | SMTP password or App Password |
| `EMAIL_FROM` | Yes* | Sender address shown in license emails |

*Required for license email delivery. Server starts without them but emails will fail.

---

## API Reference

### Public endpoints

#### `GET /health`
Health check.

```json
{ "ok": true, "ts": "2026-03-17T12:00:00.000Z" }
```

---

#### `GET /api/checkout/plans`
Returns available plans for display in the UI.

```json
{
  "plans": [
    {
      "id": "pro_monthly",
      "label": "Pro Monthly",
      "price": "$5/month",
      "description": "All Pro features, billed monthly",
      "features": ["50 words per set", "25 bulk export sets", "Priority support"],
      "popular": false
    },
    {
      "id": "pro_annual",
      "label": "Pro Annual",
      "price": "$45/year",
      "priceNote": "($3.75/month, save 25%)",
      "popular": true
    },
    { "id": "school_monthly", ... },
    { "id": "lifetime", ... }
  ]
}
```

---

#### `POST /api/checkout/session`
Creates a Stripe Checkout session and returns its redirect URL.

**Request body:**
```json
{
  "plan": "pro_monthly",   // "pro_monthly" | "pro_annual" | "school_monthly" | "lifetime"
  "email": "user@example.com"   // optional — pre-fills Stripe checkout email
}
```

**Response:**
```json
{ "url": "https://checkout.stripe.com/...", "sessionId": "cs_..." }
```

**Errors:**
- `400` — Invalid plan key
- `503` — Stripe price not configured (missing env var)
- `500` — Stripe API error

After payment completes, Stripe redirects to `SUCCESS_URL` and delivers a `checkout.session.completed` webhook. The server creates the license and sends the key by email.

---

#### `POST /api/webhook`
Stripe webhook endpoint. Verifies signature using `STRIPE_WEBHOOK_SECRET`.

**Handled events:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create license, send key email (idempotent — skips if session already processed) |
| `customer.subscription.deleted` | Set license `expires_at` to subscription period end, log event |
| `invoice.payment_failed` | Log event (license remains active during grace period) |
| `invoice.payment_succeeded` | Reactivate license if it was deactivated, log event |

**Important**: This route uses `express.raw()` and must be registered before `express.json()` middleware. Do not change the route registration order in `index.js`.

---

#### `GET /api/license/validate`
Validates a license key. Called by the frontend on page load and when a user enters a key.

**Query parameter:** `key=PSP-XXXXX-XXXXX-XXXXX-XXXXX`

**Success response:**
```json
{
  "valid": true,
  "plan": "pro",
  "billingInterval": "monthly",
  "email": "user@example.com",
  "expiresAt": null,
  "activatedAt": "2026-03-17T12:00:00Z",
  "limits": { "words": 50, "bulkSets": 25 }
}
```

**Failure response:**
```json
{ "valid": false, "reason": "Key not found" }
```

Possible `reason` values: `"No key provided"`, `"Key not found"`, `"Key deactivated"`, `"Key expired"`.

The frontend caches a valid response in localStorage for 24 hours to avoid hitting this endpoint on every page load.

---

### Admin endpoints

All admin endpoints require:
```
Authorization: Bearer <ADMIN_SECRET>
```

Returns `401` if the token is wrong, `503` if `ADMIN_SECRET` is not configured.

---

#### `GET /api/admin/stats`
Summary statistics.

```json
{
  "total": 142,
  "active": 128,
  "byPlan": [
    { "plan": "pro", "count": 89 },
    { "plan": "school", "count": 24 },
    { "plan": "lifetime", "count": 29 }
  ],
  "newToday": 3,
  "newThisMonth": 47
}
```

---

#### `GET /api/admin/licenses`
Paginated list of licenses with optional search.

**Query parameters:**
- `search` — filter by email or key (partial match, optional)
- `limit` — max results, 1–200 (default: `50`)
- `offset` — pagination offset (default: `0`)

**Response:**
```json
{
  "licenses": [
    {
      "key": "PSP-ABCDE-FGHIJ-KLMNO-PQRST",
      "email": "teacher@school.edu",
      "plan": "pro",
      "billing_interval": "monthly",
      "active": 1,
      "created_at": "2026-03-17T12:00:00Z",
      "activated_at": "2026-03-17T12:01:00Z",
      "expires_at": null
    }
  ],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

---

#### `POST /api/admin/licenses`
Create a license manually (e.g. for trial users or complimentary access).

**Request body:**
```json
{
  "email": "teacher@school.edu",
  "plan": "pro",
  "billingInterval": "monthly",   // optional; null for lifetime
  "expiresAt": null,              // optional ISO datetime string
  "sendEmail": true               // optional; default true
}
```

**Response:** `201`
```json
{ "key": "PSP-XXXXX-XXXXX-XXXXX-XXXXX", "email": "...", "plan": "pro", "billingInterval": "monthly" }
```

If `sendEmail` is true and email fails, returns `201` with a `warning` field instead of an error (key is still created).

---

#### `GET /api/admin/licenses/:key`
Get a single license plus its full event log.

```json
{
  "license": { "key": "PSP-...", "email": "...", "plan": "pro", ... },
  "events": [
    { "id": 1, "event": "created", "note": "Stripe session cs_...", "created_at": "..." },
    { "id": 2, "event": "email_sent", "note": null, "created_at": "..." }
  ]
}
```

---

#### `POST /api/admin/licenses/:key/deactivate`
Deactivate a key (blocks future validation).

**Request body:** `{ "note": "optional reason" }` (optional)

**Response:** `{ "ok": true }`

---

#### `POST /api/admin/licenses/:key/reactivate`
Reactivate a previously deactivated key.

**Request body:** `{ "note": "optional reason" }` (optional)

**Response:** `{ "ok": true }`

---

#### `POST /api/admin/licenses/:key/resend-email`
Resend the license key email to the address on file.

**Response:** `{ "ok": true }` or `500` with `{ "error": "Email failed: ..." }`

---

#### `PUT /api/admin/licenses/:key/plan`
Change the plan on an existing license.

**Request body:**
```json
{ "plan": "lifetime", "billingInterval": null }
```

**Response:** `{ "ok": true }`

---

#### `DELETE /api/admin/licenses/:key`
Permanently delete a license and all its events. This is irreversible.

**Response:** `{ "ok": true }`

---

## Admin Dashboard

The self-contained admin SPA is served at `/admin`. Log in with your `ADMIN_SECRET`.

Features:
- Stats overview (total, active, new today/this month, breakdown by plan)
- Paginated license table with search by email or key
- License detail modal with full event log
- Create license form (manual issuance)
- Deactivate / reactivate
- Change plan
- Resend license email

The dashboard stores your token in `localStorage` so you stay logged in between page loads. Click **Logout** to clear it.

---

## Database

SQLite database at `server/data/licenses.db` (created automatically on first start).

### `licenses` table

| Column | Type | Description |
|--------|------|-------------|
| `key` | TEXT PK | `PSP-XXXXX-XXXXX-XXXXX-XXXXX` |
| `email` | TEXT | Customer email |
| `plan` | TEXT | `pro` / `school` / `lifetime` |
| `billing_interval` | TEXT | `monthly` / `annual` / `null` |
| `active` | INTEGER | `1` = active, `0` = deactivated |
| `stripe_session_id` | TEXT | Stripe Checkout session ID (for idempotency) |
| `stripe_subscription_id` | TEXT | Stripe subscription ID (for subscription events) |
| `created_at` | TEXT | ISO datetime |
| `activated_at` | TEXT | ISO datetime (set on first validation) |
| `expires_at` | TEXT | ISO datetime or null |

### `events` table

Audit log for all license state changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Auto-increment |
| `license_key` | TEXT | References `licenses.key` |
| `event` | TEXT | `created` / `activated` / `deactivated` / `reactivated` / `plan_changed` / `email_sent` / `subscription_cancelled` / `payment_failed` / `payment_succeeded` |
| `note` | TEXT | Optional context (e.g. Stripe session ID, admin note) |
| `created_at` | TEXT | ISO datetime |

---

## Project Structure

```
server/
  index.js            Express app entry point
  db.js               SQLite database + all DB helpers
  email.js            Nodemailer license delivery emails
  admin.html          Self-contained admin dashboard SPA
  .env.example        Configuration template
  package.json        Dependencies

  routes/
    checkout.js       POST /api/checkout/session, GET /api/checkout/plans
    webhook.js        POST /api/webhook (Stripe events)
    license.js        GET /api/license/validate
    admin.js          Admin CRUD API (/api/admin/*)

  data/               Created at runtime (git-ignored)
    licenses.db       SQLite database
```

---

## License Key Format

Keys are generated in the format `PSP-XXXXX-XXXXX-XXXXX-XXXXX` using a 32-character unambiguous alphabet (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789` — no `0`, `O`, `I`, `1` to avoid confusion). This gives ~160 bits of entropy per key.

Keys are always stored and validated in uppercase. The frontend normalises input via `.trim().toUpperCase()` before sending.
