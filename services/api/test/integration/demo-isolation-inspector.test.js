/**
 * Demonstration 1 — the membrane inspector.
 *
 * §2.5's peak. The assertions are about the output being READ FROM THE DATABASE
 * rather than described: the policy text must be the real predicate, the plan
 * must be a real plan, and the two layer results must come from two queries
 * that actually ran.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminQuery,
  auth,
  provisionViaApi,
  resetRateLimits,
  startApi,
  stopApi,
} from '../helpers/harness.js';

describe('demonstration — isolation inspector', () => {
  let app;
  let attacker;
  let victim;
  let victimRecordId;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    attacker = await provisionViaApi(app, 'inspect-attacker');
    victim = await provisionViaApi(app, 'inspect-victim');
    const { rows } = await adminQuery('SELECT id FROM demo_record WHERE tenant_id = $1 LIMIT 1', [
      victim.orgId,
    ]);
    victimRecordId = rows[0].id;
  });

  after(async () => {
    await stopApi(app);
  });

  it('reports the denial and names both layers as having refused', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: auth(attacker.apiKey),
    });
    assert.equal(response.statusCode, 200);
    const body = response.json();

    assert.equal(body.outcome, 'denied');
    assert.equal(body.layers.orgScope.refused, true);
    assert.equal(body.layers.rowLevelSecurity.refused, true);
    assert.equal(body.layers.rowLevelSecurity.rowsReturned, 0);
  });

  it('carries the REAL policy predicate out of pg_policies', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: auth(attacker.apiKey),
    });
    const policy = response.json().policy;

    assert.equal(policy.table, 'demo_record');
    assert.equal(policy.rlsEnabled, true);
    assert.equal(policy.rlsForced, true);
    assert.ok(policy.policies.length >= 1, 'at least one policy must be reported');

    // The predicate must be the actual expression, not a description of it.
    const qual = policy.policies[0].qual ?? '';
    assert.match(qual, /app_current_org\(\)/);
    assert.match(qual, /tenant_id/);

    // And it must match what the catalog says right now, not a copy.
    const { rows } = await adminQuery(
      `SELECT qual FROM pg_policies WHERE tablename = 'demo_record' AND policyname = $1`,
      [policy.policies[0].policyname],
    );
    assert.equal(policy.policies[0].qual, rows[0].qual);
  });

  it('carries a real query plan with the RLS filter inlined into it', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: auth(attacker.apiKey),
    });
    const plan = response.json().queryPlan;
    assert.ok(Array.isArray(plan) && plan.length > 0, 'EXPLAIN must return a plan');

    /*
     * PostgreSQL inlines the policy into the plan — and it goes further than
     * naming app_current_org(): it expands that function's body, so the plan
     * carries the literal session lookup as a One-Time Filter. That is the
     * database stating the boundary in its own output, which is stronger
     * evidence than a function name would have been.
     */
    const serialised = JSON.stringify(plan);
    assert.match(serialised, /One-Time Filter/);
    assert.match(serialised, /current_setting\('app\.current_org/);
    assert.match(serialised, /Index Cond.*tenant_id/);
  });

  it('shows the attempted query and the derived scope, not the requested one', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: { ...auth(attacker.apiKey), 'x-org-id': victim.orgId },
    });
    const attempt = response.json().attempt;

    assert.equal(attempt.requestedRecordId, victimRecordId);
    // Even though the caller asserted the victim's org in a header.
    assert.equal(attempt.effectiveOrgId, attacker.orgId);
    assert.match(attempt.orgIdSource, /derived from the verified API credential/);
    assert.match(attempt.sql, /tenant_id = \$1 AND id = \$2/);
  });

  it('discloses that production does not run RLS, and why the code is 403', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: auth(attacker.apiKey),
    });
    const disclosure = response.json().disclosure;
    assert.match(disclosure.productionParity, /do NOT run PostgreSQL row-level security/i);
    assert.match(disclosure.statusCodeChoice, /404/);
  });

  it('allows the inspection of a record the caller does own', async () => {
    const own = await app.inject({
      method: 'GET',
      url: '/v1/records',
      headers: auth(attacker.apiKey),
    });
    const ownId = own.json().records[0].id;

    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${ownId}`,
      headers: auth(attacker.apiKey),
    });
    const body = response.json();
    assert.equal(body.outcome, 'allowed');
    assert.equal(body.layers.orgScope.refused, false);
    assert.equal(body.layers.rowLevelSecurity.refused, false);
  });

  it('writes an audit row for the inspection itself', async () => {
    await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: auth(attacker.apiKey),
    });
    const log = await app.inject({
      method: 'GET',
      url: '/v1/audit',
      headers: auth(attacker.apiKey),
    });
    const events = log.json().events.filter((e) => e.action === 'demo.isolation.inspect');
    assert.ok(events.length > 0, 'the inspection must be audited');
    assert.equal(events[0].outcome, 'denied');
    assert.equal(events[0].detail.rlsRefused, true);
  });

  it('cannot be used to read another tenant, only to observe being refused', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/demos/isolation/inspect/${victimRecordId}`,
      headers: auth(attacker.apiKey),
    });
    // The inspector runs inside the caller's own scope. If it leaked the row it
    // would be the very exfiltration path the demonstration claims is closed.
    const raw = response.body;
    const { rows } = await adminQuery('SELECT title FROM demo_record WHERE id = $1', [
      victimRecordId,
    ]);
    assert.ok(!raw.includes(rows[0].title), "the inspector must not disclose the victim's data");
  });
});
