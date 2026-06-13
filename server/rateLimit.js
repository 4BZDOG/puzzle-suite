/**
 * rateLimit.js — Simple in-memory sliding-window rate limiter
 *
 * No external dependencies. Tracks request counts per IP in a Map
 * with automatic cleanup of expired entries.
 */

function createRateLimiter({ windowMs = 60000, max = 30, message = 'Too many requests' } = {}) {
  const hits = new Map();

  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.start > windowMs) hits.delete(key);
    }
  }, windowMs);
  // Don't let the cleanup timer keep the process (or test runner) alive.
  if (cleanupTimer.unref) cleanupTimer.unref();

  return (req, res, next) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const now = Date.now();
    let entry = hits.get(ip);

    if (!entry || now - entry.start > windowMs) {
      entry = { count: 0, start: now };
      hits.set(ip, entry);
    }

    entry.count++;

    if (entry.count > max) {
      return res.status(429).json({ error: message });
    }

    next();
  };
}

module.exports = { createRateLimiter };
