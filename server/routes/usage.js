/**
 * routes/usage.js
 *
 * PDF page metering — the basis for monetising PDF generation by page.
 *
 * GET  /api/usage?key=&clientId=     Current month's page usage + quota.
 * POST /api/usage/pdf                Record a PDF export, returns updated usage.
 *
 * Identity resolution:
 *   - A valid license key  → identity = the key,  tier = the plan.
 *   - Otherwise            → identity = 'anon:<clientId>', tier = 'free'.
 *
 * Quotas come from tiers.js (limits.pdfPagesPerMonth; null = unlimited).
 * Enforcement on the frontend is non-blocking when the server is unreachable —
 * this endpoint is the source of truth when it is reachable.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { getTier } = require('../tiers');

// Sanity cap: a single export cannot plausibly exceed this many pages.
const MAX_PAGES_PER_EXPORT = 100000;

/** Clean an anonymous client id to a safe, bounded token. */
function cleanClientId(raw) {
  return String(raw || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64);
}

/**
 * Resolve { identity, licenseKey, tier } from a key + clientId pair.
 * Validates the key against the DB; falls back to anonymous free.
 */
function resolveIdentity({ key, clientId }) {
  if (key && typeof key === 'string') {
    const sanitized = key.trim().toUpperCase();
    const result = db.validateKey(sanitized);
    if (result.valid) {
      return { identity: sanitized, licenseKey: sanitized, tier: result.license.plan };
    }
  }
  const cid = cleanClientId(clientId);
  return { identity: cid ? `anon:${cid}` : null, licenseKey: null, tier: 'free' };
}

/** Build the usage/quota payload for an identity at a given tier. */
function usagePayload(identity, tier) {
  const limit = getTier(tier).limits.pdfPagesPerMonth;
  const { pages, exports } = identity
    ? db.getMonthlyPages(identity)
    : { pages: 0, exports: 0 };
  const remaining = (limit == null) ? null : Math.max(0, limit - pages);
  return {
    tier,
    month: db.currentMonth(),
    pagesUsed: pages,
    exports,
    pageLimit: limit ?? null,
    remaining,
  };
}

/**
 * GET /api/usage?key=&clientId=
 * Returns the caller's current-month page usage and quota.
 */
router.get('/', (req, res) => {
  const { key, clientId } = req.query;
  const { identity, tier } = resolveIdentity({ key, clientId });
  if (!identity) {
    return res.status(400).json({ error: 'clientId or key required' });
  }
  res.json(usagePayload(identity, tier));
});

/**
 * POST /api/usage/pdf
 * Body: { key?, clientId, pages, sets?, pageTypes? }
 * Records the export and returns the updated usage payload.
 */
router.post('/pdf', (req, res) => {
  const { key, clientId, pages, sets = 1, pageTypes = '' } = req.body || {};

  const nPages = parseInt(pages, 10);
  if (!Number.isFinite(nPages) || nPages <= 0 || nPages > MAX_PAGES_PER_EXPORT) {
    return res.status(400).json({ error: 'Invalid page count' });
  }
  const nSets = Math.max(1, parseInt(sets, 10) || 1);
  const types = String(pageTypes || '').slice(0, 200);

  const { identity, licenseKey, tier } = resolveIdentity({ key, clientId });
  if (!identity) {
    return res.status(400).json({ error: 'clientId or key required' });
  }

  db.recordPdfUsage({ identity, licenseKey, tier, pages: nPages, sets: nSets, pageTypes: types });

  const payload = usagePayload(identity, tier);
  // overQuota reflects state AFTER recording (used for soft warnings)
  payload.overQuota = payload.pageLimit != null && payload.pagesUsed > payload.pageLimit;
  res.json(payload);
});

module.exports = router;
