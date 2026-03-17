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

// Tier limits served to the frontend
const TIER_LIMITS = {
  free:     { words: 30, bulkSets: 3  },
  pro:      { words: 50, bulkSets: 25 },
  school:   { words: 50, bulkSets: 25 },
  lifetime: { words: 50, bulkSets: 25 },
};

/**
 * GET /api/license/validate
 * Query: key=PSP-XXXXX-XXXXX-XXXXX-XXXXX
 * Returns: { valid, plan, limits, email, expiresAt }
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

  const lic = result.license;
  res.json({
    valid: true,
    plan: lic.plan,
    billingInterval: lic.billing_interval,
    email: lic.email,
    expiresAt: lic.expires_at || null,
    activatedAt: lic.activated_at || null,
    limits: TIER_LIMITS[lic.plan] || TIER_LIMITS.free,
  });
});

module.exports = router;
