/**
 * The API surface, as an attacker meets it.
 *
 * This surface is published as attackable, so "fixed endpoint surface, no
 * arbitrary SQL, safe errors, bounded everything" has to be asserted rather
 * than intended.
 */
// MUST be first: it pins the rate limits before the config module reads them.
// See the file's own comment for why an assignment in this file would not work.
import '../helpers/env-tight-rate-limits.js';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auth, provisionViaApi, resetRateLimits, startApi, stopApi } from '../helpers/harness.js';

describe('API surface and security posture', () => {
  let app;
  let tenant;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    tenant = await provisionViaApi(app, 'surface');
  });

  after(async () => {
    await stopApi(app);
  });

  it('the endpoint surface is fixed — unknown routes 404 with no detail', async () => {
    for (const url of ['/v1/query', '/v1/sql', '/admin', '/v1/tenants/all', '/../../etc/passwd']) {
      const response = await app.inject({ method: 'GET', url });
      assert.equal(response.statusCode, 404, `${url} must not exist`);
      assert.equal(response.json().error.code, 'route.not_found');
    }
  });

  it('there is no endpoint that accepts SQL', async () => {
    for (const url of ['/v1/query', '/v1/sql', '/v1/exec']) {
      const response = await app.inject({
        method: 'POST',
        url,
        headers: auth(tenant.apiKey),
        payload: { sql: 'SELECT * FROM tenant' },
      });
      assert.equal(response.statusCode, 404);
    }
  });

  it('rejects unknown body fields rather than ignoring them', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/records',
      headers: auth(tenant.apiKey),
      payload: { title: 'ok', tenant_id: '00000000-0000-0000-0000-000000000000', kind: 'seeded' },
    });
    // A strict schema. Silently dropping tenant_id would be safe today and a
    // latent injection point the moment someone adds a spread.
    assert.equal(response.statusCode, 400);
    assert.equal(response.json().error.code, 'request.invalid');
  });

  it('bounds the request body', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/records',
      headers: auth(tenant.apiKey),
      payload: { title: 'x', body: { blob: 'A'.repeat(64 * 1024) } },
    });
    assert.ok(
      response.statusCode === 413 || response.statusCode === 400,
      `expected a size rejection, got ${response.statusCode}`,
    );
  });

  it('error bodies leak no internals', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/records/not-a-uuid',
      headers: auth(tenant.apiKey),
    });
    assert.equal(response.statusCode, 400);
    const raw = response.body;
    for (const leak of ['select', 'postgres', 'pg_', 'stack', 'at Object', 'demo_app']) {
      assert.ok(!raw.toLowerCase().includes(leak), `error body must not contain "${leak}"`);
    }
    assert.ok(response.json().error.correlationId, 'errors must carry a correlation id');
  });

  it('the admin endpoint is invisible without its token', async () => {
    const response = await app.inject({ method: 'POST', url: '/internal/purge/run' });
    // 404, not 401: an admin endpoint should not confirm it exists.
    assert.equal(response.statusCode, 404);
    assert.equal(response.json().error.code, 'route.not_found');
  });

  it('the admin endpoint works with its token, and is not the lifecycle proof', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/internal/purge/run',
      headers: { 'x-admin-token': process.env.ADMIN_TOKEN },
    });
    assert.equal(response.statusCode, 200);
    assert.match(response.json().note, /scheduled worker/);
  });

  it('provisioning is rate limited per hour', async () => {
    await resetRateLimits();
    const codes = [];
    for (let i = 0; i < 6; i += 1) {
      const response = await app.inject({ method: 'POST', url: '/v1/tenants', payload: {} });
      codes.push(response.statusCode);
    }
    assert.ok(codes.includes(429), `expected the limiter to engage, got ${codes.join(',')}`);
    const limited = codes.filter((c) => c === 429).length;
    assert.ok(limited >= 2, 'the limiter must keep refusing once engaged');
  });

  it('a rejected provision explains that Cloudflare has its own limiter in front (A13)', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/tenants', payload: {} });
    assert.equal(response.statusCode, 429);
    assert.match(response.json().error.message, /Cloudflare/);
  });

  it('rejects an oversized or malformed label', async () => {
    await resetRateLimits();
    for (const label of ['x'.repeat(200), '<script>alert(1)</script>', '']) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/tenants',
        payload: { label },
      });
      assert.equal(response.statusCode, 400, `label ${JSON.stringify(label.slice(0, 20))}`);
    }
  });

  it('the provisioning response labels the demo as a demo (rule 11)', async () => {
    await resetRateLimits();
    const response = await app.inject({ method: 'POST', url: '/v1/tenants', payload: {} });
    assert.equal(response.statusCode, 201);
    const disclosure = response.json().disclosure;
    assert.equal(disclosure.plane, 'demo');
    assert.match(disclosure.statement, /demo plane/i);
    assert.match(disclosure.statement, /separate from any production system/i);
  });
});
