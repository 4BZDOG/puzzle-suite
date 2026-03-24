/**
 * routes/webhook.js
 *
 * POST /api/webhook
 *   Receives Stripe webhook events.
 *   IMPORTANT: Express must receive the raw body here — do NOT apply json() middleware
 *   to this route (handled in index.js by registering this route before json middleware).
 *
 * Events handled:
 *   checkout.session.completed   → generate & email license key
 *   customer.subscription.deleted → deactivate / set expiry
 *   invoice.payment_failed        → log (optional: send warning email)
 *   invoice.payment_succeeded     → re-activate if previously failed
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { VALID_PLANS } = db;
const { sendLicenseEmail } = require('../email');

/**
 * POST /api/webhook
 * Raw body required — Stripe uses it to verify the signature.
 */
router.post('/', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripe = req.stripe;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook signature error: ${err.message}` });
  }

  console.log(`[webhook] Received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(stripe, event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      default:
        // Unhandled event — acknowledge receipt to avoid retries
        break;
    }
  } catch (err) {
    console.error(`[webhook] Error handling ${event.type}:`, err);
    // Return 200 anyway so Stripe doesn't keep retrying — log for manual review
    return res.json({ received: true, warning: err.message });
  }

  res.json({ received: true });
});

// ── Handlers ──────────────────────────────────────────────────────────────────

async function handleCheckoutCompleted(stripe, session) {
  // Idempotency: check if we already processed this session
  const existing = db.getLicenseBySession(session.id);
  if (existing) {
    console.log(`[webhook] Already processed session ${session.id}, skipping`);
    return;
  }

  const email = session.customer_email || session.customer_details?.email;
  if (!email) {
    console.error('[webhook] No email on session', session.id);
    return;
  }

  const plan = session.metadata?.plan;
  if (!VALID_PLANS.includes(plan)) {
    console.error(`[webhook] Invalid or missing plan in session metadata: "${plan}" (session=${session.id})`);
    return;
  }
  const billingInterval = session.metadata?.billing_interval || null;

  // For subscriptions, get the subscription ID
  let subscriptionId = null;
  if (session.mode === 'subscription' && session.subscription) {
    subscriptionId = session.subscription;
  }

  const key = db.createLicense({
    email,
    plan,
    billingInterval: billingInterval || null,
    stripeSessionId: session.id,
    stripeCustomerId: session.customer || null,
    stripeSubscriptionId: subscriptionId,
    expiresAt: null, // null = active subscription, never set for lifetime
  });

  console.log(`[webhook] Created license ${key} for ${email} (plan=${plan})`);

  // Send license email
  try {
    await sendLicenseEmail({ to: email, key, plan, billingInterval });
    console.log(`[webhook] License email sent to ${email}`);
  } catch (emailErr) {
    // Log but don't fail — key is in DB, admin can resend
    console.error('[webhook] Failed to send license email:', emailErr.message);
  }
}

async function handleSubscriptionDeleted(subscription) {
  const lic = db.getLicenseBySubscription(subscription.id);
  if (!lic) {
    console.warn(`[webhook] No license found for subscription ${subscription.id}`);
    return;
  }

  // Grace period: set expiry to end of current period rather than deactivating immediately
  const ts = Number(subscription.current_period_end);
  const periodEnd = (Number.isFinite(ts) && ts > 0)
    ? new Date(ts * 1000).toISOString()
    : new Date().toISOString();

  db.setExpiry(lic.key, periodEnd);
  console.log(`[webhook] Subscription cancelled for ${lic.email}, expires ${periodEnd}`);
}

async function handlePaymentFailed(invoice) {
  // For now, just log. You could send a warning email here.
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;
  const lic = db.getLicenseBySubscription(subscriptionId);
  if (lic) {
    console.warn(`[webhook] Payment failed for ${lic.email} (${lic.key})`);
  }
}

async function handlePaymentSucceeded(invoice) {
  // Re-extend expiry for renewed subscriptions
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) return;
  const lic = db.getLicenseBySubscription(subscriptionId);
  if (lic && !lic.active) {
    db.reactivateKey(lic.key, 'payment_succeeded');
    console.log(`[webhook] Reactivated ${lic.key} after successful payment`);
  }
  // Clear any expiry that was set on a prior failed payment
  if (lic && lic.expires_at) {
    db.clearExpiry(lic.key);
  }
}

module.exports = router;
