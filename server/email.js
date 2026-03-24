/**
 * email.js — Nodemailer helper
 *
 * Sends license key delivery and management emails.
 * Configure via SMTP_* env vars (see .env.example).
 */

const nodemailer = require('nodemailer');

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

const PLAN_LABELS = {
  pro: 'Pro',
  school: 'School',
  lifetime: 'Lifetime Pro',
};

const PLAN_LIMITS = {
  pro:      { words: 50, bulkSets: 25 },
  school:   { words: 50, bulkSets: 25 },
  lifetime: { words: 50, bulkSets: 25 },
};

/** Returns a safe, validated app URL for use in email href attributes. */
function _safeAppUrl() {
  const raw = (process.env.SUCCESS_URL || '').replace('?checkout=success', '').trim();
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error();
    return u.href;
  } catch (_) {
    return 'https://puzzle-suite.app';
  }
}

/**
 * Send the license key delivery email after a successful purchase.
 */
async function sendLicenseEmail({ to, key, plan, billingInterval }) {
  const planLabel = PLAN_LABELS[plan] || plan;
  const limits = PLAN_LIMITS[plan] || {};
  const intervalNote = billingInterval === 'annual'
    ? 'Your subscription renews annually.'
    : billingInterval === 'monthly'
    ? 'Your subscription renews monthly. Manage it any time via Stripe.'
    : 'This is a one-time purchase with no recurring charges.';

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #f8f9fa; margin: 0; padding: 32px; color: #1a1a2e; }
    .card { background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto;
            padding: 40px; box-shadow: 0 2px 12px rgba(0,0,0,.08); }
    h1 { margin: 0 0 8px; font-size: 24px; color: #4f46e5; }
    .subtitle { color: #6b7280; margin: 0 0 32px; font-size: 15px; }
    .key-box { background: #f3f4f6; border: 2px dashed #d1d5db; border-radius: 8px;
               padding: 20px; text-align: center; margin: 24px 0; }
    .key { font-family: 'Courier New', monospace; font-size: 22px; font-weight: 700;
           letter-spacing: 2px; color: #1a1a2e; }
    .steps { background: #eef2ff; border-radius: 8px; padding: 20px; margin: 24px 0; }
    .steps h3 { margin: 0 0 12px; font-size: 15px; color: #4f46e5; }
    .steps ol { margin: 0; padding-left: 20px; }
    .steps li { margin-bottom: 8px; font-size: 14px; color: #374151; }
    .badge { display: inline-block; background: #4f46e5; color: #fff;
             border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: 600; }
    .footer { margin-top: 32px; font-size: 13px; color: #9ca3af; border-top: 1px solid #e5e7eb;
              padding-top: 20px; }
    a { color: #4f46e5; }
  </style>
</head>
<body>
<div class="card">
  <h1>Your Puzzle Suite License</h1>
  <p class="subtitle">Thank you for your purchase! Here is your license key.</p>

  <span class="badge">${planLabel}</span>

  <div class="key-box">
    <div class="key">${key}</div>
    <div style="margin-top:8px;font-size:13px;color:#6b7280;">Keep this safe — it activates your account</div>
  </div>

  <div class="steps">
    <h3>How to activate</h3>
    <ol>
      <li>Open <a href="${_safeAppUrl()}">Puzzle Suite</a></li>
      <li>Click the <strong>Pro</strong> badge in the top-right corner</li>
      <li>Paste your license key and click <strong>Activate</strong></li>
    </ol>
  </div>

  ${limits.words ? `
  <p style="font-size:14px;color:#374151;">
    Your <strong>${planLabel}</strong> plan unlocks:
    <ul style="font-size:14px;color:#374151;">
      <li>Up to <strong>${limits.words} words</strong> per puzzle set</li>
      <li>Up to <strong>${limits.bulkSets} bulk export sets</strong></li>
      <li>Managed AI (coming soon) — no API key needed</li>
      <li>Cloud save (coming soon)</li>
    </ul>
  </p>` : ''}

  <p style="font-size:13px;color:#6b7280;">${intervalNote}</p>

  <div class="footer">
    Questions? Reply to this email or visit our support page.<br>
    ${key}
  </div>
</div>
</body>
</html>`;

  const text = `
Puzzle Suite ${planLabel} — Your License Key
============================================

${key}

To activate:
1. Open Puzzle Suite
2. Click the Pro badge in the top-right corner
3. Paste your key and click Activate

${intervalNote}

Keep this email for your records.
`.trim();

  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'Puzzle Suite <noreply@example.com>',
    to,
    subject: `Your Puzzle Suite ${planLabel} License Key`,
    text,
    html,
  });
}

/**
 * Send a key reminder (re-send at admin request).
 */
async function sendKeyReminder({ to, key, plan }) {
  const planLabel = PLAN_LABELS[plan] || plan;
  return getTransporter().sendMail({
    from: process.env.EMAIL_FROM || 'Puzzle Suite <noreply@example.com>',
    to,
    subject: `[Reminder] Your Puzzle Suite ${planLabel} License Key`,
    text: `Here is your Puzzle Suite license key:\n\n${key}\n\nEnter it via the Pro badge in the top-right corner of the app.`,
    html: `<p>Here is your Puzzle Suite <strong>${planLabel}</strong> license key:</p>
           <p style="font-family:monospace;font-size:20px;font-weight:bold;letter-spacing:2px">${key}</p>
           <p>Enter it via the <strong>Pro</strong> badge in the top-right corner of the app.</p>`,
  });
}

module.exports = { sendLicenseEmail, sendKeyReminder };
