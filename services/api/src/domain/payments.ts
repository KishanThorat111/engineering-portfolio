/**
 * Demonstration 2 — idempotent activation across two paths.
 *
 * §2.6: "Fire the webhook twice, simultaneously. Two packets race. One
 * activates, one no-ops. Open the idempotency key that decided it."
 *
 * THE RACE IS RESOLVED BY THE DATABASE, NOT BY THE APPLICATION.
 * The obvious implementation reads for an existing activation and inserts if it
 * finds none. Between that read and that write is where the duplicate charge
 * lives, and no amount of care in the application closes it. Here the unique
 * constraint on (tenant_id, idempotency_key) does the deciding, via
 * INSERT ... ON CONFLICT DO NOTHING: the loser gets zero rows back and knows it
 * lost, atomically, without ever having read.
 *
 * DUAL PATH. Menu's real flow can be activated by the provider's webhook or by
 * the client returning from checkout, and either may arrive first. Both call
 * this same function, so there is one activation rule rather than two that have
 * to be kept in agreement.
 *
 * Redis holds a short-lived marker for the same key. It is a fast path and a
 * demonstration surface, never the authority — if Redis and Postgres disagree,
 * Postgres is right, because Postgres is the one with the constraint.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Tx } from '../db/pool.js';
import { KEY, redis } from '../redis/client.js';
import { env } from '../config/env.js';

export type ActivationPath = 'webhook' | 'client';

export type ActivationOutcome = 'activated' | 'replayed';

export type Activation = {
  id: string;
  idempotency_key: string;
  activated_via: ActivationPath;
  subscription_ref: string;
  amount_minor: number;
  currency: string;
  activated_at: string;
  replay_count: number;
  last_replay_at: string | null;
  first_correlation: string;
};

export type ActivationResult = {
  outcome: ActivationOutcome;
  activation: Activation;
  /** True when THIS call performed the activation. Exactly one racer sees it. */
  decidedHere: boolean;
};

/**
 * Verify a webhook signature the way the real platform does.
 *
 * `timingSafeEqual` rather than `===`: a byte-by-byte comparison that exits
 * early leaks, through timing, how much of a forged signature was correct,
 * which is enough to construct a valid one given patience. Length is checked
 * first because timingSafeEqual throws on a length mismatch — and that check is
 * safe to do early, since the length of an HMAC is not a secret.
 */
export function verifyWebhookSignature(rawBody: string, presented: string | undefined): boolean {
  const secret = env.PAYMENT_WEBHOOK_SECRET;
  if (!secret || !presented) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(presented, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function signWebhookBody(rawBody: string, secret: string): string {
  return createHmac('sha256', secret).update(rawBody).digest('hex');
}

/**
 * Activate once, no matter how many times this is called.
 *
 * Returns `decidedHere: true` for exactly one caller per key, even when several
 * arrive in the same millisecond on different connections.
 */
export async function activate(
  tx: Tx,
  orgId: string,
  input: {
    idempotencyKey: string;
    via: ActivationPath;
    subscriptionRef: string;
    amountMinor: number;
    currency: string;
    correlationId: string;
  },
): Promise<ActivationResult> {
  const inserted = await tx.query<Activation>(
    `INSERT INTO payment_activation
       (tenant_id, idempotency_key, activated_via, subscription_ref,
        amount_minor, currency, first_correlation)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (tenant_id, idempotency_key) DO NOTHING
     RETURNING id, idempotency_key, activated_via, subscription_ref, amount_minor,
               currency, activated_at, replay_count, last_replay_at, first_correlation`,
    [
      orgId,
      input.idempotencyKey,
      input.via,
      input.subscriptionRef,
      input.amountMinor,
      input.currency,
      input.correlationId,
    ],
  );

  if (inserted.rows.length === 1) {
    const activation = inserted.rows[0] as Activation;
    // Best-effort marker for the fast path. Deliberately after the authoritative
    // write and deliberately not awaited into the outcome — a Redis failure must
    // not turn a successful activation into an error.
    void redis()
      .set(KEY.idempotency(orgId, input.idempotencyKey), activation.id, 'EX', 3600)
      .catch(() => undefined);
    return { outcome: 'activated', activation, decidedHere: true };
  }

  /*
   * We lost, which means somebody else activated. Record the replay ON the
   * winning row and return it. The count is the evidence that the second packet
   * arrived and did nothing — without it, "one no-ops" would be invisible.
   */
  const replayed = await tx.query<Activation>(
    `UPDATE payment_activation
        SET replay_count = replay_count + 1, last_replay_at = now()
      WHERE tenant_id = $1 AND idempotency_key = $2
      RETURNING id, idempotency_key, activated_via, subscription_ref, amount_minor,
                currency, activated_at, replay_count, last_replay_at, first_correlation`,
    [orgId, input.idempotencyKey],
  );

  const activation = replayed.rows[0];
  if (!activation) {
    // Only reachable if the winning row was deleted between the failed insert
    // and this update — a purge landing mid-race. Surfacing it is better than
    // inventing an activation that no longer exists.
    throw new Error('activation vanished between conflict and replay update');
  }
  return { outcome: 'replayed', activation, decidedHere: false };
}

export async function getActivation(
  tx: Tx,
  orgId: string,
  idempotencyKey: string,
): Promise<Activation | null> {
  const { rows } = await tx.query<Activation>(
    `SELECT id, idempotency_key, activated_via, subscription_ref, amount_minor, currency,
            activated_at, replay_count, last_replay_at, first_correlation
       FROM payment_activation
      WHERE tenant_id = $1 AND idempotency_key = $2`,
    [orgId, idempotencyKey],
  );
  return rows[0] ?? null;
}

export async function listActivations(tx: Tx, orgId: string, limit: number): Promise<Activation[]> {
  const { rows } = await tx.query<Activation>(
    `SELECT id, idempotency_key, activated_via, subscription_ref, amount_minor, currency,
            activated_at, replay_count, last_replay_at, first_correlation
       FROM payment_activation
      WHERE tenant_id = $1
      ORDER BY activated_at DESC
      LIMIT $2`,
    [orgId, limit],
  );
  return rows;
}

/** Whether Redis also knows this key — shown to make the two-tier design visible. */
export async function idempotencyCacheState(
  orgId: string,
  key: string,
): Promise<{ present: boolean; ttlSeconds: number | null }> {
  try {
    const client = redis();
    const value = await client.get(KEY.idempotency(orgId, key));
    if (value === null) return { present: false, ttlSeconds: null };
    const ttl = await client.ttl(KEY.idempotency(orgId, key));
    return { present: true, ttlSeconds: ttl >= 0 ? ttl : null };
  } catch {
    // Redis being down does not make the activation less decided.
    return { present: false, ttlSeconds: null };
  }
}
