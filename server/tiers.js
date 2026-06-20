/**
 * tiers.js — Single source of truth for tier limits, feature flags, and
 *            PDF page quotas.
 *
 * This is the central knob for monetisation tuning. Change a number here and
 * it propagates to:
 *   - the license validation response (routes/license.js)
 *   - the usage metering / quota checks (routes/usage.js)
 *   - the license delivery email (email.js)
 *   - the admin dashboard (admin.html, via /api/admin/usage)
 *
 * The frontend keeps a mirror of these values in license/licenseManager.js as
 * an offline fallback, but the server response always wins when reachable —
 * so you can re-price or re-gate without shipping new frontend code.
 *
 * Quota semantics:
 *   limits.pdfPagesPerMonth — integer, or null = unlimited.
 *   A "page" is one printed PDF page. A bulk export of 3 sets × 4 pages each
 *   counts as 12 pages. This is the unit we meter and monetise.
 */

const TIERS = {
  free: {
    label: 'Free',
    limits: {
      words: 30,
      bulkSets: 3,
      pdfPagesPerMonth: 30,
    },
    features: {
      separateCluePages: false,   // crossword clues on their own page
      premiumFonts: false,        // Lora / Comic Neue
      removeWatermark: false,
      prioritySupport: false,
    },
  },

  pro: {
    label: 'Pro',
    limits: {
      words: 50,
      bulkSets: 25,
      pdfPagesPerMonth: 1000,
    },
    features: {
      separateCluePages: true,
      premiumFonts: true,
      removeWatermark: true,
      prioritySupport: true,
    },
  },

  school: {
    label: 'School',
    limits: {
      words: 50,
      bulkSets: 25,
      pdfPagesPerMonth: 10000,
    },
    features: {
      separateCluePages: true,
      premiumFonts: true,
      removeWatermark: true,
      prioritySupport: true,
    },
  },

  lifetime: {
    label: 'Lifetime Pro',
    limits: {
      words: 50,
      bulkSets: 25,
      pdfPagesPerMonth: 2000,
    },
    features: {
      separateCluePages: true,
      premiumFonts: true,
      removeWatermark: true,
      prioritySupport: true,
    },
  },

  // All-access tier for the product owner / QA. Not sold via Stripe — only
  // reachable via a manually-created license or the DEV_LICENSE_KEY (see db.js).
  // Everything unlocked, no caps, unlimited PDF pages.
  admin: {
    label: 'Admin',
    limits: {
      words: 200,
      bulkSets: 100,
      pdfPagesPerMonth: null, // unlimited
    },
    features: {
      separateCluePages: true,
      premiumFonts: true,
      removeWatermark: true,
      prioritySupport: true,
    },
  },
};

// Plans that can be created manually via the admin API / dashboard.
// (Stripe-created plans are validated separately in webhook.js.)
const VALID_PLANS = ['pro', 'school', 'lifetime', 'admin'];

/** Resolve a tier definition, falling back to free for unknown plans. */
function getTier(plan) {
  return TIERS[plan] || TIERS.free;
}

/** Numeric limits for a plan (words, bulkSets, pdfPagesPerMonth). */
function getLimits(plan) {
  return getTier(plan).limits;
}

/** Feature flags for a plan. */
function getFeatures(plan) {
  return getTier(plan).features;
}

/** Human label for a plan. */
function getLabel(plan) {
  return getTier(plan).label;
}

module.exports = { TIERS, VALID_PLANS, getTier, getLimits, getFeatures, getLabel };
