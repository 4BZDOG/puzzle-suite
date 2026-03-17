/**
 * index.js — Puzzle Suite payment & license server
 *
 * Endpoints:
 *   POST /api/checkout/session       Create Stripe Checkout session
 *   GET  /api/checkout/plans         List available plans
 *   POST /api/webhook                Stripe webhook receiver
 *   GET  /api/license/validate       Validate a license key
 *   *    /api/admin/*                Admin management (requires ADMIN_SECRET)
 *   GET  /admin                      Admin dashboard HTML
 *   GET  /health                     Health check
 *
 * Setup:
 *   cp .env.example .env && edit .env
 *   npm install
 *   npm start          (production)
 *   npm run dev        (development with auto-reload)
 *
 * Stripe webhook setup (local dev):
 *   stripe listen --forward-to localhost:3001/api/webhook
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const Stripe = require('stripe');

// ── Validate required env ─────────────────────────────────────────────────────
const REQUIRED_ENV = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ADMIN_SECRET'];
const missing = REQUIRED_ENV.filter(k => !process.env[k] || process.env[k].includes('REPLACE'));
if (missing.length) {
  console.warn(`[startup] Warning: missing or unconfigured env vars: ${missing.join(', ')}`);
  console.warn('[startup] Copy server/.env.example to server/.env and fill in values.');
}

// ── Stripe ────────────────────────────────────────────────────────────────────
const stripe = process.env.STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY.includes('REPLACE')
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

// ── Express app ───────────────────────────────────────────────────────────────
const app = express();

// Attach stripe instance to every request
app.use((req, _res, next) => {
  req.stripe = stripe;
  next();
});

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:8082')
  .split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin(origin, cb) {
    // Allow requests with no origin (Stripe webhooks, curl, Postman)
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Webhook route MUST come before json() middleware ──────────────────────────
// Stripe needs the raw body to verify webhook signatures.
const webhookRouter = require('./routes/webhook');
app.use('/api/webhook', (req, res, next) => {
  req.stripe = stripe;
  next();
}, webhookRouter);

// ── JSON middleware (all other routes) ───────────────────────────────────────
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/license',  require('./routes/license'));
app.use('/api/admin',    require('./routes/admin'));

// Admin dashboard HTML
app.get('/admin', (_req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('[error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3001', 10);
app.listen(PORT, () => {
  console.log(`\nPuzzle Suite server running on http://localhost:${PORT}`);
  console.log(`  Admin dashboard:  http://localhost:${PORT}/admin`);
  console.log(`  Health check:     http://localhost:${PORT}/health`);
  console.log(`  Stripe mode:      ${stripe ? 'configured' : 'NOT configured (set STRIPE_SECRET_KEY)'}`);
  if (!process.env.ADMIN_SECRET || process.env.ADMIN_SECRET.includes('REPLACE')) {
    console.warn('  ADMIN_SECRET:     NOT set — admin endpoints are disabled');
  }
  console.log('');
});
