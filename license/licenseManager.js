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
const CACHE_TTL_MS  = 24 * 60 * 60 * 1000;     // 24 hours

// ─── Tier definitions ─────────────────────────────────────────────────────────

export const TIERS = {
  free: {
    label: 'Free',
    limits: { words: 30, bulkSets: 3 },
  },
  pro: {
    label: 'Pro',
    limits: { words: 50, bulkSets: 25 },
  },
  school: {
    label: 'School',
    limits: { words: 50, bulkSets: 25 },
  },
  lifetime: {
    label: 'Lifetime Pro',
    limits: { words: 50, bulkSets: 25 },
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
    // Check cache first (unless forcing refresh)
    if (!forceRefresh) {
      const cached = this._loadCache(key);
      if (cached) {
        this._applyValidation(cached);
        return cached;
      }
    }

    // Hit server
    try {
      const url = `${SERVER_URL}/api/license/validate?key=${encodeURIComponent(key)}`;
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const data = await r.json();
      if (data.valid) {
        this._saveCache(key, data);
      } else {
        this._clearCache();
      }
      this._applyValidation(data);
      return data;
    } catch (_err) {
      // Server unreachable — honour cached result if any, else stay free
      const cached = this._loadCache(key);
      if (cached) {
        this._applyValidation(cached);
        return cached;
      }
      // Stay on free tier silently
      return { valid: false, reason: 'Server unreachable' };
    }
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
   * limitName: 'words' | 'bulkSets'
   */
  getLimit(limitName) {
    return (TIERS[this._tier] || TIERS.free).limits[limitName]
        ?? (TIERS.free.limits[limitName]);
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
