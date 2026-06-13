/**
 * routes/license.js
 *
 * GET /api/license/validate?key=PSP-XXXXX-XXXXX-XXXXX-XXXXX
 *   Validates a license key and returns tier info.
 *   Called by the frontend on load and when a key is entered.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { getTier } = require('../tiers');

/**
 * GET /api/license/validate
 * Query: key=PSP-XXXXX-XXXXX-XXXXX-XXXXX
 * Returns: { valid, plan, limits, features, email, expiresAt, usage }
 */
router.get('/validate', (req, res) => {
  const { key } = req.query;

  if (!key || typeof key !== 'string') {
    return res.status(400).json({ valid: false, reason: 'No key provided' });
  }

  const sanitized = key.trim().toUpperCase();
  const result = db.validateKey(sanitized);

  if (!result.valid) {
    return res.json({ valid: false, reason: result.reason });
  }

  db.markActivated(sanitized);

  const lic = result.license;
  const tier = getTier(lic.plan);
  const { pages } = db.getMonthlyPages(sanitized);
  const limit = tier.limits.pdfPagesPerMonth;

  res.json({
    valid: true,
    plan: lic.plan,
    billingInterval: lic.billing_interval,
    email: lic.email,
    expiresAt: lic.expires_at || null,
    activatedAt: lic.activated_at || null,
    limits: tier.limits,
    features: tier.features,
    usage: {
      month: db.currentMonth(),
      pagesUsed: pages,
      pageLimit: limit ?? null,
      remaining: (limit == null) ? null : Math.max(0, limit - pages),
    },
  });
});

module.exports = router;
