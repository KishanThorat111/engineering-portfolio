/**
 * Presence — non-identifying by construction.
 *
 * §2.3 needs the visitor to see that other people are genuinely here. The
 * binding constraint is that a visitor must never be able to correlate with
 * another visitor's session, and that this must hold because the identifying
 * data was never collected — not because it was collected and withheld.
 *
 * WHAT IS STORED, IN FULL
 *   presence:global   a ZSET whose members are 128-bit random strings generated
 *                     at connection time, scored by last-heartbeat epoch ms.
 *   presence:<orgId>  a key with a short TTL, set when that tenant acts. Its
 *                     existence means "active in the last few seconds".
 *
 * That is the entire dataset. No address, no user agent, no cookie, no session
 * id that outlives the socket, no join time, no geography, no link between the
 * ephemeral member and the tenant. The ephemeral id is created in memory when
 * the socket opens, is never written to a log or an audit row, and is
 * unrecoverable once the socket closes. There is nothing to subpoena and
 * nothing to correlate, because the correlating column does not exist.
 *
 * WHY A ZSET AND NOT A COUNTER
 * A counter needs a decrement on disconnect, and a decrement that does not run
 * — a killed process, a dropped TCP connection — leaks the count upward
 * forever, so the world would report people who are not there. That is faked
 * liveness by accident, which principle 12 forbids as firmly as faking it on
 * purpose. A ZSET scored by heartbeat expires stale members by time, so the
 * count self-corrects and can only ever be too LOW for a few seconds, never too
 * high.
 */
import { randomBytes } from 'node:crypto';
import { KEY, redis } from '../redis/client.js';

/** How long a member survives without a heartbeat before it stops counting. */
const PRESENCE_TTL_MS = 30_000;

/** How long a tenant reads as "active" after it last did something. */
const ACTIVITY_TTL_SECONDS = 8;

/**
 * An ephemeral, unlinkable identifier for one socket.
 *
 * Random rather than derived. Deriving it from anything — the address, the
 * tenant, a hash of either — would make two connections from the same origin
 * collide or correlate, which is the property being designed out.
 */
export function newEphemeralId(): string {
  return randomBytes(16).toString('base64url');
}

export async function join(ephemeralId: string): Promise<void> {
  const client = redis();
  await client.zadd(KEY.presence('global'), Date.now(), ephemeralId);
}

/** Called on the heartbeat. Also prunes, so pruning costs no separate timer. */
export async function heartbeat(ephemeralId: string): Promise<void> {
  const client = redis();
  const now = Date.now();
  await client.zadd(KEY.presence('global'), now, ephemeralId);
  await client.zremrangebyscore(KEY.presence('global'), 0, now - PRESENCE_TTL_MS);
}

export async function leave(ephemeralId: string): Promise<void> {
  try {
    await redis().zrem(KEY.presence('global'), ephemeralId);
  } catch {
    // The heartbeat expiry is the backstop. A failed removal costs at most
    // PRESENCE_TTL_MS of an overcount, which the ZSET corrects on its own.
  }
}

export type PresenceSnapshot = {
  /** Live sockets, counted honestly. */
  connections: number;
  /**
   * Whether the count is trustworthy right now. False when Redis is
   * unreachable, in which case `connections` is 0 and means "unknown" — the
   * caller must not render 0 as "nobody is here".
   */
  measured: boolean;
  windowSeconds: number;
};

export async function snapshot(): Promise<PresenceSnapshot> {
  try {
    const client = redis();
    const now = Date.now();
    await client.zremrangebyscore(KEY.presence('global'), 0, now - PRESENCE_TTL_MS);
    const connections = await client.zcard(KEY.presence('global'));
    return { connections, measured: true, windowSeconds: PRESENCE_TTL_MS / 1000 };
  } catch {
    return { connections: 0, measured: false, windowSeconds: PRESENCE_TTL_MS / 1000 };
  }
}

/** Mark a tenant as having just done something. Used to light its volume. */
export async function markTenantActive(orgId: string): Promise<void> {
  try {
    await redis().set(KEY.presence(orgId), '1', 'EX', ACTIVITY_TTL_SECONDS);
  } catch {
    // Activity is decoration on top of the event itself, which already went out
    // over the socket. Losing the marker loses a highlight, not a fact.
  }
}

export async function isTenantActive(orgId: string): Promise<boolean> {
  try {
    return (await redis().exists(KEY.presence(orgId))) === 1;
  } catch {
    return false;
  }
}
