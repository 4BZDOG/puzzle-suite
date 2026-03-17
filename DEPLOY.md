# Deployment Guide — Puzzle Suite

Puzzle Suite has two deployable pieces:

| Piece | What it is | Hosting |
|-------|-----------|---------|
| **Frontend** (puzzle app) | Static HTML/CSS/JS — no server needed | GitHub Pages (free) |
| **Payment server** | Node.js + Express + SQLite | Any Node.js host (Fly.io, Render, Railway, VPS) |

The frontend works fully without the payment server — all users get the Free tier. The server is only required to accept payments, issue license keys, and validate Pro/School/Lifetime licenses.

---

## Part 1 — Frontend on GitHub Pages (free, static hosting)

### What Has Already Been Done for You

| File | Purpose |
|------|---------|
| `package.json` | Declares esbuild as a build dependency |
| `package-lock.json` | Locks dependency versions for reproducible CI builds |
| `.gitignore` | Excludes `node_modules/`, `.DS_Store`, editor files, server secrets |
| `.nojekyll` | Tells GitHub Pages to serve files as-is (no Jekyll processing) |
| `index.html` | Redirect from `https://your-site/` → `puzzle-suite.html` for a clean URL |
| `.github/workflows/deploy.yml` | GitHub Actions workflow: rebuilds `bundle.js` and deploys on every push to `main` |

### Step 1 — Create a GitHub Repository

1. Go to **https://github.com/new**
2. Fill in:
   - **Repository name**: `puzzle-suite` (or anything you like)
   - **Visibility**: Public *(required for free GitHub Pages)*
   - Leave "Add README" unchecked — you already have these files
3. Click **Create repository**

### Step 2 — Push to GitHub

```bash
cd /path/to/puzzle-suite

git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/puzzle-suite.git
git push -u origin main
```

### Step 3 — Enable GitHub Pages

1. On your repo page: **Settings → Pages**
2. Under **"Build and deployment"**, set **Source** to **GitHub Actions**
3. Click **Save**

### Step 4 — Wait (~2 minutes)

1. Click the **Actions** tab — watch for the green ✓ on "Build & Deploy"
2. Go back to **Settings → Pages** — your live URL is shown there:
   ```
   https://YOUR-USERNAME.github.io/puzzle-suite/
   ```

### Updating after changes

Every push to `main` rebuilds and redeploys automatically (~90 seconds). You do **not** need to run `bash build.sh` before pushing — GitHub Actions handles that.

```bash
git add .
git commit -m "Describe changes"
git push
```

### Optional — Custom Domain

```
Type    Name    Value
A       @       185.199.108.153
A       @       185.199.109.153
A       @       185.199.110.153
A       @       185.199.111.153
CNAME   www     YOUR-USERNAME.github.io
```

Add DNS records above, then in **GitHub → Settings → Pages → Custom domain** enter your domain and enable HTTPS.

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Red ✗ in Actions | Build failed | Click the run → expand the failing step to read the error |
| 404 on site | Pages not enabled / still deploying | Wait for Actions green ✓; check Settings → Pages |
| Old version loads | Browser cache | Hard-refresh: Cmd+Shift+R (Mac) / Ctrl+Shift+R (Windows) |
| `npm ci` fails in CI | `package-lock.json` not committed | `git add package-lock.json && git commit && git push` |
| Puzzles don't generate | Worker path wrong at new URL | Check browser console; web worker uses a relative path and should resolve correctly |

---

## Part 2 — Payment Server

The payment server lives in `server/` and must be deployed separately to a Node.js host. It is stateful (SQLite database) so static/serverless hosts won't work.

### Prerequisites

- Stripe account — get API keys at https://dashboard.stripe.com/apikeys
- SMTP credentials for license key delivery emails (Gmail App Password works)
- A Node.js host that can expose a public HTTPS URL for Stripe webhooks

### Environment variables

Copy `server/.env.example` to `server/.env` and fill in every value. See comments in the file for where to find each value.

Required variables:
```
STRIPE_SECRET_KEY          From Stripe Dashboard → Developers → API keys
STRIPE_WEBHOOK_SECRET      From Stripe Dashboard → Webhooks (after adding endpoint)
STRIPE_PRICE_PRO_MONTHLY   From Stripe Dashboard → Products (create the products first)
STRIPE_PRICE_PRO_ANNUAL
STRIPE_PRICE_SCHOOL_MONTHLY
STRIPE_PRICE_LIFETIME
ADMIN_SECRET               Any long random string (min 32 chars)
ALLOWED_ORIGINS            Comma-separated list of your frontend URLs
SUCCESS_URL                Where Stripe redirects after successful payment
CANCEL_URL                 Where Stripe redirects on cancellation
SMTP_HOST / SMTP_USER / SMTP_PASS / EMAIL_FROM
```

### Create Stripe products

Before deploying, create the four products in your Stripe dashboard:

1. Go to **Stripe Dashboard → Products → Add product**
2. Create:
   - **Pro Monthly** — Recurring, $5/month
   - **Pro Annual** — Recurring, $45/year
   - **School Monthly** — Recurring, $49/month
   - **Lifetime Pro** — One-time, $99
3. Copy each **Price ID** (`price_...`) into your `.env`

### Deployment options

**Fly.io** (recommended — free tier, persistent disk for SQLite):
```bash
cd server
fly launch           # follow prompts, choose a region
fly secrets set STRIPE_SECRET_KEY=sk_live_... ADMIN_SECRET=... # etc.
fly deploy
```

**Render** (free tier available, but note: free tier spins down after inactivity):
1. Create a new Web Service pointing to `server/`
2. Build command: `npm install`
3. Start command: `npm start`
4. Add all env vars in the Render dashboard

**Railway**:
```bash
cd server
railway up
railway variables set STRIPE_SECRET_KEY=sk_live_... # etc.
```

**Self-hosted VPS** (DigitalOcean, Linode, etc.):
```bash
# On the server:
git clone ... && cd puzzle-suite/server
cp .env.example .env && nano .env   # fill in values
npm install
npm install -g pm2
pm2 start index.js --name puzzle-server
pm2 save
# Set up nginx reverse proxy + Let's Encrypt SSL
```

### Configure Stripe webhook

Once your server is running at a public HTTPS URL:

1. Go to **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://your-server.com/api/webhook`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copy the **Signing secret** (`whsec_...`) → add to `.env` as `STRIPE_WEBHOOK_SECRET`
5. Redeploy / restart the server

### Connect frontend to server

Set the server URL in your deployed frontend. The easiest way is to add a `<script>` tag before `bundle.js` in `puzzle-suite.html`:

```html
<script>window.PUZZLE_SUITE_SERVER_URL = 'https://your-server.com';</script>
<script src="bundle.js?v=N"></script>
```

Or set it via a build-time env var if using a bundler that supports it.

### Admin dashboard

After deploying, the admin panel is at `https://your-server.com/admin`. Log in with your `ADMIN_SECRET`.

From the dashboard you can:
- View stats (total licenses, active, new today/this month, breakdown by plan)
- Search licenses by email or key
- Create licenses manually (e.g. for trial users or comps)
- Deactivate / reactivate keys
- Change a license plan
- Resend the license email

### Local development with Stripe

```bash
# Install the Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3001/api/webhook
# Stripe prints a webhook secret — add it to server/.env as STRIPE_WEBHOOK_SECRET
```

Then use Stripe test card `4242 4242 4242 4242` with any future expiry.

---

## How the Frontend Workflow Works (Reference)

```
Push to main
    │
    ▼
.github/workflows/deploy.yml
    │
    ├─ Checkout code
    ├─ Install Node 20
    ├─ npm ci  (installs esbuild)
    ├─ bash build.sh  (esbuild → bundle.js)
    ├─ Upload artifact
    │
    └─ Deploy → GitHub Pages CDN
            │
            ▼
    https://YOUR-USERNAME.github.io/puzzle-suite/
```

Total deploy time from push to live: **~90 seconds**.
