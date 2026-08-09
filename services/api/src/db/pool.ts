/**
 * The database pool, and the only place a tenant scope is ever set.
 *
 * WHY THIS FILE IS SMALL AND WHY THAT MATTERS
 * `withTenant()` is the single doorway between the application and tenant-owned
 * data. If setting the scope were possible from anywhere else, "server-derived"
 * would be a convention rather than a property. It is one function, it takes
 * the org id as an argument the caller cannot have read off a request, and it
 * always runs inside a transaction.
 *
 * SET LOCAL, not SET. LOCAL scopes the setting to the transaction, so it is
 * discarded on COMMIT or ROLLBACK. On a pooled connection that is the whole
 * ballgame: a plain SET would persist on the socket and the next tenant to
 * borrow that connection would inherit the previous tenant's scope. That is the
 * classic way RLS is defeated by its own plumbing, and LOCAL is the fix.
 */
import { Pool, type PoolClient, type QueryResultRow } from 'pg';
import { env } from '../config/env.js';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: env.DB_POOL_MAX,
  statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
  // A publicly attackable surface should never hold a connection open forever
  // waiting on a lock somebody else's request is holding.
  idle_in_transaction_session_timeout: 10_000,
  connectionTimeoutMillis: 5_000,
});

export type Tx = {
  query<R extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: R[]; rowCount: number | null }>;
};

function wrap(client: PoolClient): Tx {
  return {
    query: (text, values) => client.query(text, values ? [...values] : undefined),
  };
}

/**
 * Run `fn` inside a transaction scoped to one tenant.
 *
 * Every statement issued through the handed-out `Tx` is subject to the RLS
 * policies in migration 001 with `app.current_org` bound to `orgId`. Callers
 * still write `WHERE tenant_id = $1` as well — that is layer 1, and it is not
 * redundant: it is the layer the production platforms actually run, and keeping
 * both visible is what lets P2 show the difference between them.
 */
export async function withTenant<T>(orgId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // Parameterised rather than interpolated. set_config is the function form
    // of SET LOCAL; `true` is its is_local flag.
    await client.query('SELECT set_config($1, $2, true)', ['app.current_org', orgId]);
    const result = await fn(wrap(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // A rollback that fails means the connection is already unusable; the
      // original error is the one worth propagating.
    }
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Run `fn` with NO tenant scope.
 *
 * Reserved for the two cross-tenant functions in migration 001 and for
 * liveness checks. Anything reading tenant-owned tables through this sees
 * nothing, because RLS resolves `app_current_org()` to NULL and no row equals
 * NULL. That is the intended behaviour and there is a test asserting it.
 */
export async function withoutTenant<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(wrap(client));
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  await pool.end();
}
