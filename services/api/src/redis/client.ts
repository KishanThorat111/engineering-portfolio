/**
 * Redis, and the key namespace every later phase will extend.
 *
 * P1 uses Redis for one thing that ships (rate-limit counters, via
 * @fastify/rate-limit) and establishes the shape for the things that do not
 * ship yet — idempotency keys, presence, and pub/sub fanout. The namespace is
 * declared here rather than invented per feature so P2 and P3 do not each pick
 * their own convention and collide in a shared keyspace.
 */
import { Redis } from 'ioredis';
import { env } from '../config/env.js';

export const KEY = {
  /** Fastify's own limiter. Cloudflare's edge limiter sits in front (A13). */
  rateLimit: (bucket: string) => `rl:${bucket}`,
  /**
   * P2. Reserved now so the payments demonstration cannot invent a second
   * convention: an idempotency key is scoped to its tenant, because two
   * tenants replaying the same webhook id are two different facts.
   */
  idempotency: (orgId: string, key: string) => `idem:${orgId}:${key}`,
  /** P3. Presence is per-tenant and carries no visitor identity by design. */
  presence: (orgId: string) => `presence:${orgId}`,
  /** P3. One channel; subscribers filter. */
  events: () => 'events:fanout',
  /** P2. The global model spend ceiling that makes A11 a state, not an error. */
  modelBudgetDay: (day: string) => `budget:model:${day}`,
} as const;

let client: Redis | null = null;

export function redis(): Redis {
  if (client) return client;
  client = new Redis(env.REDIS_URL, {
    // Fail fast and surface it. A control plane that silently queues commands
    // against a dead Redis reports itself healthy while doing nothing, which is
    // the dishonest-liveness failure mode principle 12 exists to prevent.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    lazyConnect: false,
  });
  client.on('error', () => {
    // Handled by the readiness probe; an unhandled 'error' event would take the
    // process down on a transient blip.
  });
  return client;
}

/**
 * Wait for the socket to be usable.
 *
 * `enableOfflineQueue: false` is the right steady-state posture — a command
 * issued at a dead Redis should fail rather than queue silently — but it also
 * means commands issued during the initial connect fail instantly with "Stream
 * isn't writeable". Boot has to wait for readiness explicitly rather than
 * assume it.
 *
 * Returns false rather than throwing on timeout. A Redis that is down must not
 * stop the API from starting, because a started API can serve /health/ready and
 * tell the truth about being degraded, and a process that refused to boot tells
 * nobody anything.
 */
export async function connectRedis(timeoutMs = 5_000): Promise<boolean> {
  const c = redis();
  if (c.status === 'ready') return true;
  return new Promise<boolean>((resolve) => {
    const done = (ok: boolean) => {
      clearTimeout(timer);
      c.off('ready', onReady);
      c.off('error', onError);
      resolve(ok);
    };
    const onReady = () => done(true);
    const onError = () => {
      /* keep waiting until the timeout — ioredis retries on its own */
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    c.once('ready', onReady);
    c.on('error', onError);
  });
}

export async function redisHealthy(): Promise<boolean> {
  try {
    const reply = await redis().ping();
    return reply === 'PONG';
  } catch {
    return false;
  }
}

export async function closeRedis(): Promise<void> {
  if (!client) return;
  await client.quit().catch(() => client?.disconnect());
  client = null;
}
