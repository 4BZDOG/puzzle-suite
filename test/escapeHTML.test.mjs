// =============================================================
// test/escapeHTML.test.mjs — HTML output-encoding (XSS defense)
// =============================================================
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { escapeHTML } from '../core/escapeHTML.js';

test('escapes all five HTML-significant characters', () => {
    assert.equal(escapeHTML('&'), '&amp;');
    assert.equal(escapeHTML('<'), '&lt;');
    assert.equal(escapeHTML('>'), '&gt;');
    assert.equal(escapeHTML("'"), '&#39;');
    assert.equal(escapeHTML('"'), '&quot;');
});

test('neutralizes a script-injection payload', () => {
    const payload = `<script>alert('xss')</script>`;
    const escaped = escapeHTML(payload);
    assert.ok(!escaped.includes('<script>'), 'must not contain a live tag');
    assert.equal(
        escaped,
        '&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;',
    );
});

test('neutralizes an attribute-breakout payload', () => {
    const payload = `" onmouseover="alert(1)`;
    const escaped = escapeHTML(payload);
    assert.ok(!escaped.includes('"'), 'raw double-quote must be escaped');
    assert.equal(escaped, '&quot; onmouseover=&quot;alert(1)');
});

test('escapes ampersand first so entities are not double-broken', () => {
    // A naive ordered replace that did < before & could mangle this; verify
    // the existing entity text is encoded so it renders literally.
    assert.equal(escapeHTML('a & b < c'), 'a &amp; b &lt; c');
});

test('leaves safe text untouched', () => {
    assert.equal(escapeHTML('APPLE'), 'APPLE');
    assert.equal(escapeHTML('a tasty fruit (5)'), 'a tasty fruit (5)');
});

test('coerces null/undefined/non-strings instead of throwing', () => {
    assert.equal(escapeHTML(null), '');
    assert.equal(escapeHTML(undefined), '');
    assert.equal(escapeHTML(42), '42');
    assert.doesNotThrow(() => escapeHTML(null));
});
