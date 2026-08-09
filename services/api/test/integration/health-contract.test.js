/**
 * The health contract P5 depends on.
 *
 * Principle 12: liveness is never faked. The experience decides whether to play
 * live telemetry or recorded traces by reading this, so the shape is a contract
 * and not an implementation detail.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { startApi, stopApi } from '../helpers/harness.js';

describe('health contract', () => {
  let app;

  before(async () => {
    app = await startApi();
  });

  after(async () => {
    await stopApi(app);
  });

  it('/health is liveness only and touches no dependency', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.status, 'live');
    // Deliberately absent: a liveness probe that reported dependencies would
    // restart the container every time Postgres blinked.
    assert.equal(body.dependencies, undefined);
  });

  it('/health/ready reports each dependency with a latency', async () => {
    const response = await app.inject({ method: 'GET', url: '/health/ready' });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.status, 'ready');
    assert.equal(body.livePlaneAvailable, true);
    for (const dep of ['postgres', 'redis']) {
      assert.equal(body.dependencies[dep].ok, true, `${dep} must be reachable`);
      assert.equal(typeof body.dependencies[dep].latencyMs, 'number');
    }
  });

  it('health answers even when everything else is rate limited', async () => {
    // The truth-teller must not be throttled: the experience learns to degrade
    // by reading it, and it would need to read it exactly when the system is
    // under the most load.
    const responses = await Promise.all(
      Array.from({ length: 30 }, () => app.inject({ method: 'GET', url: '/health' })),
    );
    assert.ok(
      responses.every((r) => r.statusCode === 200),
      'health must never be rate limited',
    );
  });

  it('every response carries a correlation id header', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.match(response.headers['x-correlation-id'], /^[A-Za-z0-9_-]{8,64}$/);
  });
});
