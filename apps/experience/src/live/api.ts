/**
 * The control plane, as this surface calls it.
 *
 * Every function here hits a real endpoint that P1 and P2 built. There is no
 * mock layer, no fixture path, and no "demo mode" that fabricates a response —
 * when the control plane is unreachable these reject, and the caller shows the
 * degraded state rather than inventing a success.
 *
 * SAME ORIGIN BY DEFAULT. In production the Worker and the tunnel sit behind one
 * Cloudflare origin, so the browser needs no base URL and no CORS. `VITE_API_BASE`
 * overrides it for local development against the Compose stack, which is the only
 * case where the two are not on one host.
 */
import type { LiveEvent } from '@contract';

export function apiBase(): string {
  /*
   * Build-time config first, then a runtime override.
   *
   * `__API_BASE__` exists so the verification harness can point a PRODUCTION
   * build at a local control plane without rebuilding it — the code path under
   * test is then exactly the shipped one, and only the origin differs. A build
   * that had to be recompiled to be testable would be a different artifact from
   * the one that ships.
   */
  const runtime = (globalThis as { __API_BASE__?: string }).__API_BASE__;
  const configured = runtime ?? (import.meta.env['VITE_API_BASE'] as string | undefined);
  return (configured ?? '').replace(/\/$/, '');
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit & { key?: string }): Promise<T> {
  const headers = new Headers(init?.headers);
  if (init?.key) headers.set('authorization', `Bearer ${init.key}`);
  if (init?.body) headers.set('content-type', 'application/json');

  const response = await fetch(`${apiBase()}${path}`, { ...init, headers });
  const text = await response.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    /* a non-JSON body from a proxy or an edge error page */
  }

  if (!response.ok) {
    const error = (body as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiError(
      response.status,
      error?.code ?? `http.${response.status}`,
      error?.message ?? `The control plane returned ${response.status}.`,
    );
  }
  return body as T;
}

/* ---- tenant lifecycle ---------------------------------------------- */

export type Provisioned = {
  tenant: {
    id: string;
    publicRef: string;
    label: string;
    status: string;
    createdAt: string;
    expiresAt: string;
    ttlSeconds: number;
  };
  credential: { apiKey: string; note: string };
  seededRecords: number;
  correlationId: string;
  disclosure: { plane: string; statement: string };
};

export const provision = (label: string) =>
  request<Provisioned>('/v1/tenants', { method: 'POST', body: JSON.stringify({ label }) });

export type TenantSelf = {
  tenant: {
    id: string;
    publicRef: string;
    status: string;
    expiresAt: string;
    expiresInSeconds: number;
  };
  records: number;
  budget: { tokensLimit: number; tokensUsed: number; tokensRemaining: number; exhausted: boolean };
  isolation: { layers: Array<{ name: string; mechanism: string; detail: string }> };
};

export const me = (key: string) => request<TenantSelf>('/v1/tenants/me', { key });

export type DemoRecord = {
  id: string;
  kind: string;
  title: string;
  body: Record<string, unknown>;
  created_at: string;
};

export const listRecords = (key: string) =>
  request<{ records: DemoRecord[] }>('/v1/records', { key });

export const readRecord = (key: string, id: string) =>
  request<{ record: DemoRecord }>(`/v1/records/${id}`, { key });

/* ---- demonstration 1: isolation ------------------------------------ */

export type Inspection = {
  outcome: 'denied' | 'allowed';
  attempt: { effectiveOrgId: string; orgIdSource: string; sql: string; parameters: string[] };
  layers: {
    orgScope: { name: string; mechanism: string; refused: boolean };
    rowLevelSecurity: { name: string; mechanism: string; refused: boolean };
  };
  policy: {
    table: string;
    rlsEnabled: boolean;
    rlsForced: boolean;
    policies: Array<{ policyname: string; cmd: string; qual: string | null }>;
  };
  queryPlan: unknown;
  branch: { file: string; condition: string; statusCode: number; code: string };
  disclosure: { productionParity: string; statusCodeChoice: string };
};

export const inspectIsolation = (key: string, recordId: string) =>
  request<Inspection>(`/v1/demos/isolation/inspect/${recordId}`, { key });

/* ---- demonstration 2: payments -------------------------------------- */

export type Activation = {
  outcome: 'activated' | 'replayed';
  decidedHere: boolean;
  activation: {
    id: string;
    idempotency_key: string;
    activated_via: string;
    replay_count: number;
    amount_minor: number;
    currency: string;
  };
  mechanism: { authority: string; statement: string; why: string };
};

/**
 * The client-verify path.
 *
 * The webhook path needs an HMAC over the raw body, and the secret is a SERVER
 * secret — putting it in a browser bundle would be handing every visitor the
 * ability to forge a signed webhook, which would make the signature
 * verification the station demonstrates completely meaningless. So the browser
 * uses the client path, which is the other half of the same dual-path
 * activation and is exactly how a real checkout return behaves.
 */
export const verifyPayment = (key: string, idempotencyKey: string) =>
  request<Activation>('/v1/demos/payments/verify', {
    method: 'POST',
    key,
    body: JSON.stringify({
      idempotencyKey,
      subscriptionRef: 'sub_demo',
      amountMinor: 4900,
      currency: 'GBP',
    }),
  });

export const openIdempotencyKey = (key: string, idempotencyKey: string) =>
  request<{
    activation: Activation['activation'];
    cache: { present: boolean; ttlSeconds: number | null };
    mechanism: { authority: string; statement: string; why: string; redisRole: string };
  }>(`/v1/demos/payments/keys/${encodeURIComponent(idempotencyKey)}`, { key });

/* ---- demonstration 3: fraud ----------------------------------------- */

export type Evidence = {
  outcome: 'accepted' | 'rejected-duplicate';
  digest: string;
  submission?: { id: string; duplicate_attempts: number };
  collidedWith?: { id: string; duplicate_attempts: number; submitted_at: string };
  mechanism: { algorithm: string; authority: string; storage: string; why: string };
};

export const submitEvidence = (key: string, label: string, imageBase64: string) =>
  request<Evidence>('/v1/demos/fraud/evidence', {
    method: 'POST',
    key,
    body: JSON.stringify({ label, imageBase64 }),
  });

/* ---- demonstration 4: AI cost --------------------------------------- */

export type AskResult = {
  route: 'data-plane' | 'model-plane';
  question: string;
  answer: string;
  tokensCharged: number;
  estimatedTokens: number;
  intent: { id: string; description: string; sql: string } | null;
  budget: {
    tokensLimit: number;
    tokensUsed: number;
    tokensRemaining: number;
    exhausted: boolean;
  } | null;
  modelPlane: { attempted: boolean; provider: string; available: boolean; reason: string | null };
  costNote: string;
};

export const ask = (key: string, question: string) =>
  request<AskResult>('/v1/demos/ai/ask', {
    method: 'POST',
    key,
    body: JSON.stringify({ question }),
  });

/* ---- demonstration 5: limits ---------------------------------------- */

export type HammerResult = {
  accepted: boolean;
  limit: { max: number; window: string; keyedBy: string; store: string };
  layers: Array<{ name: string; position: string; note: string }>;
};

export const hammer = (key: string) =>
  request<HammerResult>('/v1/demos/limits/hammer', { method: 'POST', key });

/* ---- the take-away (A14) -------------------------------------------- */

export const issueReceipt = (key: string) =>
  request<{
    receiptUrl: string;
    note: string;
    emailDelivery: { available: boolean; note: string };
  }>('/v1/receipt', { method: 'POST', key });

export const listAudit = (key: string) =>
  request<{ events: LiveEvent[]; note: string }>('/v1/audit', { key });

/* ---- the arrival beat's numbers (A6) -------------------------------- */

export type EdgeReading = {
  /** Cloudflare colo code, or null when the edge did not say. Never guessed. */
  pop: string | null;
  /** Real measured round-trip in ms to the edge. Always a measurement. */
  rttMs: number;
  /** Whether the PoP came from Cloudflare or is genuinely unknown. */
  source: 'cloudflare-edge' | 'origin-unknown';
};

/**
 * A6, binding: the arrival beat is served from the EDGE, not the VM.
 *
 * `/cdn-cgi/trace` is Cloudflare's own endpoint on any proxied hostname, so
 * this resolves the visitor's actual PoP and a real round-trip time without the
 * control plane being involved at all. That is what lets §2.2's first proof
 * survive the live plane being down — the site really does render its own
 * request, and it can still do it when the VM cannot answer.
 *
 * The RTT is always a real measurement. The PoP is null when the endpoint is
 * absent (local development, or a non-Cloudflare host) and the copy says
 * "unknown" rather than inventing a location.
 */
export async function readEdge(): Promise<EdgeReading> {
  const started = performance.now();
  try {
    const response = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
    const rttMs = Math.round(performance.now() - started);
    if (!response.ok) return { pop: null, rttMs, source: 'origin-unknown' };
    const text = await response.text();
    const colo = /^colo=(.+)$/m.exec(text)?.[1]?.trim() ?? null;
    return colo
      ? { pop: colo, rttMs, source: 'cloudflare-edge' }
      : { pop: null, rttMs, source: 'origin-unknown' };
  } catch {
    // Still a real measurement of a real failed round trip.
    return { pop: null, rttMs: Math.round(performance.now() - started), source: 'origin-unknown' };
  }
}
