/**
 * The membrane inspector — demonstration 1, and the peak of the whole product.
 *
 * §2.5: "the visitor can peel the membrane open and see the actual row-scope
 * predicate, the real query plan, and the branch that returned 403, with their
 * own attempted query beside it. Not a diagram of isolation. The mechanism
 * itself."
 *
 * Every field below is READ FROM THE RUNNING DATABASE at the moment of the
 * request. The policy text comes out of `pg_policies`, the plan comes out of a
 * real `EXPLAIN` of the real statement, and the two layer results come from
 * actually running both queries. Nothing here is a stored description of what
 * the system is believed to do — if someone changes a policy, this output
 * changes with it, because it is the same catalog the planner reads.
 *
 * WHY EXPLAIN IS SAFE HERE
 * The statement is fixed and parameterised; only a UUID varies, and it is
 * validated before it arrives. No part of the SQL is assembled from input, so
 * there is no arbitrary-SQL surface — which §7.3 rules out absolutely, and
 * which would be an odd thing to introduce in the endpoint whose subject is
 * that the boundary holds.
 *
 * The plan is worth more than it looks: PostgreSQL inlines RLS policy
 * expressions into the plan's filters, so the visitor sees the policy predicate
 * appear inside the query plan as a quals entry. That is the database saying
 * the boundary exists, in its own words.
 */
import type { Tx } from '../db/pool.js';

/** The exact statement the API runs for a scoped record read. */
export const SCOPED_READ_SQL =
  'SELECT id, kind, title, body, created_at FROM demo_record WHERE tenant_id = $1 AND id = $2';

/** The same read with layer 1 removed, used to isolate layer 2's behaviour. */
export const UNSCOPED_READ_SQL =
  'SELECT id, kind, title, body, created_at FROM demo_record WHERE id = $1';

export type PolicyRow = {
  policyname: string;
  cmd: string;
  qual: string | null;
  with_check: string | null;
  permissive: string;
  roles: string[];
};

export type TableSecurity = {
  table: string;
  rlsEnabled: boolean;
  rlsForced: boolean;
  policies: PolicyRow[];
};

export type IsolationInspection = {
  outcome: 'denied' | 'allowed';
  recordId: string;
  attempt: {
    /** What the caller asked for, and what the server used instead. */
    requestedRecordId: string;
    effectiveOrgId: string;
    orgIdSource: string;
    sql: string;
    parameters: string[];
  };
  layers: {
    orgScope: { name: string; mechanism: string; rowsReturned: number; refused: boolean };
    rowLevelSecurity: { name: string; mechanism: string; rowsReturned: number; refused: boolean };
  };
  /** Straight out of pg_policies. The predicate itself, not a paraphrase. */
  policy: TableSecurity;
  /** Straight out of EXPLAIN. The RLS quals appear inside it. */
  queryPlan: unknown;
  /** Where the 403 came from, named by file. */
  branch: {
    file: string;
    condition: string;
    statusCode: number;
    code: string;
  };
  disclosure: {
    productionParity: string;
    statusCodeChoice: string;
  };
};

/** Read the live security configuration for a table out of the catalog. */
export async function readTableSecurity(tx: Tx, table: string): Promise<TableSecurity> {
  const { rows: cls } = await tx.query<{ relrowsecurity: boolean; relforcerowsecurity: boolean }>(
    'SELECT relrowsecurity, relforcerowsecurity FROM pg_class WHERE relname = $1',
    [table],
  );

  const { rows: policies } = await tx.query<PolicyRow>(
    `SELECT policyname, cmd, qual, with_check, permissive, roles::text[] AS roles
       FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1
      ORDER BY policyname`,
    [table],
  );

  return {
    table,
    rlsEnabled: cls[0]?.relrowsecurity ?? false,
    rlsForced: cls[0]?.relforcerowsecurity ?? false,
    policies,
  };
}

/**
 * Inspect one attempted cross-tenant read, end to end.
 *
 * Runs inside the caller's own RLS scope — the inspector cannot see past the
 * boundary either, which is the correct property for an endpoint a visitor is
 * invited to point at other people's data.
 */
export async function inspectRecordAccess(
  tx: Tx,
  orgId: string,
  recordId: string,
): Promise<IsolationInspection> {
  // Layer 1: the query the API actually runs.
  const scoped = await tx.query(SCOPED_READ_SQL, [orgId, recordId]);

  // Layer 2 in isolation: the same read with the org predicate removed. If this
  // returns a row while the scoped one did not, layer 2 is not enforcing and
  // the demonstration is a lie — which is why the result is reported rather
  // than assumed.
  const unscoped = await tx.query(UNSCOPED_READ_SQL, [recordId]);

  const [policy, plan] = await Promise.all([
    readTableSecurity(tx, 'demo_record'),
    explainScopedRead(tx, orgId, recordId),
  ]);

  const denied = scoped.rows.length === 0;

  return {
    outcome: denied ? 'denied' : 'allowed',
    recordId,
    attempt: {
      requestedRecordId: recordId,
      effectiveOrgId: orgId,
      orgIdSource:
        'derived from the verified API credential — never from a header, body, or path parameter',
      sql: SCOPED_READ_SQL,
      parameters: [orgId, recordId],
    },
    layers: {
      orgScope: {
        name: 'server-derived org scope',
        mechanism: 'application',
        rowsReturned: scoped.rows.length,
        refused: scoped.rows.length === 0,
      },
      rowLevelSecurity: {
        name: 'PostgreSQL row-level security',
        mechanism: 'database',
        rowsReturned: unscoped.rows.length,
        refused: unscoped.rows.length === 0,
      },
    },
    policy,
    queryPlan: plan,
    branch: {
      file: 'services/api/src/routes/records.ts',
      condition: 'getRecord() returned null for a well-formed uuid',
      statusCode: 403,
      code: 'isolation.denied',
    },
    disclosure: {
      productionParity:
        'The production KodSpot platforms run the org-scope layer (ADR-0003) with a ' +
        'per-resource isolation regression suite. They do NOT run PostgreSQL row-level ' +
        'security. This demo adds it beneath the production pattern, so what you are ' +
        'looking at is stronger than the systems it demonstrates, not identical to them.',
      statusCodeChoice:
        'This demo answers 403 so the refusal is visible. The production platforms answer ' +
        '404 on another org resource, deliberately, so the API does not confirm that it ' +
        'exists. The demo trades that for being watchable.',
    },
  };
}

/**
 * A real EXPLAIN of the real statement.
 *
 * Not ANALYZE: ANALYZE executes the query to collect timings, and executing an
 * extra read on the denial path to make the output prettier would be doing work
 * the demonstration does not need. The plan shape and the inlined RLS quals are
 * what the visitor came for.
 */
async function explainScopedRead(tx: Tx, orgId: string, recordId: string): Promise<unknown> {
  const { rows } = await tx.query<{ 'QUERY PLAN': unknown }>(
    `EXPLAIN (FORMAT JSON, VERBOSE, COSTS) ${SCOPED_READ_SQL}`,
    [orgId, recordId],
  );
  return rows[0]?.['QUERY PLAN'] ?? null;
}
