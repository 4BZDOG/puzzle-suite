/**
 * routes/admin.js
 *
 * Admin API — protected by Authorization: Bearer <ADMIN_SECRET>
 *
 * GET    /api/admin/licenses                   List/search licenses
 * POST   /api/admin/licenses                   Create license manually
 * GET    /api/admin/licenses/:key              Get single license + events
 * POST   /api/admin/licenses/:key/deactivate   Deactivate key
 * POST   /api/admin/licenses/:key/reactivate   Reactivate key
 * POST   /api/admin/licenses/:key/resend-email Resend license email
 * PUT    /api/admin/licenses/:key/plan         Update plan/interval
 * DELETE /api/admin/licenses/:key              Delete license permanently
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendLicenseEmail, sendKeyReminder } = require('../email');

// ── Auth middleware ────────────────────────────────────────────────────────────
function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || secret === 'REPLACE_WITH_LONG_RANDOM_STRING') {
    return res.status(503).json({ error: 'ADMIN_SECRET not configured' });
  }
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (token !== secret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

router.use(requireAdmin);

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/admin/licenses?search=&limit=50&offset=0
 */
router.get('/licenses', (req, res) => {
  const { search = '', limit = '50', offset = '0' } = req.query;
  const result = db.listLicenses({
    search,
    limit: Math.min(parseInt(limit, 10) || 50, 200),
    offset: parseInt(offset, 10) || 0,
  });
  res.json(result);
});

/**
 * POST /api/admin/licenses
 * Body: { email, plan, billingInterval?, expiresAt?, sendEmail? }
 */
router.post('/licenses', async (req, res) => {
  const { email, plan, billingInterval = null, expiresAt = null, sendEmail = true } = req.body;

  if (!email || !plan) {
    return res.status(400).json({ error: 'email and plan are required' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  const validPlans = ['pro', 'school', 'lifetime'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ error: `Invalid plan. Use: ${validPlans.join(', ')}` });
  }
  if (expiresAt && !(new Date(expiresAt) instanceof Date && !isNaN(new Date(expiresAt)))) {
    return res.status(400).json({ error: 'Invalid expiresAt date format' });
  }

  const key = db.createLicense({ email, plan, billingInterval, expiresAt });

  if (sendEmail) {
    try {
      await sendLicenseEmail({ to: email, key, plan, billingInterval });
    } catch (e) {
      console.error('[admin] Failed to send license email:', e.message);
      return res.status(201).json({ key, warning: `Key created but email failed: ${e.message}` });
    }
  }

  res.status(201).json({ key, email, plan, billingInterval });
});

/**
 * GET /api/admin/licenses/:key
 */
router.get('/licenses/:key', (req, res) => {
  const lic = db.getLicense(req.params.key);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  const events = db.getEvents(req.params.key);
  res.json({ license: lic, events });
});

/**
 * POST /api/admin/licenses/:key/deactivate
 * Body: { note? }
 */
router.post('/licenses/:key/deactivate', (req, res) => {
  const lic = db.getLicense(req.params.key);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  db.deactivateKey(req.params.key, req.body.note || 'Admin deactivated');
  res.json({ ok: true });
});

/**
 * POST /api/admin/licenses/:key/reactivate
 * Body: { note? }
 */
router.post('/licenses/:key/reactivate', (req, res) => {
  const lic = db.getLicense(req.params.key);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  db.reactivateKey(req.params.key, req.body.note || 'Admin reactivated');
  res.json({ ok: true });
});

/**
 * POST /api/admin/licenses/:key/resend-email
 */
router.post('/licenses/:key/resend-email', async (req, res) => {
  const lic = db.getLicense(req.params.key);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  try {
    await sendKeyReminder({ to: lic.email, key: lic.key, plan: lic.plan });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: `Email failed: ${e.message}` });
  }
});

/**
 * PUT /api/admin/licenses/:key/plan
 * Body: { plan, billingInterval? }
 */
router.put('/licenses/:key/plan', (req, res) => {
  const lic = db.getLicense(req.params.key);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  const { plan, billingInterval = null } = req.body;
  const validPlans = ['pro', 'school', 'lifetime'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ error: `Invalid plan. Use: ${validPlans.join(', ')}` });
  }
  db.updateLicensePlan(req.params.key, plan, billingInterval);
  res.json({ ok: true });
});

/**
 * DELETE /api/admin/licenses/:key
 */
router.delete('/licenses/:key', (req, res) => {
  const lic = db.getLicense(req.params.key);
  if (!lic) return res.status(404).json({ error: 'License not found' });
  db.db.transaction(() => {
    db.db.prepare('DELETE FROM licenses WHERE key = ?').run(req.params.key);
    db.db.prepare('DELETE FROM events WHERE license_key = ?').run(req.params.key);
  })();
  res.json({ ok: true });
});

/**
 * GET /api/admin/stats
 * Quick summary statistics.
 */
router.get('/stats', (req, res) => {
  const { total } = db.db.prepare('SELECT COUNT(*) as total FROM licenses').get();
  const { active } = db.db.prepare('SELECT COUNT(*) as active FROM licenses WHERE active = 1').get();
  const byPlan = db.db.prepare(
    'SELECT plan, COUNT(*) as count FROM licenses GROUP BY plan'
  ).all();
  const today = db.db.prepare(
    "SELECT COUNT(*) as count FROM licenses WHERE created_at >= date('now')"
  ).get();
  const thisMonth = db.db.prepare(
    "SELECT COUNT(*) as count FROM licenses WHERE created_at >= date('now', 'start of month')"
  ).get();
  res.json({ total, active, byPlan, newToday: today.count, newThisMonth: thisMonth.count });
});

module.exports = router;
