/**
 * Tenant isolation — demo_record.
 *
 * One file per tenant-owned resource, the ELES pattern. New tenant-owned routes
 * are expected to ship with an equivalent file; the value of the convention is
 * that a missing file is visible.
 *
 * Note the assertion is 403, not the 404 the production suite asserts. That
 * divergence is deliberate and is explained in src/routes/records.ts: the demo
 * has to be seen refusing, production must not confirm existence. The test
 * encodes the demo's contract.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auth, provisionViaApi, resetRateLimits, startApi, stopApi } from '../helpers/harness.js';

describe('tenant isolation — demo_record', () => {
  let app;
  let alice;
  let bob;
  let bobRecordId;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    alice = await provisionViaApi(app, 'alice');
    bob = await provisionViaApi(app, 'bob');

    const list = await app.inject({
      method: 'GET',
      url: '/v1/records',
      headers: auth(bob.apiKey),
    });
    bobRecordId = list.json().records[0].id;
  });

  after(async () => {
    await stopApi(app);
  });

  it('a tenant reads only its own records', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/records',
      headers: auth(alice.apiKey),
    });
    assert.equal(response.statusCode, 200);
    const ids = response.json().records.map((r) => r.id);
    assert.ok(ids.length > 0, 'alice should have seeded records');
    assert.ok(!ids.includes(bobRecordId), "alice's list must not contain bob's record");
  });

  it("refuses a cross-tenant read of another tenant's record", async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/v1/records/${bobRecordId}`,
      headers: auth(alice.apiKey),
    });
    assert.equal(response.statusCode, 403);
    assert.equal(response.json().error.code, 'isolation.denied');
  });

  it('refuses even when the caller asserts the other org id', async () => {
    // The client is allowed to say anything. The server derives the scope from
    // the credential regardless, which is the ADR-0003 contract. If any of
    // these headers could steer the scope, this would return 200.
    const response = await app.inject({
      method: 'GET',
      url: `/v1/records/${bobRecordId}`,
      headers: {
        ...auth(alice.apiKey),
        'x-org-id': bob.orgId,
        'x-tenant-id': bob.orgId,
      },
    });
    assert.equal(response.statusCode, 403);
  });

  it('a created record is not visible to the other tenant', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/v1/records',
      headers: auth(alice.apiKey),
      payload: { title: 'alice private note' },
    });
    assert.equal(created.statusCode, 201);
    const id = created.json().record.id;

    const stolen = await app.inject({
      method: 'GET',
      url: `/v1/records/${id}`,
      headers: auth(bob.apiKey),
    });
    assert.equal(stolen.statusCode, 403);
  });

  it('an unauthenticated read is refused before any scope exists', async () => {
    const response = await app.inject({ method: 'GET', url: `/v1/records/${bobRecordId}` });
    assert.equal(response.statusCode, 401);
    assert.equal(response.json().error.code, 'auth.missing_credential');
  });
});
