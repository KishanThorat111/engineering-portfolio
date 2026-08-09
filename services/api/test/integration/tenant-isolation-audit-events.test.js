/**
 * Tenant isolation — audit_event.
 *
 * The audit log is the evidence the product hands the visitor, so a leak here
 * would be worse than a leak of the demo records: it would expose what other
 * visitors attempted.
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
import { withTenant } from '../../dist/db/pool.js';

describe('tenant isolation — audit_event', () => {
  let app;
  let alice;
  let bob;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    alice = await provisionViaApi(app, 'audit-alice');
    bob = await provisionViaApi(app, 'audit-bob');
  });

  after(async () => {
    await stopApi(app);
  });

  it('a tenant reads only its own audit events', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/audit',
      headers: auth(alice.apiKey),
    });
    assert.equal(response.statusCode, 200);
    const events = response.json().events;
    assert.ok(events.length > 0, 'provisioning must have written an audit event');

    const { rows } = await adminQuery('SELECT id FROM audit_event WHERE tenant_id = $1', [
      bob.orgId,
    ]);
    const bobIds = new Set(rows.map((r) => r.id));
    assert.ok(
      events.every((e) => !bobIds.has(e.id)),
      "alice's audit log must contain none of bob's events",
    );
  });

  it('RLS refuses a cross-tenant audit read with no org predicate', async () => {
    const rows = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('SELECT id FROM audit_event WHERE tenant_id = $1', [bob.orgId]);
      return result.rows;
    });
    assert.equal(rows.length, 0);
  });

  it("a denied cross-tenant read is recorded in the ATTACKER's log, not the victim's", async () => {
    const { rows } = await adminQuery('SELECT id FROM demo_record WHERE tenant_id = $1 LIMIT 1', [
      bob.orgId,
    ]);
    const target = rows[0].id;

    const denied = await app.inject({
      method: 'GET',
      url: `/v1/records/${target}`,
      headers: auth(alice.apiKey),
    });
    assert.equal(denied.statusCode, 403);

    // §2.5: the visitor is shown the audit entry for their OWN attempt. It has
    // to land in their log for that to be possible.
    const log = await app.inject({
      method: 'GET',
      url: '/v1/audit',
      headers: auth(alice.apiKey),
    });
    const denials = log.json().events.filter((e) => e.outcome === 'denied');
    assert.ok(denials.length > 0, "the denial must appear in the attacker's own audit log");
    assert.equal(denials[0].action, 'record.read');
    assert.equal(denials[0].resource_id, target);
    // The actor must identify the tenant that made the attempt. This was
    // silently "dmo_tnt" for every tenant until the ref stopped being parsed
    // out of the key — an audit log that cannot say who acted is not one.
    assert.equal(denials[0].actor, `tenant:${alice.publicRef}`);
    // And it must record that the database layer independently refused.
    assert.equal(denials[0].detail.rlsHeld, true);

    const victimLog = await app.inject({
      method: 'GET',
      url: '/v1/audit',
      headers: auth(bob.apiKey),
    });
    assert.ok(
      victimLog.json().events.every((e) => e.outcome !== 'denied'),
      "the victim's log must not contain the attacker's denial",
    );
  });

  it('an audit row cannot be planted in another tenant', async () => {
    await assert.rejects(
      () =>
        withTenant(alice.orgId, (tx) =>
          tx.query(
            `INSERT INTO audit_event (tenant_id, action, outcome, actor, correlation_id)
             VALUES ($1, 'forged', 'allowed', 'attacker', 'x')`,
            [bob.orgId],
          ),
        ),
      /row-level security/i,
    );
  });
});
