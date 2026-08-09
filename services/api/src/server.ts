/**
 * The Fastify application.
 *
 * Exported as a factory so the test suite can build a real server and drive it
 * with `inject()` — the same routes, the same plugins, the same validation,
 * against a real database. Tests that mock the layer they are testing prove
 * only that the mock behaves as written.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import rateLimit from '@fastify/rate-limit';
import sensible from '@fastify/sensible';
import { env } from './config/env.js';
import { connectRedis, redis } from './redis/client.js';
import { authPlugin } from './plugins/auth.js';
import { errorsPlugin } from './plugins/errors.js';
import { healthRoutes } from './routes/health.js';
import { tenantRoutes } from './routes/tenants.js';
import { recordRoutes } from './routes/records.js';
import { auditRoutes } from './routes/audit.js';
import { adminRoutes } from './routes/admin.js';
import { normaliseCorrelationId } from './telemetry/correlation.js';

export async function buildServer(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      redact: {
        // A control plane that logs its own credentials has no credentials.
        paths: ['req.headers.authorization', 'req.headers["x-admin-token"]'],
        censor: '[redacted]',
      },
    },
    // Bounded request bodies. The default is 1MB; nothing this API accepts is
    // anywhere near that, and a public write endpoint should not be a place to
    // push megabytes.
    bodyLimit: env.MAX_BODY_BYTES,
    // Cloudflare terminates TLS and proxies, so the client address arrives in
    // X-Forwarded-For. Without this, every rate-limit bucket keys off the
    // tunnel's address and the limiter protects nothing.
    trustProxy: true,
    disableRequestLogging: false,
  });

  /*
   * One correlation id per request, assigned before anything else runs so that
   * even a body-limit rejection carries one. Echoed in a header so a visitor
   * holding a terminal can quote it back.
   */
  app.addHook('onRequest', async (request, reply) => {
    request.correlationId = normaliseCorrelationId(request.headers['x-correlation-id']);
    void reply.header('x-correlation-id', request.correlationId);
  });

  await app.register(sensible);
  await app.register(errorsPlugin);

  /*
   * Wait for Redis before the limiter registers. With the offline queue
   * disabled, a command issued mid-connect fails instantly rather than
   * queueing, so boot has to establish readiness rather than assume it.
   *
   * A failure here is not fatal on purpose — see connectRedis().
   */
  const redisReady = await connectRedis();
  if (!redisReady) {
    app.log.warn('redis not ready at boot; /health/ready will report degraded');
  }

  /*
   * Fastify's limiter, backed by Redis so it is shared across API replicas
   * rather than per-process.
   *
   * A13: this sits BEHIND Cloudflare's edge limiter, and does not replace it.
   * The edge one exists to keep floods off the VM entirely; this one exists
   * because the VM must not depend on the edge being configured correctly, and
   * because per-tenant limits are an application concept the edge cannot see.
   * Two layers, same reasoning as the two isolation layers.
   *
   * WHAT HAPPENS WHEN REDIS IS DOWN, AND WHY
   * `skipOnError` defaults to true, meaning the limiter fails OPEN. Kept, after
   * weighing it, for two reasons. A13 guarantees Cloudflare's limiter is in
   * front, so failing open here degrades from two layers to one rather than to
   * none. And failing closed would turn a Redis blip into a total outage of the
   * demo — which is the single-VM failure mode the risk register names as a
   * design constraint, where a dead demo argues against the claim it exists to
   * prove. /health/ready reports the degradation honestly either way.
   */
  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_GLOBAL_PER_MINUTE,
    timeWindow: '1 minute',
    redis: redis(),
    // Namespaced so the limiter cannot collide with the idempotency and
    // presence keyspaces P2 and P3 will add.
    nameSpace: 'rl:',
    // Prefer the tenant when there is one: a shared corporate NAT should not
    // let one visitor exhaust everyone else's budget.
    keyGenerator: (request) => request.tenant?.orgId ?? request.ip,
    addHeadersOnExceeding: { 'x-ratelimit-remaining': true },
    // Health must answer even while everything else is being throttled — it is
    // how the experience learns to degrade, and rate-limiting the truth-teller
    // would make the system least honest exactly when it is least healthy.
    allowList: (request) => request.url.startsWith('/health'),
  });

  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(tenantRoutes);
  await app.register(recordRoutes);
  await app.register(auditRoutes);
  await app.register(adminRoutes);

  return app;
}
