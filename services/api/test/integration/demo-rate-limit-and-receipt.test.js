/**
 * Demonstration 5 — rate limiting — and the take-away (A14, §2.10).
 *
 * Pins the station's bucket low before the config module reads it. Must be the
 * first import: ESM evaluates imports before any statement in the body, so an
 * assignment here would run too late.
 */
import '../helpers/env-tight-station-limit.js';

import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  auth,
  expireTenant,
  provisionViaApi,
  resetRateLimits,
  startApi,
  stopApi,
} from '../helpers/harness.js';
import { runPurgeSweep } from '../../dist/worker/purge.js';

/*
 * ONE app for the whole file, at the top level.
 *
 * `stopApi` ends the shared pg pool, and the pool is a module-level singleton
 * that cannot be revived — so a second `describe` calling `startApi` again gets
 * a dead pool and every request 500s. One server per file is the convention the
 * rest of the suite already follows; this file has three suites and needed the
 * hooks lifted out of them.
 */
let app;

before(async () => {
  app = await startApi();
  await resetRateLimits();
});

after(async () => {
  await stopApi(app);
});

describe('demonstration — rate limiting', () => {
  let tenant;

  before(async () => {
    tenant = await provisionViaApi(app, 'limits');
  });

  it('accepts until the bucket empties, then sheds', async () => {
    const codes = [];
    for (let i = 0; i < 12; i += 1) {
      const response = await app.inject({
        method: 'POST',
        url: '/v1/demos/limits/hammer',
        headers: auth(tenant.apiKey),
      });
      codes.push(response.statusCode);
    }
    assert.ok(codes.includes(200), 'the first requests must be accepted');
    assert.ok(codes.includes(429), `the limiter must engage, got ${codes.join(',')}`);
    // Once shedding, it keeps shedding — a limiter that flaps is not a limiter.
    assert.equal(codes[codes.length - 1], 429);
  });

  it('the shed response names both layers (A13)', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/demos/limits/hammer',
      headers: auth(tenant.apiKey),
    });
    assert.equal(response.statusCode, 429);
    assert.equal(response.json().error.code, 'rate_limit.exceeded');
    assert.match(response.json().error.message, /Cloudflare has its own in front/);
  });

  it('is keyed per credential, so one tenant cannot shed another', async () => {
    // The bug this guards: the limiter runs at onRequest, before the tenant is
    // resolved, so keying on request.tenant silently keyed everything by
    // address instead — and behind a proxy that is one bucket for everyone.
    const other = await provisionViaApi(app, 'limits-other');
    const response = await app.inject({
      method: 'POST',
      url: '/v1/demos/limits/hammer',
      headers: auth(other.apiKey),
    });
    assert.equal(response.statusCode, 200, 'a different tenant must have its own bucket');
  });

  it('accepted requests are audited so the run has a visible end', async () => {
    const log = await app.inject({ method: 'GET', url: '/v1/audit', headers: auth(tenant.apiKey) });
    const accepted = log.json().events.filter((e) => e.action === 'demo.limits.request');
    assert.ok(accepted.length > 0);
  });
});

describe('take-away — the signed receipt (A14)', () => {
  let tenant;

  before(async () => {
    tenant = await provisionViaApi(app, 'receipt');
  });

  it('issues a permalink and states that the link is the primary carrier', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/receipt',
      headers: auth(tenant.apiKey),
    });
    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.match(json.receiptUrl, /\/r\/[\w.-]+$/);
    // A14: email is opt-in and never the default.
    assert.equal(json.emailDelivery.available, false);
    assert.match(json.emailDelivery.note, /opt-in/i);
  });

  it('renders the session with no credential — the token is the capability', async () => {
    const issued = await app.inject({
      method: 'POST',
      url: '/v1/receipt',
      headers: auth(tenant.apiKey),
    });
    const path = new URL(issued.json().receiptUrl).pathname;

    const receipt = await app.inject({ method: 'GET', url: path });
    assert.equal(receipt.statusCode, 200);
    const json = receipt.json();
    assert.equal(json.tenant.publicRef, tenant.publicRef);
    assert.ok(json.session.events.length > 0);
    // §2.10: the actual predicate that blocked them travels with the receipt.
    assert.match(json.predicateThatBlockedYou.policies[0].qual, /app_current_org/);
    assert.match(json.reproduce.attemptTheBreakOut, /curl/);
  });

  it('refuses a forged or tampered token', async () => {
    const issued = await app.inject({
      method: 'POST',
      url: '/v1/receipt',
      headers: auth(tenant.apiKey),
    });
    const token = new URL(issued.json().receiptUrl).pathname.split('/r/')[1];

    for (const bad of [
      token.slice(0, -2) + 'xy',
      token.replace(/\.[^.]+$/, '.forged'),
      'not-a-token-at-all-but-long-enough',
    ]) {
      const response = await app.inject({ method: 'GET', url: `/r/${bad}` });
      assert.equal(response.statusCode, 404, 'forgeries and malformed tokens look identical');
    }
  });

  it('cannot be pointed at another tenant by editing the id', async () => {
    const other = await provisionViaApi(app, 'receipt-other');
    const issued = await app.inject({
      method: 'POST',
      url: '/v1/receipt',
      headers: auth(tenant.apiKey),
    });
    const token = new URL(issued.json().receiptUrl).pathname.split('/r/')[1];
    const parts = token.split('.');
    // Swap the org id but keep the signature — the HMAC covers the payload.
    const tampered = [other.orgId, parts[1], parts[2]].join('.');
    const response = await app.inject({ method: 'GET', url: `/r/${tampered}` });
    assert.equal(response.statusCode, 404);
  });

  it('KEEPS WORKING after the tenant is purged', async () => {
    const doomed = await provisionViaApi(app, 'receipt-doomed');
    const issued = await app.inject({
      method: 'POST',
      url: '/v1/receipt',
      headers: auth(doomed.apiKey),
    });
    const path = new URL(issued.json().receiptUrl).pathname;

    await expireTenant(doomed.orgId);
    await runPurgeSweep({ trigger: 'scheduler' });

    const receipt = await app.inject({ method: 'GET', url: path });
    assert.equal(receipt.statusCode, 200, 'the take-away must survive the consequence beat');
    const json = receipt.json();
    assert.equal(json.tenant.status, 'purged');
    assert.ok(json.tenant.purgedAt !== null);
    assert.ok(json.session.events.length > 0, 'the audit history must still render');
    assert.match(json.disclosure.retention, /purged at/i);
  });
});

describe('the demonstration catalogue', () => {
  it('lists exactly five demonstrations, unauthenticated', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/demonstrations' });
    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.demonstrations.length, 5, 'four stations plus the break-out');
    assert.deepEqual(
      json.demonstrations.map((d) => d.id),
      ['isolation', 'payments', 'fraud', 'ai-cost', 'limits'],
    );
  });

  it('labels the demo as a demo, unprompted (rule 11)', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/demonstrations' });
    const json = response.json();
    assert.equal(json.plane, 'demo');
    assert.match(json.disclosure, /demo plane/i);
    assert.match(json.disclosure, /no path to any production system/i);
  });

  it('every demonstration carries a reproducible curl and a stated mechanism', async () => {
    const response = await app.inject({ method: 'GET', url: '/v1/demonstrations' });
    for (const demo of response.json().demonstrations) {
      assert.match(demo.attempt, /curl|for i in/, `${demo.id} needs a reproduction`);
      assert.ok(demo.mechanism.length > 40, `${demo.id} needs its mechanism stated`);
      assert.ok(demo.proves.length > 10);
    }
  });
});
