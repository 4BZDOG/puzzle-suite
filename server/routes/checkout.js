/**
 * routes/checkout.js
 *
 * POST /api/checkout/session
 *   Creates a Stripe Checkout session and returns its URL.
 *   The frontend redirects the user there to complete payment.
 */

const express = require('express');
const router = express.Router();

// Stripe is initialized in index.js and attached to req.stripe via middleware
const PLAN_PRICE_IDS = () => ({
  pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:      process.env.STRIPE_PRICE_PRO_ANNUAL,
  school_monthly:  process.env.STRIPE_PRICE_SCHOOL_MONTHLY,
  lifetime:        process.env.STRIPE_PRICE_LIFETIME,
});

const PLAN_MODES = {
  pro_monthly:    'subscription',
  pro_annual:     'subscription',
  school_monthly: 'subscription',
  lifetime:       'payment',
};

// Map plan key → { plan, billingInterval } stored in DB
const PLAN_META = {
  pro_monthly:    { plan: 'pro',      billingInterval: 'monthly' },
  pro_annual:     { plan: 'pro',      billingInterval: 'annual'  },
  school_monthly: { plan: 'school',   billingInterval: 'monthly' },
  lifetime:       { plan: 'lifetime', billingInterval: null      },
};

/**
 * POST /api/checkout/session
 * Body: { plan: 'pro_monthly' | 'pro_annual' | 'school_monthly' | 'lifetime', email?: string }
 * Returns: { url: string }
 */
router.post('/session', async (req, res) => {
  try {
    const { plan, email } = req.body;

    if (!plan || !PLAN_PRICE_IDS()[plan]) {
      return res.status(400).json({ error: `Invalid plan "${plan}". Valid plans: ${Object.keys(PLAN_META).join(', ')}` });
    }

    const priceId = PLAN_PRICE_IDS()[plan];
    if (!priceId || priceId.startsWith('price_REPLACE')) {
      return res.status(503).json({ error: 'Stripe price not configured. Set STRIPE_PRICE_* env vars.' });
    }

    const stripe = req.stripe;
    const mode = PLAN_MODES[plan];
    const meta = PLAN_META[plan];

    const sessionParams = {
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: process.env.SUCCESS_URL || 'http://localhost:8082/puzzle-suite.html?checkout=success',
      cancel_url:  process.env.CANCEL_URL  || 'http://localhost:8082/puzzle-suite.html?checkout=cancel',
      metadata: {
        plan:             meta.plan,
        billing_interval: meta.billingInterval || '',
      },
      // Enable automatic tax if configured in Stripe dashboard
      // automatic_tax: { enabled: true },
    };

    // Pre-fill email if provided
    if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      sessionParams.customer_email = email.toLowerCase().trim();
    }

    // Subscriptions: allow promotion codes
    if (mode === 'subscription') {
      sessionParams.allow_promotion_codes = true;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('[checkout] Error creating session:', err.message);
    res.status(500).json({ error: 'Failed to create checkout session', detail: err.message });
  }
});

/**
 * GET /api/checkout/plans
 * Returns the available plans and their prices (for displaying in UI without hardcoding).
 */
router.get('/plans', (_req, res) => {
  res.json({
    plans: [
      {
        id: 'pro_monthly',
        label: 'Pro Monthly',
        price: '$5/month',
        description: 'All Pro features, billed monthly',
        features: ['50 words per set', '25 bulk export sets', 'Priority support'],
        popular: false,
      },
      {
        id: 'pro_annual',
        label: 'Pro Annual',
        price: '$45/year',
        priceNote: '($3.75/month, save 25%)',
        description: 'All Pro features, billed annually',
        features: ['50 words per set', '25 bulk export sets', 'Priority support', '2 months free vs monthly'],
        popular: true,
      },
      {
        id: 'school_monthly',
        label: 'School',
        price: '$49/month',
        description: 'Unlimited teachers, pooled AI credits, admin dashboard',
        features: ['Everything in Pro', '2,500 AI credits/month', 'Admin dashboard', 'Custom branding', 'LMS export helpers'],
        popular: false,
      },
      {
        id: 'lifetime',
        label: 'Lifetime Pro',
        price: '$99 once',
        description: 'Pay once, own it forever',
        features: ['All Pro features forever', 'Free future updates', 'No recurring charges'],
        popular: false,
      },
    ],
  });
});

module.exports = router;
