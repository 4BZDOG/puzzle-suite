// =============================================================
// test/rateLimit.test.mjs — sliding-window rate limiter middleware
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

// rateLimit.js is CommonJS (server code); load it via createRequire.
const require = createRequire(import.meta.url);
const { createRateLimiter } = require('../server/rateLimit.js');

// Minimal Express-style req/res/next mocks.
function makeReqRes(ip) {
    const req = { ip };
    const res = {
        statusCode: 200,
        body: null,
        status(code) { this.statusCode = code; return this; },
        json(obj) { this.body = obj; return this; },
    };
    let nextCalled = false;
    const next = () => { nextCalled = true; };
    return { req, res, next, wasNextCalled: () => nextCalled };
}

test('allows requests up to the limit, then blocks with 429', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 3, message: 'slow down' });

    for (let i = 0; i < 3; i++) {
        const { req, res, next, wasNextCalled } = makeReqRes('10.0.0.1');
        limiter(req, res, next);
        assert.equal(wasNextCalled(), true, `request ${i + 1} should pass`);
        assert.equal(res.statusCode, 200);
    }

    // 4th request exceeds max.
    const { req, res, next, wasNextCalled } = makeReqRes('10.0.0.1');
    limiter(req, res, next);
    assert.equal(wasNextCalled(), false, '4th request should be blocked');
    assert.equal(res.statusCode, 429);
    assert.deepEqual(res.body, { error: 'slow down' });
});

test('tracks each IP independently', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 });

    const a = makeReqRes('1.1.1.1');
    limiter(a.req, a.res, a.next);
    assert.equal(a.wasNextCalled(), true);

    // Different IP gets its own fresh budget.
    const b = makeReqRes('2.2.2.2');
    limiter(b.req, b.res, b.next);
    assert.equal(b.wasNextCalled(), true);

    // First IP's second request is blocked.
    const a2 = makeReqRes('1.1.1.1');
    limiter(a2.req, a2.res, a2.next);
    assert.equal(a2.wasNextCalled(), false);
    assert.equal(a2.res.statusCode, 429);
});

test('resets the budget after the window elapses', async () => {
    const limiter = createRateLimiter({ windowMs: 20, max: 1 });

    const first = makeReqRes('3.3.3.3');
    limiter(first.req, first.res, first.next);
    assert.equal(first.wasNextCalled(), true);

    const second = makeReqRes('3.3.3.3');
    limiter(second.req, second.res, second.next);
    assert.equal(second.wasNextCalled(), false, 'blocked within the window');

    // Wait for the window to roll over.
    await new Promise(r => setTimeout(r, 35));

    const third = makeReqRes('3.3.3.3');
    limiter(third.req, third.res, third.next);
    assert.equal(third.wasNextCalled(), true, 'allowed after window reset');
});

test('falls back to a placeholder key when no IP is present', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 1 });
    const { req, res, next, wasNextCalled } = makeReqRes(undefined);
    limiter(req, res, next);
    assert.equal(wasNextCalled(), true);
});
