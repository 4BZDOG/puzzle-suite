/**
 * db.js — SQLite database setup and helpers
 *
 * Schema:
 *   licenses   — one row per purchased/manually-created license key
 *   events     — audit log of key lifecycle events
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'licenses.db');

// Ensure data directory exists
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ── Schema ────────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS licenses (
    key             TEXT PRIMARY KEY,          -- e.g. PSP-XXXX-XXXX-XXXX-XXXX
    email           TEXT NOT NULL,
    plan            TEXT NOT NULL,             -- 'pro' | 'school' | 'lifetime'
    billing_interval TEXT,                     -- 'monthly' | 'annual' | null (lifetime)
    stripe_session_id    TEXT,
    stripe_customer_id   TEXT,
    stripe_subscription_id TEXT,
    active          INTEGER NOT NULL DEFAULT 1, -- 1 = active, 0 = deactivated
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    activated_at    TEXT,                       -- when user first entered key in app
    expires_at      TEXT                        -- null = never expires (lifetime / active sub)
  );

  CREATE INDEX IF NOT EXISTS idx_licenses_email ON licenses(email);
  CREATE INDEX IF NOT EXISTS idx_licenses_stripe_session ON licenses(stripe_session_id);
  CREATE INDEX IF NOT EXISTS idx_licenses_stripe_sub ON licenses(stripe_subscription_id);

  CREATE TABLE IF NOT EXISTS events (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    license_key TEXT NOT NULL,
    event_type  TEXT NOT NULL,   -- 'created' | 'activated' | 'deactivated' | 'reactivated' | 'expired' | 'plan_changed'
    note        TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_events_key ON events(license_key);
`);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a human-readable license key.
 * Format: PSP-XXXXX-XXXXX-XXXXX-XXXXX
 * Uses a 32-character unambiguous alphabet (no 0, O, I, 1).
 */
function generateKey() {
  const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const GROUP_LEN = 5;
  const GROUPS = 4;
  let key = 'PSP';
  for (let g = 0; g < GROUPS; g++) {
    key += '-';
    for (let c = 0; c < GROUP_LEN; c++) {
      key += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    }
  }
  return key;
}

/**
 * Create a new license in the database.
 * Returns the generated key.
 */
function createLicense({ email, plan, billingInterval = null, stripeSessionId = null,
                          stripeCustomerId = null, stripeSubscriptionId = null,
                          expiresAt = null }) {
  let key;
  // Retry in the astronomically unlikely event of a collision
  for (let i = 0; i < 5; i++) {
    key = generateKey();
    try {
      db.prepare(`
        INSERT INTO licenses (key, email, plan, billing_interval,
          stripe_session_id, stripe_customer_id, stripe_subscription_id, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(key, email.toLowerCase().trim(), plan, billingInterval,
             stripeSessionId, stripeCustomerId, stripeSubscriptionId, expiresAt);
      logEvent(key, 'created', `plan=${plan}`);
      return key;
    } catch (e) {
      if (e.code === 'SQLITE_CONSTRAINT_PRIMARYKEY') continue; // collision, retry
      throw e;
    }
  }
  throw new Error('Failed to generate unique license key after 5 attempts');
}

/**
 * Look up a license by key. Returns the row or undefined.
 */
function getLicense(key) {
  return db.prepare('SELECT * FROM licenses WHERE key = ?').get(key);
}

/**
 * Look up licenses by email. Returns all rows for that email.
 */
function getLicensesByEmail(email) {
  return db.prepare('SELECT * FROM licenses WHERE email = ? ORDER BY created_at DESC')
           .all(email.toLowerCase().trim());
}

/**
 * Validate a license key for use in the app.
 * Returns { valid, license } or { valid: false, reason }.
 */
function validateKey(key) {
  const lic = getLicense(key);
  if (!lic) return { valid: false, reason: 'Key not found' };
  if (!lic.active) return { valid: false, reason: 'Key has been deactivated' };
  if (lic.expires_at && new Date(lic.expires_at) < new Date()) {
    return { valid: false, reason: 'Key has expired' };
  }
  // Mark activated_at on first use
  if (!lic.activated_at) {
    db.prepare("UPDATE licenses SET activated_at = datetime('now') WHERE key = ?").run(key);
    logEvent(key, 'activated');
  }
  return { valid: true, license: lic };
}

/**
 * Deactivate a license key.
 */
function deactivateKey(key, note = '') {
  db.prepare('UPDATE licenses SET active = 0 WHERE key = ?').run(key);
  logEvent(key, 'deactivated', note);
}

/**
 * Reactivate a license key.
 */
function reactivateKey(key, note = '') {
  db.prepare('UPDATE licenses SET active = 1 WHERE key = ?').run(key);
  logEvent(key, 'reactivated', note);
}

/**
 * Update plan/interval for a license (e.g. upgrade free to school).
 */
function updateLicensePlan(key, plan, billingInterval = null) {
  db.prepare('UPDATE licenses SET plan = ?, billing_interval = ? WHERE key = ?')
    .run(plan, billingInterval, key);
  logEvent(key, 'plan_changed', `plan=${plan}`);
}

/**
 * Find license by Stripe subscription ID.
 */
function getLicenseBySubscription(subscriptionId) {
  return db.prepare('SELECT * FROM licenses WHERE stripe_subscription_id = ?').get(subscriptionId);
}

/**
 * Find license by Stripe session ID.
 */
function getLicenseBySession(sessionId) {
  return db.prepare('SELECT * FROM licenses WHERE stripe_session_id = ?').get(sessionId);
}

/**
 * Set expires_at on a license (e.g. when subscription is cancelled).
 */
function setExpiry(key, expiresAt) {
  db.prepare('UPDATE licenses SET expires_at = ? WHERE key = ?').run(expiresAt, key);
  logEvent(key, 'expired', `expires_at=${expiresAt}`);
}

/**
 * Clear expires_at on a license (e.g. after successful payment renewal).
 */
function clearExpiry(key) {
  db.prepare('UPDATE licenses SET expires_at = NULL WHERE key = ?').run(key);
}

/**
 * Paginated list of all licenses, newest first.
 */
function listLicenses({ limit = 50, offset = 0, search = '' } = {}) {
  const q = `%${search}%`;
  const rows = db.prepare(`
    SELECT * FROM licenses
    WHERE email LIKE ? OR key LIKE ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `).all(q, q, limit, offset);
  const { total } = db.prepare(`
    SELECT COUNT(*) as total FROM licenses WHERE email LIKE ? OR key LIKE ?
  `).get(q, q);
  return { rows, total };
}

/**
 * Get event log for a specific key.
 */
function getEvents(key) {
  return db.prepare('SELECT * FROM events WHERE license_key = ? ORDER BY created_at DESC').all(key);
}

function logEvent(key, eventType, note = '') {
  db.prepare('INSERT INTO events (license_key, event_type, note) VALUES (?, ?, ?)')
    .run(key, eventType, note);
}

module.exports = {
  db,
  generateKey,
  createLicense,
  getLicense,
  getLicensesByEmail,
  validateKey,
  deactivateKey,
  reactivateKey,
  updateLicensePlan,
  getLicenseBySubscription,
  getLicenseBySession,
  setExpiry,
  clearExpiry,
  listLicenses,
  getEvents,
  logEvent,
};
