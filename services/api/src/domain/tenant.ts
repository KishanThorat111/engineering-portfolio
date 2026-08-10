/**
 * The tenant lifecycle: provision → seed → operate → expire → purge.
 *
 * Dossier §7.2 calls out why the purge matters more than it looks: one of the
 * subject's published lessons is that he documented a retention behaviour
 * before automating it — the purge existed in docs and schema and no job ever
 * ran it. Here a real scheduled worker runs it. That loop is closed in
 * worker/purge.ts; this file owns the state it operates on.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { withTenant, withoutTenant, type Tx } from '../db/pool.js';
import { writeAudit } from './audit.js';
import { env } from '../config/env.js';

export type TenantStatus = 'active' | 'expired' | 'purged';

export type Tenant = {
  id: string;
  public_ref: string;
  label: string;
  status: TenantStatus;
  created_at: string;
  expires_at: string;
  purged_at: string | null;
};

/**
 * Public reference: random, not sequential.
 *
 * The visitor sees this and pastes it into curl, and the P2 break-out hands
 * them ANOTHER tenant's reference on purpose. That only works if references
 * cannot be guessed in bulk — an incrementing id would let anyone enumerate
 * every tenant that has ever existed, which turns a designed demonstration
 * into an actual data-exposure surface.
 */
function newPublicRef(): string {
  return `tnt_${randomBytes(9).toString('base64url')}`;
}

export function hashKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

/**
 * `dmo_<public ref>_<secret>`.
 *
 * The prefix is greppable and non-secret so a key can be identified in a log
 * without the log holding a credential; the secret half is what is hashed.
 */
function newApiKey(publicRef: string): { key: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString('base64url');
  const key = `dmo_${publicRef}_${secret}`;
  return { key, prefix: `dmo_${publicRef}`, hash: hashKey(key) };
}

const SEED_TITLES = [
  'Ward 3 — morning round',
  'Ward 3 — evening round',
  'Theatre 1 — terminal clean',
  'Reception — hourly check',
  'Pharmacy — restricted access log',
  'Ward 7 — discharge turnaround',
  'Radiology — equipment wipe-down',
  'Canteen — surface audit',
  'Ward 1 — night round',
  'Loading bay — waste transfer',
];

export type ProvisionResult = {
  tenant: Tenant;
  apiKey: string;
  seededRecords: number;
  correlationId: string;
};

/**
 * Provision a tenant.
 *
 * Note what is NOT here: any escape from RLS. The uuid is generated in the
 * application, `withTenant` binds the scope to it, and the insert then
 * satisfies the policy's WITH CHECK because the row being written is the tenant
 * the session is already scoped to. Provisioning is the one case where a tenant
 * legitimately creates itself, and the data model expresses that instead of
 * carving out an exception for it.
 */
export async function provisionTenant(opts: {
  label: string;
  correlationId: string;
  ip?: string | undefined;
  ttlSeconds?: number | undefined;
  durationMs?: number | undefined;
}): Promise<ProvisionResult> {
  const id = randomUUID();
  const publicRef = newPublicRef();
  const { key, prefix, hash } = newApiKey(publicRef);
  const ttl = opts.ttlSeconds ?? env.TENANT_TTL_SECONDS;

  return withTenant(id, async (tx) => {
    const { rows } = await tx.query<Tenant>(
      `INSERT INTO tenant (id, public_ref, label, status, expires_at)
       VALUES ($1, $2, $3, 'active', now() + make_interval(secs => $4))
       RETURNING id, public_ref, label, status, created_at, expires_at, purged_at`,
      [id, publicRef, opts.label, ttl],
    );
    const tenant = rows[0];
    if (!tenant) throw new Error('tenant insert returned no row');

    await tx.query(
      `INSERT INTO tenant_credential (tenant_id, key_prefix, key_hash) VALUES ($1, $2, $3)`,
      [id, prefix, hash],
    );

    await tx.query(`INSERT INTO tenant_budget (tenant_id, tokens_limit) VALUES ($1, $2)`, [
      id,
      env.TENANT_DEFAULT_TOKEN_BUDGET,
    ]);

    // Seeding is a real insert of real rows, timed by the real database. §2.4
    // renders this as rows flowing in as light; that only stays honest if the
    // rows are actually going in.
    const count = Math.min(env.TENANT_SEED_RECORDS, SEED_TITLES.length);
    for (let i = 0; i < count; i += 1) {
      await tx.query(
        `INSERT INTO demo_record (tenant_id, kind, title, body)
         VALUES ($1, 'seeded', $2, $3)`,
        [id, SEED_TITLES[i], JSON.stringify({ index: i, source: 'provision-seed' })],
      );
    }

    await writeAudit(tx, {
      orgId: id,
      action: 'tenant.provision',
      outcome: 'allowed',
      actor: `tenant:${publicRef}`,
      resourceType: 'tenant',
      resourceId: id,
      correlationId: opts.correlationId,
      ip: opts.ip,
      durationMs: opts.durationMs,
      detail: { seededRecords: count, ttlSeconds: ttl },
    });

    return { tenant, apiKey: key, seededRecords: count, correlationId: opts.correlationId };
  });
}

export async function getTenant(tx: Tx, orgId: string): Promise<Tenant | null> {
  const { rows } = await tx.query<Tenant>(
    `SELECT id, public_ref, label, status, created_at, expires_at, purged_at
       FROM tenant WHERE id = $1`,
    [orgId],
  );
  return rows[0] ?? null;
}

/**
 * Resolve a presented API key to a tenant.
 *
 * This is the one place the server learns which tenant a request belongs to,
 * and it learns it from a hash of a secret — never from a header, a body field,
 * or a path parameter. That is the ADR-0003 contract: `orgId` is server-derived
 * or it is not isolation.
 */
export type ResolvedCredential = {
  tenantId: string;
  credentialId: string;
  tenantStatus: TenantStatus;
  expiresAt: string;
  revokedAt: string | null;
  publicRef: string;
};

export async function resolveCredential(presentedKey: string): Promise<ResolvedCredential | null> {
  const hash = hashKey(presentedKey);
  return withoutTenant(async (tx) => {
    const { rows } = await tx.query<{
      tenant_id: string;
      credential_id: string;
      tenant_status: TenantStatus;
      expires_at: string;
      revoked_at: string | null;
      public_ref: string;
    }>('SELECT * FROM auth_resolve_credential($1)', [hash]);
    const row = rows[0];
    if (!row) return null;
    return {
      tenantId: row.tenant_id,
      credentialId: row.credential_id,
      tenantStatus: row.tenant_status,
      expiresAt: row.expires_at,
      revokedAt: row.revoked_at,
      publicRef: row.public_ref,
    };
  });
}

export type PurgeOutcome = 'purged' | 'already-purged' | 'not-found';

export type PurgeResult = {
  tenantId: string;
  outcome: PurgeOutcome;
  deletedRecords: number;
  revokedCredentials: number;
};

/**
 * Purge one tenant. Idempotent, atomic, and confined by RLS.
 *
 * IDEMPOTENCE comes from the `purged_at IS NULL` guard on the status update: a
 * second run updates zero rows and reports `already-purged` without touching
 * anything. ATOMICITY comes from doing all of it in the one transaction
 * `withTenant` opens — there is no state in which the records are gone but the
 * tenant is still marked active, so a crash mid-purge rolls back whole and the
 * next tick retries from the start. CONFINEMENT comes from running inside the
 * tenant's own RLS scope: even a bug that dropped the WHERE clause could not
 * delete another tenant's rows, because the policy would not return them.
 *
 * WHAT SURVIVES, AND WHY: audit rows. The tenant's data is destroyed; the
 * record that it existed, what was attempted against it, and that it was purged
 * on schedule is kept, because §2.8 and A14 have the visitor leaving with
 * exactly that. Deleting it would delete the take-away.
 */
export async function purgeTenant(tenantId: string, correlationId: string): Promise<PurgeResult> {
  return withTenant(tenantId, async (tx) => {
    // Serialises concurrent workers on this specific tenant. Transaction-scoped,
    // so it is released by COMMIT or ROLLBACK and cannot be leaked by a crash.
    // hashtextextended keeps the uuid inside bigint without a collision-prone
    // manual fold.
    const { rows: lockRows } = await tx.query<{ locked: boolean }>(
      `SELECT pg_try_advisory_xact_lock(hashtextextended($1, 0)) AS locked`,
      [`purge:${tenantId}`],
    );
    if (!lockRows[0]?.locked) {
      // Another worker holds it and is doing exactly this work. Yielding is
      // correct; the other worker's result is the authoritative one.
      return { tenantId, outcome: 'already-purged', deletedRecords: 0, revokedCredentials: 0 };
    }

    const { rows: claim } = await tx.query<{ id: string }>(
      `UPDATE tenant
          SET status = 'purged', purged_at = now(), purge_started_at = COALESCE(purge_started_at, now())
        WHERE id = $1 AND purged_at IS NULL
        RETURNING id`,
      [tenantId],
    );

    if (claim.length === 0) {
      const existing = await getTenant(tx, tenantId);
      return {
        tenantId,
        outcome: existing ? 'already-purged' : 'not-found',
        deletedRecords: 0,
        revokedCredentials: 0,
      };
    }

    const del = await tx.query(`DELETE FROM demo_record WHERE tenant_id = $1`, [tenantId]);
    /*
     * The P2 demonstration tables are tenant-owned and must die with the
     * tenant. A new tenant-owned table that the purge does not know about would
     * outlive its TTL — which is exactly the documented-but-never-executed
     * retention failure this project publishes as a lesson, reintroduced by
     * omission. tenant-lifecycle-purge.test.js asserts both are emptied.
     */
    const delPayments = await tx.query(`DELETE FROM payment_activation WHERE tenant_id = $1`, [
      tenantId,
    ]);
    const delFraud = await tx.query(`DELETE FROM fraud_submission WHERE tenant_id = $1`, [
      tenantId,
    ]);
    const rev = await tx.query(
      `UPDATE tenant_credential SET revoked_at = now()
        WHERE tenant_id = $1 AND revoked_at IS NULL`,
      [tenantId],
    );
    await tx.query(
      `UPDATE tenant_budget SET tokens_used = 0, exhausted_at = NULL, updated_at = now()
        WHERE tenant_id = $1`,
      [tenantId],
    );

    await writeAudit(tx, {
      orgId: tenantId,
      action: 'tenant.purge',
      outcome: 'allowed',
      actor: 'system:purge-worker',
      resourceType: 'tenant',
      resourceId: tenantId,
      correlationId,
      detail: {
        deletedRecords: del.rowCount ?? 0,
        deletedActivations: delPayments.rowCount ?? 0,
        deletedSubmissions: delFraud.rowCount ?? 0,
        revokedCredentials: rev.rowCount ?? 0,
        note: 'Data destroyed on TTL by the scheduled worker. Audit history retained.',
      },
    });

    return {
      tenantId,
      outcome: 'purged',
      deletedRecords: del.rowCount ?? 0,
      revokedCredentials: rev.rowCount ?? 0,
    };
  });
}

/** Ids of tenants past their TTL. The only cross-tenant read in the worker. */
export async function dueTenantIds(limit: number): Promise<string[]> {
  return withoutTenant(async (tx) => {
    const { rows } = await tx.query<{ tenant_id: string }>(
      'SELECT tenant_id FROM lifecycle_due_tenants($1)',
      [limit],
    );
    return rows.map((r) => r.tenant_id);
  });
}
