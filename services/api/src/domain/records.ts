/**
 * Tenant-owned demo records.
 *
 * These are the rows the P2 break-out will try to read across the boundary, so
 * the access functions here are written the way the production platforms write
 * them: every statement carries `tenant_id = $orgId` (layer 1) and every
 * statement also runs inside an RLS-scoped transaction (layer 2). Both, always.
 * P2 needs to be able to remove one and show the other still holding.
 */
import type { Tx } from '../db/pool.js';

export type DemoRecord = {
  id: string;
  kind: 'seeded' | 'created';
  title: string;
  body: Record<string, unknown>;
  created_at: string;
};

export async function listRecords(tx: Tx, orgId: string, limit: number): Promise<DemoRecord[]> {
  const { rows } = await tx.query<DemoRecord>(
    `SELECT id, kind, title, body, created_at
       FROM demo_record
      WHERE tenant_id = $1
      ORDER BY created_at DESC, id DESC
      LIMIT $2`,
    [orgId, limit],
  );
  return rows;
}

/**
 * Fetch one record by id, scoped.
 *
 * Returns null both when the record does not exist and when it belongs to
 * somebody else — the caller cannot tell those apart from this function, which
 * is the point. The route above it decides what to say (see routes/records.ts
 * for why the demo answers 403 where production answers 404).
 */
export async function getRecord(tx: Tx, orgId: string, id: string): Promise<DemoRecord | null> {
  const { rows } = await tx.query<DemoRecord>(
    `SELECT id, kind, title, body, created_at
       FROM demo_record
      WHERE tenant_id = $1 AND id = $2`,
    [orgId, id],
  );
  return rows[0] ?? null;
}

/**
 * The same read with layer 1 deliberately removed.
 *
 * This exists so P2 can demonstrate the two layers independently, and so a test
 * can prove today that RLS is genuine rather than decorative: the `tenant_id`
 * predicate is gone, and the row still does not come back, because the database
 * refuses it. If someone ever weakens the policies, this is the function whose
 * test fails.
 *
 * It is not reachable from any route. It takes no user input beyond an id.
 */
export async function getRecordWithoutOrgPredicate(tx: Tx, id: string): Promise<DemoRecord | null> {
  const { rows } = await tx.query<DemoRecord>(
    `SELECT id, kind, title, body, created_at FROM demo_record WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function countRecords(tx: Tx, orgId: string): Promise<number> {
  const { rows } = await tx.query<{ n: string }>(
    `SELECT count(*)::text AS n FROM demo_record WHERE tenant_id = $1`,
    [orgId],
  );
  return Number(rows[0]?.n ?? '0');
}

export async function createRecord(
  tx: Tx,
  orgId: string,
  title: string,
  body: Record<string, unknown>,
): Promise<DemoRecord> {
  const { rows } = await tx.query<DemoRecord>(
    `INSERT INTO demo_record (tenant_id, kind, title, body)
     VALUES ($1, 'created', $2, $3)
     RETURNING id, kind, title, body, created_at`,
    [orgId, title, JSON.stringify(body)],
  );
  const row = rows[0];
  if (!row) throw new Error('record insert returned no row');
  return row;
}
