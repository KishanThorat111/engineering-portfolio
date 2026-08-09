/**
 * Tenant isolation — LAYER 2 ALONE.
 *
 * This is the most important file in the suite and the reason the two layers
 * were built as separate, observable mechanisms rather than one.
 *
 * Every other isolation test passes if EITHER layer works. That is exactly the
 * property that lets a broken RLS policy hide behind a correct WHERE clause for
 * months. These cases remove layer 1 — the `tenant_id = $orgId` predicate the
 * production platforms rely on — and assert the database still refuses.
 *
 * If someone weakens a policy, drops FORCE, or connects the application as the
 * table owner, this file fails and nothing else does.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  adminQuery,
  provisionViaApi,
  resetRateLimits,
  startApi,
  stopApi,
} from '../helpers/harness.js';
import { withTenant, withoutTenant } from '../../dist/db/pool.js';
import { getRecordWithoutOrgPredicate } from '../../dist/domain/records.js';

describe('tenant isolation — PostgreSQL RLS, with org scoping removed', () => {
  let app;
  let alice;
  let bob;
  let bobRecordId;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    alice = await provisionViaApi(app, 'rls-alice');
    bob = await provisionViaApi(app, 'rls-bob');
    const { rows } = await adminQuery('SELECT id FROM demo_record WHERE tenant_id = $1 LIMIT 1', [
      bob.orgId,
    ]);
    bobRecordId = rows[0].id;
  });

  after(async () => {
    await stopApi(app);
  });

  it('the row genuinely exists — so a null result later means RLS, not an empty table', async () => {
    const { rows } = await adminQuery('SELECT id FROM demo_record WHERE id = $1', [bobRecordId]);
    assert.equal(rows.length, 1, 'precondition: the record must exist to be refused');
  });

  it("refuses a query with NO org predicate, from inside another tenant's scope", async () => {
    const found = await withTenant(alice.orgId, (tx) =>
      getRecordWithoutOrgPredicate(tx, bobRecordId),
    );
    assert.equal(found, null, 'RLS must refuse the row even with no WHERE tenant_id clause');
  });

  it('refuses a bare SELECT * with no scope set at all', async () => {
    const rows = await withoutTenant(async (tx) => {
      const result = await tx.query('SELECT id FROM demo_record');
      return result.rows;
    });
    assert.equal(rows.length, 0, 'an unscoped session must see no tenant-owned rows');
  });

  it('refuses a cross-tenant UPDATE with no org predicate', async () => {
    const affected = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query(`UPDATE demo_record SET title = 'stolen' WHERE id = $1`, [
        bobRecordId,
      ]);
      return result.rowCount;
    });
    assert.equal(affected, 0, 'RLS must refuse the update');

    const { rows } = await adminQuery('SELECT title FROM demo_record WHERE id = $1', [bobRecordId]);
    assert.notEqual(rows[0].title, 'stolen');
  });

  it('refuses a cross-tenant DELETE with no org predicate', async () => {
    const affected = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('DELETE FROM demo_record WHERE id = $1', [bobRecordId]);
      return result.rowCount;
    });
    assert.equal(affected, 0, 'RLS must refuse the delete');

    const { rows } = await adminQuery('SELECT id FROM demo_record WHERE id = $1', [bobRecordId]);
    assert.equal(rows.length, 1, "bob's record must still exist");
  });

  it('refuses an INSERT that claims another tenant', async () => {
    // WITH CHECK, not USING. A tenant must not be able to plant a row in
    // somebody else's scope — which would be a write-side isolation break and
    // is a different policy clause from the read-side one.
    await assert.rejects(
      () =>
        withTenant(alice.orgId, (tx) =>
          tx.query(
            `INSERT INTO demo_record (tenant_id, kind, title) VALUES ($1, 'created', 'planted')`,
            [bob.orgId],
          ),
        ),
      /row-level security/i,
    );
  });

  it('the application role cannot bypass RLS and does not own the tables', async () => {
    // The guarantee above is only real while these two facts hold. Asserting
    // them directly means a future change to the bootstrap fails here rather
    // than silently making every case above vacuous.
    const { rows: roleRows } = await adminQuery(
      'SELECT rolbypassrls, rolsuper FROM pg_roles WHERE rolname = $1',
      ['demo_app'],
    );
    assert.equal(roleRows[0].rolbypassrls, false, 'demo_app must not have BYPASSRLS');
    assert.equal(roleRows[0].rolsuper, false, 'demo_app must not be a superuser');

    const { rows: ownerRows } = await adminQuery(
      `SELECT tablename, tableowner FROM pg_tables WHERE tablename = 'demo_record'`,
    );
    assert.notEqual(ownerRows[0].tableowner, 'demo_app', 'demo_app must not own the table');
  });

  it('every tenant-owned table has RLS enabled AND forced', async () => {
    const { rows } = await adminQuery(
      `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
        WHERE relname IN ('tenant','tenant_credential','demo_record','audit_event','tenant_budget')
        ORDER BY relname`,
    );
    assert.equal(rows.length, 5, 'all five tenant-owned tables must be present');
    for (const row of rows) {
      assert.equal(row.relrowsecurity, true, `${row.relname}: RLS must be enabled`);
      // FORCE is what stops the owner being exempt. Without it, connecting as
      // the owner by accident would disable isolation with no error anywhere.
      assert.equal(row.relforcerowsecurity, true, `${row.relname}: RLS must be FORCED`);
    }
  });
});
