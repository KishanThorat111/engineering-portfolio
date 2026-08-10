/**
 * The health contract later phases depend on.
 *
 * PRINCIPLE 12 IS THE WHOLE DESIGN HERE. §6.3 has the experience fall back to
 * recorded real traces when the live plane is down, and say so. That only works
 * if the backend tells the truth about being down. So:
 *
 *   /health        liveness. The process is running. No dependency checks, so
 *                  it cannot be made to fail by a slow database — that is what
 *                  makes it usable as a container healthcheck.
 *   /health/ready  readiness. Actually touches Postgres and Redis. Returns 503
 *                  with a per-dependency breakdown when anything is down.
 *
 * There is deliberately no third state that reports "healthy" while a
 * dependency is unreachable. A control plane that cannot reach its database
 * cannot provision, cannot purge, and cannot audit, and reporting otherwise
 * would hand the experience a green light to fake liveness with.
 *
 * P1 stops at the contract. The frontend's degraded mode is P5's.
 */
import type { FastifyPluginAsync } from 'fastify';
import { pool } from '../db/pool.js';
import { redisHealthy } from '../redis/client.js';

type DependencyState = { ok: boolean; latencyMs: number | null; error: string | null };

async function timed(check: () => Promise<boolean>): Promise<DependencyState> {
  const started = performance.now();
  try {
    const ok = await check();
    return { ok, latencyMs: Math.round(performance.now() - started), error: null };
  } catch (error) {
    return {
      ok: false,
      latencyMs: Math.round(performance.now() - started),
      // The reason is useful and the detail is not: a driver message can
      // disclose host names and credentials.
      error: (error as Error).name || 'unavailable',
    };
  }
}

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async () => ({
    status: 'live',
    service: 'control-plane-api',
    version: process.env['APP_VERSION'] ?? '0.0.0-dev',
    time: new Date().toISOString(),
  }));

  app.get('/health/ready', async (_request, reply) => {
    const [postgres, redis] = await Promise.all([
      timed(async () => {
        const { rows } = await pool.query('SELECT 1 AS ok');
        return rows[0]?.ok === 1;
      }),
      timed(redisHealthy),
    ]);

    /*
     * The live spine counts. §6.3 has the experience fall back to recorded
     * traces when the live plane is down, and a gateway whose PostgreSQL
     * listener is disconnected is not delivering events — reporting "ready"
     * while nothing fans out would be exactly the silent-degradation failure
     * principle 12 forbids.
     */
    const spine = app.hasDecorator('liveSpine')
      ? {
          listenerConnected: app.liveSpine.listenerConnected(),
          connections: app.liveSpine.connectionCount(),
        }
      : { listenerConnected: false, connections: 0 };

    const ready = postgres.ok && redis.ok && spine.listenerConnected;

    // 503 when not ready. Cloudflare, Caddy, Compose healthchecks, and the
    // future experience all read the status code, not the body.
    return reply.status(ready ? 200 : 503).send({
      status: ready ? 'ready' : 'degraded',
      service: 'control-plane-api',
      version: process.env['APP_VERSION'] ?? '0.0.0-dev',
      time: new Date().toISOString(),
      dependencies: {
        postgres,
        redis,
        liveSpine: {
          ok: spine.listenerConnected,
          latencyMs: null,
          error: spine.listenerConnected ? null : 'listener disconnected',
        },
      },
      live: {
        listenerConnected: spine.listenerConnected,
        connections: spine.connections,
      },
      // Stated explicitly so a consumer never has to infer it. §6.3 and A5:
      // when this is false the experience plays recorded real traces and says
      // it is doing so.
      livePlaneAvailable: ready,
    });
  });
};
