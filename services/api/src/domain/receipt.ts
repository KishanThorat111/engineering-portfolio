/**
 * The take-away — ruling A14, and §2.10.
 *
 * The visitor leaves with their session's audit log, the predicate that blocked
 * them, and a curl command that reproduces the isolation failure. The primary
 * carrier is a signed permalink; email is opt-in and never the default path.
 *
 * STATELESS BY DESIGN. The token carries the tenant id and an expiry and is
 * verified by HMAC, so there is no table to store, no row to purge, and — the
 * part that matters — a receipt keeps rendering after the tenant's data is
 * gone. Audit history deliberately survives the TTL purge (§2.8), and a receipt
 * that died with the tenant would destroy the take-away at the exact moment the
 * consequence beat makes the visitor want it.
 *
 * The token grants read access to one tenant's audit history and nothing else.
 * It cannot provision, write, or read records — which is why it is a separate
 * capability from the API key rather than a longer-lived version of it.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';

export type ReceiptClaims = { orgId: string; expiresAt: number };

function sign(payload: string, key: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

export function issueReceiptToken(orgId: string): string | null {
  const key = env.RECEIPT_SIGNING_KEY;
  if (!key) return null;
  const expiresAt = Math.floor(Date.now() / 1000) + env.RECEIPT_TTL_SECONDS;
  const payload = `${orgId}.${expiresAt}`;
  return `${payload}.${sign(payload, key)}`;
}

/**
 * Verify and decode. Returns null for anything that is not a valid, unexpired
 * token — no distinction between malformed, forged, and expired, because the
 * difference is only useful to someone probing.
 */
export function verifyReceiptToken(token: string): ReceiptClaims | null {
  const key = env.RECEIPT_SIGNING_KEY;
  if (!key) return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [orgId, expiryRaw, presented] = parts as [string, string, string];

  const payload = `${orgId}.${expiryRaw}`;
  const expected = sign(payload, key);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(presented, 'utf8');
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  const expiresAt = Number(expiryRaw);
  if (!Number.isSafeInteger(expiresAt) || expiresAt * 1000 <= Date.now()) return null;
  if (!/^[0-9a-f-]{36}$/i.test(orgId)) return null;

  return { orgId, expiresAt };
}
