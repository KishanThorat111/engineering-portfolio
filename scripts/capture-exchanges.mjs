/**
 * Captures the RECORDED set for /live/: the five demonstrations, run for real
 * against a running control plane, written down exactly as the system answered.
 *
 * WHY THIS EXISTS
 * When the control plane cannot be reached, /live/ still lets a visitor walk
 * through every demonstration — but only with exchanges the system actually
 * produced. This script is the only way that file is made. It runs the same
 * calls the page makes, in the same order, and stores each request, the
 * response status and body, the time the round trip took as measured here,
 * and the audit rows the database wrote while it happened. Nothing is typed
 * in by hand, and the page labels every one of these as recorded, with the
 * date and the environment below.
 *
 * Credentials are redacted before writing: the captured tenants are
 * throwaway, but a key in a public file is still a key.
 *
 * usage:
 *   npm run stack:up
 *   LIVE_API=http://127.0.0.1:8080 node scripts/capture-exchanges.mjs
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const BASE = (process.env.LIVE_API ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const OUT = resolve('apps/experience/src/live/recorded-exchanges.json');
const EVIDENCE_BYTES = 'a2lzaGFuLXRob3JhdC1kZW1vLWV2aWRlbmNlLXBob3Rv';
const OPERATIONAL = 'How many records do I have?';
const CREATIVE = 'Write a haiku about hospital logistics';

const keys = new Set();
const redact = (value) => {
  let text = JSON.stringify(value);
  for (const key of keys) text = text.split(key).join('[redacted key]');
  return JSON.parse(text);
};

/** One real exchange, timed the way the page times it. */
async function call(method, path, { key, body } = {}) {
  const headers = {};
  if (key) headers.authorization = `Bearer ${key}`;
  if (body) headers['content-type'] = 'application/json';
  const started = performance.now();
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  const ms = Math.round((performance.now() - started) * 10) / 10;
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text.slice(0, 200) };
  }
  const retryAfter = response.headers.get('retry-after');
  return {
    request: { method, path, body: body ?? null },
    status: response.status,
    ms,
    at: new Date().toISOString(),
    ...(retryAfter ? { retryAfter } : {}),
    body: parsed,
  };
}

async function provision(label) {
  const exchange = await call('POST', '/v1/tenants', { body: { label } });
  if (exchange.status !== 201 && exchange.status !== 200) {
    throw new Error(`provisioning returned ${exchange.status}`);
  }
  keys.add(exchange.body.credential.apiKey);
  return { exchange, key: exchange.body.credential.apiKey };
}

/** The audit rows this tenant's database wrote since `since`. */
async function auditSince(key, since) {
  const exchange = await call('GET', '/v1/audit', { key });
  const events = (exchange.body?.events ?? []).filter((e) => e.occurred_at >= since);
  return events.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
}

const ready = await call('GET', '/health/ready');
if (ready.status !== 200) {
  console.error(`capture-exchanges: the control plane at ${BASE} is not ready (${ready.status}).`);
  process.exit(1);
}

const visitor = await provision('visitor');
const self = visitor.key;
const demos = {};

/* 1 — isolation: another real tenant, its real record, a real refusal. */
{
  const since = new Date().toISOString();
  const neighbour = await provision('the other tenant');
  const list = await call('GET', '/v1/records', { key: neighbour.key });
  const target = list.body.records[0].id;
  const attempt = await call('GET', `/v1/records/${target}`, { key: self });
  const inspect = await call('GET', `/v1/demos/isolation/inspect/${target}`, { key: self });
  await new Promise((r) => setTimeout(r, 400));
  demos.isolation = {
    neighbourRef: neighbour.exchange.body.tenant.publicRef,
    target,
    exchanges: { neighbour: neighbour.exchange, list, attempt, inspect },
    audit: await auditSince(self, since),
  };
}

/* 2 — limits: twenty in a row, until it sheds. */
{
  const since = new Date().toISOString();
  const started = performance.now();
  const runs = [];
  for (let i = 0; i < 20; i += 1)
    runs.push(await call('POST', '/v1/demos/limits/hammer', { key: self }));
  const totalMs = Math.round(performance.now() - started);
  await new Promise((r) => setTimeout(r, 400));
  demos.limits = {
    totalMs,
    // Only the first accepted body and the first shed body are kept whole; the
    // other eighteen are the same shape, so their status and timing is what
    // matters and what is stored.
    exchanges: runs.map((run, i) =>
      i === runs.findIndex((r) => r.status === run.status) ? run : { ...run, body: null },
    ),
    audit: await auditSince(self, since),
  };
}

/* 3 — payments: the same activation, twice, at the same moment. */
{
  const since = new Date().toISOString();
  const idempotencyKey = `evt_${Math.random().toString(36).slice(2, 10)}`;
  const body = { idempotencyKey, subscriptionRef: 'sub_demo', amountMinor: 4900, currency: 'GBP' };
  const [a, b] = await Promise.all([
    call('POST', '/v1/demos/payments/verify', { key: self, body }),
    call('POST', '/v1/demos/payments/verify', { key: self, body }),
  ]);
  const key = await call('GET', `/v1/demos/payments/keys/${idempotencyKey}`, { key: self });
  await new Promise((r) => setTimeout(r, 400));
  demos.payments = {
    idempotencyKey,
    exchanges: { first: a, second: b, key },
    audit: await auditSince(self, since),
  };
}

/* 4 — fraud: the same evidence, twice. */
{
  const since = new Date().toISOString();
  const first = await call('POST', '/v1/demos/fraud/evidence', {
    key: self,
    body: { label: 'ward 3 clean', imageBase64: EVIDENCE_BYTES },
  });
  const second = await call('POST', '/v1/demos/fraud/evidence', {
    key: self,
    body: { label: 'a different job', imageBase64: EVIDENCE_BYTES },
  });
  await new Promise((r) => setTimeout(r, 400));
  demos.fraud = { exchanges: { first, second }, audit: await auditSince(self, since) };
}

/* 5 — AI routing: one question the data answers, one it cannot. */
{
  const since = new Date().toISOString();
  const operational = await call('POST', '/v1/demos/ai/ask', {
    key: self,
    body: { question: OPERATIONAL },
  });
  const creative = await call('POST', '/v1/demos/ai/ask', {
    key: self,
    body: { question: CREATIVE },
  });
  await new Promise((r) => setTimeout(r, 400));
  demos.ai = { exchanges: { operational, creative }, audit: await auditSince(self, since) };
}

let commit = 'unknown';
try {
  commit = execSync('git rev-parse --short HEAD').toString().trim();
} catch {
  /* not a git checkout */
}

const set = redact({
  capturedAt: new Date().toISOString(),
  environment:
    'the production-shaped stack (infra/compose.yml with the loopback override), run locally',
  apiVersion: ready.body?.version ?? 'unknown',
  commit,
  timingNote:
    'Round trips were measured by the capturing client on the same machine as the stack, so ' +
    'they carry no internet distance. They are real, and they are not what a visitor would see.',
  visitor: {
    publicRef: visitor.exchange.body.tenant.publicRef,
    ttlSeconds: visitor.exchange.body.tenant.ttlSeconds,
    seededRecords: visitor.exchange.body.seededRecords,
  },
  demos,
});

writeFileSync(OUT, `${JSON.stringify(set, null, 2)}\n`);
const statuses = Object.fromEntries(
  Object.entries(demos).map(([name, demo]) => [
    name,
    Array.isArray(demo.exchanges)
      ? demo.exchanges.map((e) => e.status).join(',')
      : Object.values(demo.exchanges)
          .map((e) => e.status)
          .join(','),
  ]),
);
console.log(`capture-exchanges: wrote ${OUT}`);
console.log(statuses);
