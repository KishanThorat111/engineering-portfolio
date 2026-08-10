import './env.js';
import { migrate } from '../../dist/db/migrate.js';
import { buildServer } from '../../dist/server.js';
import { closePool, pool, withTenant } from '../../dist/db/pool.js';
import { closeRedis, connectRedis, redis } from '../../dist/redis/client.js';

let migrated = false;
let torndown = false;

/** Migrations are idempotent and run once per process. */
export async function ensureSchema() {
  if (migrated) return;
  await migrate();
  migrated = true;
}

export async function startApi() {
  if (torndown) {
    // stopApi ends the shared pg pool, which is a module singleton and cannot
    // be revived. Without this the symptom is every request 500ing with
    // "Cannot use a pool after calling end on the pool", several suites away
    // from the cause. One server per test file.
    throw new Error(
      'startApi() called after stopApi(): the pg pool is closed for this process. ' +
        'Use one server per test file, with top-level before/after hooks.',
    );
  }
  await ensureSchema();
  const app = await buildServer();
  await app.ready();
  return app;
}

export async function stopApi(app) {
  torndown = true;
  if (app) await app.close();
  await Promise.allSettled([closePool(), closeRedis()]);
}

/**
 * Provision a tenant through the real HTTP surface.
 *
 * Going through `inject` rather than calling provisionTenant() directly is
 * deliberate: it exercises the route, the validation, the rate limiter, and the
 * auth plugin's view of the credential, which is what an attacker would meet.
 */
export async function provisionViaApi(app, label = 'test tenant') {
  const response = await app.inject({
    method: 'POST',
    url: '/v1/tenants',
    payload: { label },
  });
  if (response.statusCode !== 201) {
    throw new Error(`provision failed: ${response.statusCode} ${response.body}`);
  }
  const body = response.json();
  return {
    orgId: body.tenant.id,
    publicRef: body.tenant.publicRef,
    apiKey: body.credential.apiKey,
    seededRecords: body.seededRecords,
  };
}

export function auth(apiKey) {
  return { authorization: `Bearer ${apiKey}` };
}

/** Rate-limit counters are shared across cases; clear them between files. */
export async function resetRateLimits() {
  await connectRedis();
  const client = redis();
  const keys = await client.keys('rl:*');
  if (keys.length > 0) await client.del(...keys);
}

/** Force a tenant past its TTL without waiting for wall-clock time. */
export async function expireTenant(orgId) {
  await withTenant(orgId, async (tx) => {
    await tx.query(`UPDATE tenant SET expires_at = now() - interval '1 second' WHERE id = $1`, [
      orgId,
    ]);
  });
}

/**
 * An escape hatch for ASSERTIONS ONLY.
 *
 * Some tests need to see across the boundary to prove that something is not
 * there — "the other tenant's row still exists" is only checkable from outside
 * both tenants. This uses the admin connection, never the application role, and
 * it is never used by anything under src/.
 */
export async function adminQuery(text, values) {
  const { Client } = await import('pg');
  const client = new Client({ connectionString: process.env.DATABASE_ADMIN_URL });
  await client.connect();
  try {
    return await client.query(text, values);
  } finally {
    await client.end();
  }
}

export { pool, withTenant };
