/**
 * licenseManager.js — Frontend license management
 *
 * Handles:
 *  - Storing/retrieving license key from localStorage
 *  - Validating key against the server (with 24-hour cache)
 *  - Exposing tier limits for feature gating
 *  - Launching the Stripe Checkout flow
 *
 * Usage (in main.js):
 *   import { licenseManager } from './license/licenseManager.js';
 *   await licenseManager.init();
 *   licenseManager.getLimit('words')  // → 30 or 50
 */

// ─── Configuration ────────────────────────────────────────────────────────────

/**
 * URL of the Puzzle Suite server.
 * Override via window.PUZZLE_SUITE_SERVER_URL before loading, or set via build env.
 * Falls back to same origin so it works when app and server are co-located.
 */
const SERVER_URL = (typeof window !== 'undefined' && window.PUZZLE_SUITE_SERVER_URL)
  ? window.PUZZLE_SUITE_SERVER_URL.replace(/\/$/, '')
  : 'http://localhost:3001';

const LS_KEY        = 'puzzleSuiteLicense';    // stored license key
const LS_CACHE_KEY  = 'puzzleSuiteLicenseCache'; // cached validation result
const LS_CLIENT_ID  = 'puzzleSuiteClientId';   // anonymous metering id (free tier)
const CACHE_TTL_MS  = 24 * 60 * 60 * 1000;     // 24 hours

/**
 * TEMPORARY offline admin unlock.
 *
 * Until the licensing server is deployed, the live (static) site has no backend
 * to validate keys, so everyone falls back to Free. This lets the owner unlock
 * the full Admin tier entirely client-side: paste the secret into the app's
 * "I have a key" box and it's recognised locally — no server required.
 *
 * Only the SHA-256 *hash* of the secret lives in this (public) bundle. SHA-256
 * is preimage-resistant, so the long random secret cannot be recovered from it;
 * reading the source reveals nothing usable. Remove this once the server is live
 * (the real DEV_LICENSE_KEY then provides full access server-side instead).
 */
const OFFLINE_ADMIN_HASH = '0e73359c26c51235ba11711a1dedf63722238932c8e36069ea03fdc9edc17e7a';

// ─── Tier definitions ─────────────────────────────────────────────────────────
// Offline fallback mirror of server/tiers.js. The server response (info.limits /
// info.features) always wins when reachable — keep these in sync but treat the
// server as the source of truth for tuning.

export const TIERS = {
  free: {
    label: 'Free',
    limits: { words: 30, bulkSets: 3, pdfPagesPerMonth: 30 },
    features: { separateCluePages: false, premiumFonts: false, removeWatermark: false },
  },
  pro: {
    label: 'Pro',
    limits: { words: 50, bulkSets: 25, pdfPagesPerMonth: 1000 },
    features: { separateCluePages: true, premiumFonts: true, removeWatermark: true },
  },
  school: {
    label: 'School',
    limits: { words: 50, bulkSets: 25, pdfPagesPerMonth: 10000 },
    features: { separateCluePages: true, premiumFonts: true, removeWatermark: true },
  },
  lifetime: {
    label: 'Lifetime Pro',
    limits: { words: 50, bulkSets: 25, pdfPagesPerMonth: 2000 },
    features: { separateCluePages: true, premiumFonts: true, removeWatermark: true },
  },
  admin: {
    label: 'Admin',
    limits: { words: 200, bulkSets: 100, pdfPagesPerMonth: null },
    features: { separateCluePages: true, premiumFonts: true, removeWatermark: true },
  },
};

// ─── Manager ──────────────────────────────────────────────────────────────────

class LicenseManager {
  constructor() {
    this._tier    = 'free';
    this._info    = null;   // full validation response from server
    this._ready   = false;
    this._listeners = [];
  }

  // ── Initialization ──────────────────────────────────────────────────────────

  /**
   * Call once at app startup. Checks stored key against server (or cache).
   * Resolves even if server is unreachable — falls back to free tier.
   */
  async init() {
    const key = this.getStoredKey();
    if (key) {
      await this._validate(key, false);
    }
    this._ready = true;
    this._notify();
  }

  // ── Key management ──────────────────────────────────────────────────────────

  getStoredKey() {
    return localStorage.getItem(LS_KEY) || null;
  }

  _storeKey(key) {
    if (key) localStorage.setItem(LS_KEY, key.trim().toUpperCase());
    else localStorage.removeItem(LS_KEY);
  }

  /**
   * Attempt to activate a key entered by the user.
   * Returns { ok: true, tier } or { ok: false, reason }.
   */
  async activateKey(rawKey) {
    const key = (rawKey || '').trim().toUpperCase();
    if (!key) return { ok: false, reason: 'Please enter a license key' };

    const result = await this._validate(key, true); // force fresh check
    if (result.valid) {
      this._storeKey(key);
      return { ok: true, tier: this._tier, plan: result.plan };
    }
    return { ok: false, reason: result.reason || 'Invalid key' };
  }

  /**
   * Remove stored key and revert to free tier.
   */
  deactivate() {
    this._storeKey(null);
    this._clearCache();
    this._tier = 'free';
    this._info = null;
    this._notify();
  }

  // ── Validation (internal) ───────────────────────────────────────────────────

  async _validate(key, forceRefresh = false) {
    // Offline admin unlock — works with no server (temporary; see OFFLINE_ADMIN_HASH).
    const offline = await this._offlineGrant(key);
    if (offline) {
      this._saveCache(key, offline);
      this._applyValidation(offline);
      return offline;
    }

    // Check cache first (unless forcing refresh)
    const cachedBeforeFetch = forceRefresh ? null : this._loadCache(key);
    if (cachedBeforeFetch) {
      this._applyValidation(cachedBeforeFetch);
      return cachedBeforeFetch;
    }

    // Hit server
    try {
      const url = `${SERVER_URL}/api/license/validate?key=${encodeURIComponent(key)}`;
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 8000);
      let r;
      try { r = await fetch(url, { signal: ac.signal }); } finally { clearTimeout(tid); }
      const data = await r.json();
      if (data.valid) {
        this._saveCache(key, data);
      } else {
        this._clearCache();
      }
      this._applyValidation(data);
      return data;
    } catch (_err) {
      // Server unreachable — honour cache from before the fetch attempt, else stay free
      if (cachedBeforeFetch) {
        this._applyValidation(cachedBeforeFetch);
        return cachedBeforeFetch;
      }
      return { valid: false, reason: 'Server unreachable' };
    }
  }

  /**
   * If `key` matches the offline admin secret, return a synthetic admin-tier
   * validation result (no server). Otherwise null. Temporary — see header.
   */
  async _offlineGrant(key) {
    if (!key) return null;
    let hash;
    try { hash = await this._sha256Hex(key.trim().toUpperCase()); }
    catch { return null; } // crypto.subtle unavailable (e.g. insecure context)
    if (hash !== OFFLINE_ADMIN_HASH) return null;
    return {
      valid: true,
      plan: 'admin',
      email: 'offline-admin',
      limits: TIERS.admin.limits,
      features: TIERS.admin.features,
      usage: { month: '', pagesUsed: 0, pageLimit: null, remaining: null },
      offline: true,
    };
  }

  async _sha256Hex(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  _applyValidation(data) {
    if (data.valid) {
      this._tier = data.plan || 'free';
      this._info = data;
    } else {
      this._tier = 'free';
      this._info = null;
    }
    this._notify();
  }

  // ── Cache ────────────────────────────────────────────────────────────────────

  _saveCache(key, data) {
    localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ key, data, ts: Date.now() }));
  }

  _loadCache(key) {
    try {
      const raw = localStorage.getItem(LS_CACHE_KEY);
      if (!raw) return null;
      const { key: k, data, ts } = JSON.parse(raw);
      if (k !== key) return null;
      if (Date.now() - ts > CACHE_TTL_MS) return null;
      return data;
    } catch { return null; }
  }

  _clearCache() {
    localStorage.removeItem(LS_CACHE_KEY);
  }

  // ── Accessors ────────────────────────────────────────────────────────────────

  get tier()    { return this._tier; }
  get isPro()   { return this._tier !== 'free'; }
  get info()    { return this._info; }

  /**
   * Get a numeric limit for the current tier.
   * Prefers the server-supplied limits (info.limits) so quotas can be tuned
   * server-side without a frontend release; falls back to the local mirror.
   * limitName: 'words' | 'bulkSets' | 'pdfPagesPerMonth'
   */
  getLimit(limitName) {
    const serverLimits = this._info?.limits;
    if (serverLimits && limitName in serverLimits) return serverLimits[limitName];
    return (TIERS[this._tier] || TIERS.free).limits[limitName]
        ?? (TIERS.free.limits[limitName]);
  }

  /**
   * Whether the current tier has a named feature flag enabled.
   * Prefers server-supplied flags (info.features), falls back to local mirror.
   * featureName: 'separateCluePages' | 'premiumFonts' | 'removeWatermark'
   */
  hasFeature(featureName) {
    const serverFeatures = this._info?.features;
    if (serverFeatures && featureName in serverFeatures) return !!serverFeatures[featureName];
    return !!(TIERS[this._tier] || TIERS.free).features?.[featureName];
  }

  // ── Usage metering (PDF pages) ─────────────────────────────────────────────

  /**
   * Stable anonymous client id for metering free-tier usage.
   * Generated once and persisted in localStorage.
   */
  getClientId() {
    let id = localStorage.getItem(LS_CLIENT_ID);
    if (!id) {
      id = (crypto?.randomUUID?.() || `c${Date.now()}${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(LS_CLIENT_ID, id);
    }
    return id;
  }

  _usageQuery() {
    const params = new URLSearchParams();
    const key = this.getStoredKey();
    if (key) params.set('key', key);
    params.set('clientId', this.getClientId());
    return params.toString();
  }

  /**
   * Fetch current-month PDF page usage + quota from the server.
   * Returns { tier, month, pagesUsed, pageLimit, remaining } or null if
   * the server is unreachable (caller should treat null as "unknown / allow").
   */
  async getUsage() {
    try {
      const ac = new AbortController();
      const tid = setTimeout(() => ac.abort(), 6000);
      let r;
      try { r = await fetch(`${SERVER_URL}/api/usage?${this._usageQuery()}`, { signal: ac.signal }); }
      finally { clearTimeout(tid); }
      if (!r.ok) return null;
      return await r.json();
    } catch { return null; }
  }

  /**
   * Record a completed PDF export. Fire-and-forget; resolves to the updated
   * usage payload or null on failure (never throws).
   */
  async recordPdfUsage({ pages, sets = 1, pageTypes = '' }) {
    try {
      const r = await fetch(`${SERVER_URL}/api/usage/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: this.getStoredKey() || undefined,
          clientId: this.getClientId(),
          pages, sets, pageTypes,
        }),
      });
      if (!r.ok) return null;
      const data = await r.json();
      // Keep the cached info.usage fresh so the modal reflects the new total
      if (this._info) this._info.usage = { month: data.month, pagesUsed: data.pagesUsed, pageLimit: data.pageLimit, remaining: data.remaining };
      return data;
    } catch { return null; }
  }

  /**
   * Check whether an export of `pages` pages is within the monthly quota.
   * Returns { allowed, usage, remaining } — when the server is unreachable
   * or the tier is unlimited, allowed is true (non-blocking by design).
   */
  async canExport(pages) {
    const usage = await this.getUsage();
    if (!usage || usage.pageLimit == null) return { allowed: true, usage };
    const allowed = usage.pagesUsed + pages <= usage.pageLimit;
    return { allowed, usage, remaining: usage.remaining };
  }

  // ── Checkout ─────────────────────────────────────────────────────────────────

  /**
   * Redirect user to Stripe Checkout for the given plan.
   * planId: 'pro_monthly' | 'pro_annual' | 'school_monthly' | 'lifetime'
   * email (optional): pre-fill checkout email field
   */
  async startCheckout(planId, email = '') {
    try {
      const r = await fetch(`${SERVER_URL}/api/checkout/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId, email }),
      });
      const data = await r.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || 'No checkout URL returned');
      }
    } catch (err) {
      throw new Error(`Checkout failed: ${err.message}`);
    }
  }

  /**
   * Fetch plan information from server (prices, features).
   */
  async getPlans() {
    try {
      const r = await fetch(`${SERVER_URL}/api/checkout/plans`);
      const data = await r.json();
      return data.plans || [];
    } catch { return []; }
  }

  // ── Change listeners ─────────────────────────────────────────────────────────

  onChange(fn) {
    this._listeners.push(fn);
    if (this._ready) fn(this._tier, this._info);
  }

  _notify() {
    this._listeners.forEach(fn => fn(this._tier, this._info));
  }
}

export const licenseManager = new LicenseManager();
