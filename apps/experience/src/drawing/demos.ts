/**
 * The five demonstrations as the drawing runs them — live, or recorded.
 *
 * LIVE calls the real control plane and times each round trip with
 * performance.now() in this browser; that number is what the drawing writes on
 * its dimension lines. RECORDED replays an exchange captured from a real run
 * (drawing/recorded.ts) at the interval it actually took, and every caller
 * labels it as recorded. There is no third path: nothing here invents a
 * response, a status or a duration.
 *
 * Calls go through `call()` rather than live/api.ts because the drawing needs
 * what api.ts deliberately discards on an error — the status, the body of a
 * 409, the Retry-After of a 429 — and the time each one took.
 */
import { apiBase } from '../live/api.ts';
import type * as api from '../live/api.ts';
import { RECORDED, type AuditRow, type Exchange } from './recorded.ts';
import { useDrawing } from './store.ts';

export type Outcome<T> = {
  status: number;
  ms: number;
  body: T;
  retryAfter: string | null;
  source: 'live' | 'recorded';
};

/** A real HTTP exchange, timed here. Network failure is status 0, never a guess. */
export async function call<T>(
  method: 'GET' | 'POST',
  path: string,
  key: string,
  body?: unknown,
): Promise<Outcome<T>> {
  const headers = new Headers({ authorization: `Bearer ${key}` });
  if (body !== undefined) headers.set('content-type', 'application/json');
  const started = performance.now();
  try {
    const response = await fetch(`${apiBase()}${path}`, {
      method,
      headers,
      body: body === undefined ? null : JSON.stringify(body),
      cache: 'no-store',
    });
    const text = await response.text();
    const ms = Math.round((performance.now() - started) * 10) / 10;
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = null;
    }
    return {
      status: response.status,
      ms,
      body: parsed as T,
      retryAfter: response.headers.get('retry-after'),
      source: 'live',
    };
  } catch {
    return {
      status: 0,
      ms: Math.round((performance.now() - started) * 10) / 10,
      body: null as T,
      retryAfter: null,
      source: 'live',
    };
  }
}

/** A recorded exchange, released after the time it really took. */
export async function replay<T>(exchange: Exchange<T>): Promise<Outcome<T>> {
  await wait(exchange.ms);
  return {
    status: exchange.status,
    ms: exchange.ms,
    body: exchange.body,
    retryAfter: exchange.retryAfter ?? null,
    source: 'recorded',
  };
}

export const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** The control plane did not answer, or answered with a server-side failure. */
export const unreachable = (o: { status: number }) => o.status === 0 || o.status >= 500;

/* --- revisions ----------------------------------------------------------- */

/**
 * Reads the tenant's audit log over HTTP and adds every row as a revision.
 * Used once when the tenant is ready, and after each action when the live
 * channel is down (PARTIAL), so revisions are still real rows — just read
 * rather than pushed.
 */
export async function syncAudit(key: string): Promise<void> {
  const result = await call<{ events: AuditRow[] }>('GET', '/v1/audit', key);
  if (result.status !== 200 || !result.body) return;
  const add = useDrawing.getState().addRevision;
  const rows = [...result.body.events].sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  for (const row of rows) {
    add({
      id: row.id,
      at: row.occurred_at,
      action: row.action,
      outcome: row.outcome,
      ms: row.duration_ms,
      via: 'http',
    });
  }
}

/** Releases a recorded demo's audit rows at the offsets they were written at. */
export async function replayAudit(rows: AuditRow[], startedAt: string): Promise<void> {
  const add = useDrawing.getState().addRevision;
  const origin = Date.parse(startedAt);
  let elapsed = 0;
  for (const row of rows) {
    const offset = Math.max(0, Date.parse(row.occurred_at) - origin);
    if (offset > elapsed) await wait(Math.min(offset - elapsed, 1_500));
    elapsed = offset;
    add({
      id: `recorded:${row.id}`,
      at: row.occurred_at,
      action: row.action,
      outcome: row.outcome,
      ms: row.duration_ms,
      via: 'recorded',
    });
  }
}

/** Start time of an exchange, from its arrival time and duration. */
export const startOf = (e: { at: string; ms: number }) =>
  new Date(Date.parse(e.at) - e.ms).toISOString();

/* --- per-demonstration shapes ------------------------------------------ */

export type IsolationTarget = { neighbourRef: string; target: string; records: number };

let neighbour: IsolationTarget | null = null;

/** Another REAL tenant and its real record — provisioned once per page. */
export async function isolationTarget(): Promise<IsolationTarget | null> {
  if (neighbour) return neighbour;
  const res = await fetch(`${apiBase()}/v1/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label: 'the other tenant' }),
  }).catch(() => null);
  if (!res || !res.ok) return null;
  const other = (await res.json()) as api.Provisioned;
  const list = await call<{ records: api.DemoRecord[] }>(
    'GET',
    '/v1/records',
    other.credential.apiKey,
  );
  const id = list.body?.records?.[0]?.id;
  if (!id) return null;
  neighbour = {
    neighbourRef: other.tenant.publicRef,
    target: id,
    records: list.body.records.length,
  };
  return neighbour;
}

export const recordedIsolation = {
  neighbourRef: RECORDED.demos.isolation.neighbourRef,
  target: RECORDED.demos.isolation.target,
  records: RECORDED.demos.isolation.exchanges.list.body.records.length,
};
