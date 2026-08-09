/**
 * Tenant isolation — tenant_credential, and the tenant row itself.
 *
 * Credentials are the highest-value rows in the database: a leak here is a
 * total isolation break rather than a data exposure.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auth, provisionViaApi, resetRateLimits, startApi, stopApi } from '../helpers/harness.js';
import { withTenant } from '../../dist/db/pool.js';

describe('tenant isolation — tenant_credential and tenant', () => {
  let app;
  let alice;
  let bob;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    alice = await provisionViaApi(app, 'cred-alice');
    bob = await provisionViaApi(app, 'cred-bob');
  });

  after(async () => {
    await stopApi(app);
  });

  it("a tenant cannot read another tenant's credential rows", async () => {
    const rows = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('SELECT id, key_hash FROM tenant_credential');
      return result.rows;
    });
    assert.ok(rows.length > 0, 'alice must see her own credential');
    const foreign = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('SELECT id FROM tenant_credential WHERE tenant_id = $1', [
        bob.orgId,
      ]);
      return result.rows;
    });
    assert.equal(foreign.length, 0);
  });

  it("a tenant cannot read another tenant's tenant row", async () => {
    const rows = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('SELECT id FROM tenant WHERE id = $1', [bob.orgId]);
      return result.rows;
    });
    assert.equal(rows.length, 0);
  });

  it('a tenant sees exactly one tenant row — its own', async () => {
    const rows = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('SELECT id FROM tenant');
      return result.rows;
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].id, alice.orgId);
  });

  it("a tenant cannot revoke another tenant's credential", async () => {
    const affected = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query(
        'UPDATE tenant_credential SET revoked_at = now() WHERE tenant_id = $1',
        [bob.orgId],
      );
      return result.rowCount;
    });
    assert.equal(affected, 0);

    // Bob's key must still work — a denial-of-service on another tenant is an
    // isolation break too, not just a read.
    const stillWorks = await app.inject({
      method: 'GET',
      url: '/v1/tenants/me',
      headers: auth(bob.apiKey),
    });
    assert.equal(stillWorks.statusCode, 200);
  });

  it("/v1/tenants/me returns the caller's own tenant and never another", async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/tenants/me',
      headers: auth(alice.apiKey),
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().tenant.id, alice.orgId);
  });

  it('the API key is returned once and is not retrievable afterwards', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/tenants/me',
      headers: auth(alice.apiKey),
    });
    assert.ok(
      !JSON.stringify(response.json()).includes(alice.apiKey),
      'no endpoint may echo the API key back',
    );
  });
});
