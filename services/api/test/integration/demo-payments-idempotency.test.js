/**
 * Demonstration 2 — idempotent activation.
 *
 * The load-bearing case is the concurrent one. Sequential idempotency is easy
 * and proves little; §2.6 says "fire the webhook twice, simultaneously", and
 * the whole reason the database holds the constraint is that simultaneous is
 * where a read-then-write implementation fails.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auth, provisionViaApi, resetRateLimits, startApi, stopApi } from '../helpers/harness.js';
import { signWebhookBody } from '../../dist/domain/payments.js';

const SECRET = process.env.PAYMENT_WEBHOOK_SECRET;

function webhook(app, apiKey, payload) {
  const raw = JSON.stringify(payload);
  return app.inject({
    method: 'POST',
    url: '/v1/demos/payments/webhook',
    headers: {
      ...auth(apiKey),
      'content-type': 'application/json',
      'x-signature': signWebhookBody(raw, SECRET),
    },
    payload: raw,
  });
}

const body = (key) => ({
  idempotencyKey: key,
  subscriptionRef: 'sub_demo',
  amountMinor: 4900,
  currency: 'GBP',
});

describe('demonstration — payments idempotency', () => {
  let app;
  let tenant;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    tenant = await provisionViaApi(app, 'payments');
  });

  after(async () => {
    await stopApi(app);
  });

  it('activates once and reports that this call decided it', async () => {
    const response = await webhook(app, tenant.apiKey, body('evt_first'));
    assert.equal(response.statusCode, 201);
    const json = response.json();
    assert.equal(json.outcome, 'activated');
    assert.equal(json.decidedHere, true);
    assert.equal(json.activation.replay_count, 0);
  });

  it('the second delivery no-ops and increments the replay count', async () => {
    const response = await webhook(app, tenant.apiKey, body('evt_first'));
    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.outcome, 'replayed');
    assert.equal(json.decidedHere, false);
    assert.equal(json.activation.replay_count, 1);
  });

  it('TWO SIMULTANEOUS deliveries produce exactly one activation', async () => {
    const key = 'evt_race';
    const results = await Promise.all([
      webhook(app, tenant.apiKey, body(key)),
      webhook(app, tenant.apiKey, body(key)),
      webhook(app, tenant.apiKey, body(key)),
      webhook(app, tenant.apiKey, body(key)),
    ]);

    const outcomes = results.map((r) => r.json().outcome);
    const activated = outcomes.filter((o) => o === 'activated');
    assert.equal(activated.length, 1, `exactly one may activate, got ${outcomes.join(',')}`);
    assert.equal(outcomes.filter((o) => o === 'replayed').length, 3);

    const decided = results.filter((r) => r.json().decidedHere === true);
    assert.equal(decided.length, 1, 'exactly one caller may believe it decided');
  });

  it('the two paths converge on the same activation', async () => {
    const key = 'evt_dual_path';
    const first = await webhook(app, tenant.apiKey, body(key));
    assert.equal(first.json().outcome, 'activated');
    assert.equal(first.json().activation.activated_via, 'webhook');

    // The client returning from checkout with the same event must not activate
    // a second time — either path may arrive first and both must be safe.
    const second = await app.inject({
      method: 'POST',
      url: '/v1/demos/payments/verify',
      headers: auth(tenant.apiKey),
      payload: body(key),
    });
    assert.equal(second.statusCode, 200);
    assert.equal(second.json().outcome, 'replayed');
    assert.equal(second.json().activation.activated_via, 'webhook', 'the winner is unchanged');
  });

  it('refuses a webhook with a forged signature, and audits the refusal', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/demos/payments/webhook',
      headers: {
        ...auth(tenant.apiKey),
        'content-type': 'application/json',
        'x-signature': 'f'.repeat(64),
      },
      payload: JSON.stringify(body('evt_forged')),
    });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'payments.bad_signature');

    const log = await app.inject({ method: 'GET', url: '/v1/audit', headers: auth(tenant.apiKey) });
    const denials = log
      .json()
      .events.filter((e) => e.action === 'demo.payments.webhook' && e.outcome === 'denied');
    assert.ok(denials.length > 0, 'a forged webhook must leave a trace');
  });

  it('refuses a webhook with no signature at all', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/demos/payments/webhook',
      headers: { ...auth(tenant.apiKey), 'content-type': 'application/json' },
      payload: JSON.stringify(body('evt_unsigned')),
    });
    assert.equal(response.statusCode, 401);
  });

  it('rejects a signature computed over a DIFFERENT body', async () => {
    // Proves the HMAC covers the payload rather than being a shared password.
    const sent = JSON.stringify(body('evt_tampered'));
    const signedOverSomethingElse = signWebhookBody(JSON.stringify(body('evt_other')), SECRET);
    const response = await app.inject({
      method: 'POST',
      url: '/v1/demos/payments/webhook',
      headers: {
        ...auth(tenant.apiKey),
        'content-type': 'application/json',
        'x-signature': signedOverSomethingElse,
      },
      payload: sent,
    });
    assert.equal(response.statusCode, 401);
  });

  it('opens the idempotency key that decided it', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/demos/payments/keys/evt_race',
      headers: auth(tenant.apiKey),
    });
    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.activation.idempotency_key, 'evt_race');
    assert.equal(json.activation.replay_count, 3);
    assert.match(json.mechanism.statement, /ON CONFLICT/);
    assert.match(json.mechanism.why, /between that read and that/i);
    assert.equal(json.cache.present, true, 'the Redis fast path should hold the key');
  });

  it("another tenant cannot see or collide with this tenant's keys", async () => {
    const other = await provisionViaApi(app, 'payments-other');

    const unseen = await app.inject({
      method: 'GET',
      url: '/v1/demos/payments/keys/evt_race',
      headers: auth(other.apiKey),
    });
    assert.equal(unseen.statusCode, 404);

    // The same key in a different tenant is a different fact and must activate.
    const mine = await webhook(app, other.apiKey, body('evt_race'));
    assert.equal(mine.statusCode, 201);
    assert.equal(mine.json().outcome, 'activated');
  });
});
