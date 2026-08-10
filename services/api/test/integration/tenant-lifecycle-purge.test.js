/**
 * The lifecycle, and the purge.
 *
 * This is the file that has to hold up dossier §7.2 — the loop where a
 * retention behaviour that was once documented and never automated is now
 * actually executed by a job. So it tests the properties that make a purge
 * trustworthy rather than just present: idempotence, atomicity, confinement,
 * and correct behaviour under concurrency.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminQuery,
  auth,
  expireTenant,
  provisionViaApi,
  resetRateLimits,
  startApi,
  stopApi,
} from '../helpers/harness.js';
import { purgeTenant, dueTenantIds } from '../../dist/domain/tenant.js';
import { runPurgeSweep } from '../../dist/worker/purge.js';
import { signWebhookBody } from '../../dist/domain/payments.js';

describe('tenant lifecycle — TTL purge', () => {
  let app;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
  });

  after(async () => {
    await stopApi(app);
  });

  it('provisioning creates a tenant, a credential, a budget, and seeded rows', async () => {
    const tenant = await provisionViaApi(app, 'lifecycle');
    assert.ok(tenant.seededRecords > 0);

    const { rows: records } = await adminQuery(
      'SELECT count(*)::int AS n FROM demo_record WHERE tenant_id = $1',
      [tenant.orgId],
    );
    assert.equal(records[0].n, tenant.seededRecords);

    const { rows: creds } = await adminQuery(
      'SELECT count(*)::int AS n FROM tenant_credential WHERE tenant_id = $1 AND revoked_at IS NULL',
      [tenant.orgId],
    );
    assert.equal(creds[0].n, 1);
  });

  it('an unexpired tenant is not due for purge', async () => {
    const tenant = await provisionViaApi(app, 'not-due');
    const due = await dueTenantIds(100);
    assert.ok(!due.includes(tenant.orgId));
  });

  it('the scheduled sweep purges an expired tenant, with no endpoint involved', async () => {
    const tenant = await provisionViaApi(app, 'due');
    await expireTenant(tenant.orgId);

    // This is the exact function the worker process calls on its own timer.
    // Nothing here goes through HTTP.
    const sweep = await runPurgeSweep({ trigger: 'scheduler' });
    assert.equal(sweep.ran, true);
    assert.ok(sweep.purged >= 1);

    const { rows } = await adminQuery('SELECT status, purged_at FROM tenant WHERE id = $1', [
      tenant.orgId,
    ]);
    assert.equal(rows[0].status, 'purged');
    assert.ok(rows[0].purged_at !== null);

    const { rows: records } = await adminQuery(
      'SELECT count(*)::int AS n FROM demo_record WHERE tenant_id = $1',
      [tenant.orgId],
    );
    assert.equal(records[0].n, 0, 'tenant data must be destroyed');

    const { rows: creds } = await adminQuery(
      'SELECT count(*)::int AS n FROM tenant_credential WHERE tenant_id = $1 AND revoked_at IS NULL',
      [tenant.orgId],
    );
    assert.equal(creds[0].n, 0, 'credentials must be revoked');
  });

  it('destroys the P2 demonstration tables too', async () => {
    /*
     * A tenant-owned table the purge does not know about would outlive its
     * TTL — the documented-but-never-executed retention failure, reintroduced
     * by omission. Every new tenant-owned table needs a line here.
     */
    const tenant = await provisionViaApi(app, 'purge-demos');

    const raw = JSON.stringify({
      idempotencyKey: 'evt_purge',
      subscriptionRef: 'sub_purge',
      amountMinor: 100,
      currency: 'GBP',
    });
    await app.inject({
      method: 'POST',
      url: '/v1/demos/payments/webhook',
      headers: {
        ...auth(tenant.apiKey),
        'content-type': 'application/json',
        'x-signature': signWebhookBody(raw, process.env.PAYMENT_WEBHOOK_SECRET),
      },
      payload: raw,
    });
    await app.inject({
      method: 'POST',
      url: '/v1/demos/fraud/evidence',
      headers: auth(tenant.apiKey),
      payload: { label: 'to be purged', imageBase64: 'cHVyZ2UtbWU=' },
    });

    for (const table of ['payment_activation', 'fraud_submission']) {
      const { rows } = await adminQuery(
        `SELECT count(*)::int AS n FROM ${table} WHERE tenant_id = $1`,
        [tenant.orgId],
      );
      assert.equal(rows[0].n, 1, `precondition: ${table} must hold a row before the purge`);
    }

    await expireTenant(tenant.orgId);
    await runPurgeSweep({ trigger: 'scheduler' });

    for (const table of ['payment_activation', 'fraud_submission']) {
      const { rows } = await adminQuery(
        `SELECT count(*)::int AS n FROM ${table} WHERE tenant_id = $1`,
        [tenant.orgId],
      );
      assert.equal(rows[0].n, 0, `${table} must be destroyed with its tenant`);
    }
  });

  it("the purged tenant's key stops working, with an honest reason", async () => {
    const tenant = await provisionViaApi(app, 'to-be-purged');
    await expireTenant(tenant.orgId);
    await runPurgeSweep({ trigger: 'scheduler' });

    const response = await app.inject({
      method: 'GET',
      url: '/v1/records',
      headers: auth(tenant.apiKey),
    });
    assert.equal(response.statusCode, 410);
    assert.equal(response.json().error.code, 'tenant.purged');
  });

  it('audit history SURVIVES the purge (§2.8, A14)', async () => {
    const tenant = await provisionViaApi(app, 'audit-survives');
    await expireTenant(tenant.orgId);
    await runPurgeSweep({ trigger: 'scheduler' });

    const { rows } = await adminQuery(
      'SELECT action FROM audit_event WHERE tenant_id = $1 ORDER BY occurred_at',
      [tenant.orgId],
    );
    const actions = rows.map((r) => r.action);
    assert.ok(actions.includes('tenant.provision'), 'provisioning event must survive');
    assert.ok(actions.includes('tenant.purge'), 'the purge must record itself');
  });

  it('is idempotent — purging twice is a no-op the second time', async () => {
    const tenant = await provisionViaApi(app, 'idempotent');
    await expireTenant(tenant.orgId);

    const first = await purgeTenant(tenant.orgId, 'test-correlation-1');
    assert.equal(first.outcome, 'purged');

    const second = await purgeTenant(tenant.orgId, 'test-correlation-2');
    assert.equal(second.outcome, 'already-purged');
    assert.equal(second.deletedRecords, 0);

    const { rows } = await adminQuery(
      'SELECT count(*)::int AS n FROM audit_event WHERE tenant_id = $1 AND action = $2',
      [tenant.orgId, 'tenant.purge'],
    );
    assert.equal(rows[0].n, 1, 'a repeat purge must not write a second purge event');
  });

  it('handles concurrent workers on the same tenant without double-purging', async () => {
    const tenant = await provisionViaApi(app, 'concurrent');
    await expireTenant(tenant.orgId);

    const results = await Promise.all([
      purgeTenant(tenant.orgId, 'race-a'),
      purgeTenant(tenant.orgId, 'race-b'),
      purgeTenant(tenant.orgId, 'race-c'),
    ]);

    const purged = results.filter((r) => r.outcome === 'purged');
    assert.equal(purged.length, 1, 'exactly one worker may perform the purge');

    const { rows } = await adminQuery(
      'SELECT count(*)::int AS n FROM audit_event WHERE tenant_id = $1 AND action = $2',
      [tenant.orgId, 'tenant.purge'],
    );
    assert.equal(rows[0].n, 1, 'exactly one purge event');
  });

  it('concurrent sweeps do not both run — the advisory lock serialises them', async () => {
    const a = await provisionViaApi(app, 'sweep-a');
    const b = await provisionViaApi(app, 'sweep-b');
    await expireTenant(a.orgId);
    await expireTenant(b.orgId);

    const [first, second] = await Promise.all([
      runPurgeSweep({ trigger: 'scheduler' }),
      runPurgeSweep({ trigger: 'scheduler' }),
    ]);

    const ran = [first, second].filter((r) => r.ran);
    assert.equal(ran.length, 1, 'only one sweep may hold the lock at a time');

    for (const tenant of [a, b]) {
      const { rows } = await adminQuery('SELECT status FROM tenant WHERE id = $1', [tenant.orgId]);
      assert.equal(rows[0].status, 'purged');
    }
  });

  it('purging one tenant does not touch another', async () => {
    const doomed = await provisionViaApi(app, 'doomed');
    const survivor = await provisionViaApi(app, 'survivor');
    await expireTenant(doomed.orgId);

    await runPurgeSweep({ trigger: 'scheduler' });

    const { rows } = await adminQuery(
      'SELECT count(*)::int AS n FROM demo_record WHERE tenant_id = $1',
      [survivor.orgId],
    );
    assert.ok(rows[0].n > 0, "the survivor's records must be untouched");

    const check = await app.inject({
      method: 'GET',
      url: '/v1/tenants/me',
      headers: auth(survivor.apiKey),
    });
    assert.equal(check.statusCode, 200);
  });

  it('a tenant past its TTL is refused before the sweep reaches it', async () => {
    const tenant = await provisionViaApi(app, 'expired-not-yet-purged');
    await expireTenant(tenant.orgId);

    // The window between expiry and purge is real. The API must already be
    // refusing during it, otherwise the TTL would be advisory.
    const response = await app.inject({
      method: 'GET',
      url: '/v1/records',
      headers: auth(tenant.apiKey),
    });
    assert.equal(response.statusCode, 410);
    assert.equal(response.json().error.code, 'tenant.expired');
  });
});
