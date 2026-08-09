/**
 * `runExclusive` — Postgres advisory locking, mirroring ADR-0004.
 *
 * The Electrical platform's fourth ADR chose advisory locks over Redis locking
 * specifically because Postgres already provides them and the modular-monolith
 * deployment avoids new infrastructure it does not need. The same reasoning
 * applies here and the same primitive is used, so the pattern a reader finds in
 * this repository is the pattern the engineer actually runs.
 *
 * SESSION-SCOPED, NOT TRANSACTION-SCOPED, and that choice matters. A sweep
 * spans many transactions — one per tenant — so a transaction-scoped lock would
 * release after the first tenant and let a second worker interleave. A session
 * lock is held for the whole sweep and released in a finally.
 *
 * The failure mode a session lock introduces is a lock outliving a crashed
 * process. It does not: Postgres drops session advisory locks when the
 * connection ends, and a killed container ends its connections. There is no
 * stale-lock reaper here because there is nothing to reap.
 */
import { pool } from '../db/pool.js';

/** Namespaces the lock space so unrelated jobs cannot collide on one integer. */
export const LOCK = {
  purgeSweep: 'lifecycle:purge-sweep',
} as const;

export type ExclusiveResult<T> = { ran: true; value: T } | { ran: false; value: null };

/**
 * Run `fn` if this process can take the named lock; otherwise decline.
 *
 * `pg_try_advisory_lock` rather than `pg_advisory_lock`: trying and yielding is
 * correct for a job that will run again in fifteen seconds. Blocking would pile
 * workers up behind each other and turn a slow sweep into an outage.
 */
export async function runExclusive<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<ExclusiveResult<T>> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS locked',
      [name],
    );
    if (!rows[0]?.locked) return { ran: false, value: null };

    try {
      return { ran: true, value: await fn() };
    } finally {
      // Must run on the SAME connection that took it — advisory locks are
      // session-scoped, so releasing from a different pooled client is a no-op
      // that silently leaks the lock until the process exits.
      await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [name]);
    }
  } finally {
    client.release();
  }
}
