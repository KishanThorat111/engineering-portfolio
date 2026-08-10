/**
 * Demonstration 3 — duplicate-photo detection.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import {
  adminQuery,
  auth,
  provisionViaApi,
  resetRateLimits,
  startApi,
  stopApi,
} from '../helpers/harness.js';

const image = (seed) => Buffer.from(`fake-jpeg-bytes-${seed}`).toString('base64');

function submit(app, apiKey, label, imageBase64) {
  return app.inject({
    method: 'POST',
    url: '/v1/demos/fraud/evidence',
    headers: auth(apiKey),
    payload: { label, imageBase64 },
  });
}

describe('demonstration — duplicate photo detection', () => {
  let app;
  let tenant;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    tenant = await provisionViaApi(app, 'fraud');
  });

  after(async () => {
    await stopApi(app);
  });

  it('accepts the first submission and reports its digest', async () => {
    const response = await submit(app, tenant.apiKey, 'ward 3 clean', image('a'));
    assert.equal(response.statusCode, 201);
    const json = response.json();
    assert.equal(json.outcome, 'accepted');

    const expected = createHash('sha256')
      .update(Buffer.from(image('a'), 'base64'))
      .digest('hex');
    assert.equal(json.digest, expected, 'the digest must be SHA-256 of the submitted bytes');
  });

  it('rejects the identical image with a collision against the original', async () => {
    const response = await submit(app, tenant.apiKey, 'ward 3 clean again', image('a'));
    assert.equal(response.statusCode, 409);
    const json = response.json();
    assert.equal(json.outcome, 'rejected-duplicate');
    assert.equal(json.collidedWith.duplicate_attempts, 1);
    assert.match(json.mechanism.algorithm, /SHA-256/);
  });

  it('rejects it under a different label — the content is what matters', async () => {
    const response = await submit(app, tenant.apiKey, 'a completely different job', image('a'));
    assert.equal(response.statusCode, 409);
    assert.equal(response.json().collidedWith.duplicate_attempts, 2);
  });

  it('accepts a genuinely different image', async () => {
    const response = await submit(app, tenant.apiKey, 'theatre 1', image('b'));
    assert.equal(response.statusCode, 201);
  });

  it('SIMULTANEOUS identical submissions accept exactly one', async () => {
    const bytes = image('race');
    const results = await Promise.all([
      submit(app, tenant.apiKey, 'race 1', bytes),
      submit(app, tenant.apiKey, 'race 2', bytes),
      submit(app, tenant.apiKey, 'race 3', bytes),
    ]);
    const accepted = results.filter((r) => r.statusCode === 201);
    assert.equal(accepted.length, 1, 'the constraint must admit exactly one');
    assert.equal(results.filter((r) => r.statusCode === 409).length, 2);
  });

  it('never stores the image itself', async () => {
    const { rows } = await adminQuery(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'fraud_submission'`,
    );
    const columns = rows.map((r) => r.column_name);
    for (const forbidden of ['image', 'image_bytes', 'payload', 'data', 'content', 'blob']) {
      assert.ok(!columns.includes(forbidden), `fraud_submission must not hold a ${forbidden}`);
    }
    assert.ok(columns.includes('image_sha256'));
  });

  it('bounds the upload size', async () => {
    const huge = randomBytes(700_000).toString('base64');
    const response = await submit(app, tenant.apiKey, 'oversized', huge);
    assert.ok(
      response.statusCode === 413 || response.statusCode === 400,
      `expected a size rejection, got ${response.statusCode}`,
    );
  });

  it('the same image in another tenant is accepted — collisions are tenant-scoped', async () => {
    const other = await provisionViaApi(app, 'fraud-other');
    const response = await submit(app, other.apiKey, 'their ward', image('a'));
    assert.equal(response.statusCode, 201);
  });

  it('audits both the acceptance and the rejection', async () => {
    const log = await app.inject({ method: 'GET', url: '/v1/audit', headers: auth(tenant.apiKey) });
    const events = log.json().events.filter((e) => e.action === 'demo.fraud.submit');
    assert.ok(
      events.some((e) => e.outcome === 'allowed'),
      'acceptance must be audited',
    );
    assert.ok(
      events.some((e) => e.outcome === 'denied'),
      'rejection must be audited',
    );
    assert.ok(events.every((e) => typeof e.detail.digest === 'string'));
  });
});
