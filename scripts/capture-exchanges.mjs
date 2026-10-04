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
 *
 * CONFORMANCE MODE (S16) — what makes the recording more than a claim.
 *   node scripts/capture-exchanges.mjs --check --out <file>
 * captures a fresh set from a running API exactly as above, writes it to
 * <file> (CI keeps it as an artifact), and does NOT touch the committed
 * recording. It compares the two by behaviour — statuses, outcomes, the route
 * taken, the policy that refused, the audit rows written — never by timings,
 * ids or timestamps, which differ on every run by construction. Any
 * behavioural difference fails the run: the committed recording no longer
 * describes the code. It then tampers with a copy of the committed recording
 * (the isolation refusal turned into a success) and requires that to fail
 * too, so the comparison is proven non-vacuous on every run.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { execSync } from 'node:child_process';

const BASE = (process.env.LIVE_API ?? 'http://127.0.0.1:8080').replace(/\/$/, '');
const COMMITTED = resolve('apps/experience/src/live/recorded-exchanges.json');
const argv = process.argv.slice(2);
const CHECK = argv.includes('--check');
const outArg = argv.indexOf('--out');
const OUT = outArg >= 0 ? resolve(argv[outArg + 1]) : COMMITTED;
if (CHECK && OUT === COMMITTED) {
  console.error(
    'capture-exchanges: --check needs --out <file>; it never overwrites the recording.',
  );
  process.exit(1);
}
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
    process.env.CAPTURE_ENVIRONMENT ??
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

mkdirSync(dirname(OUT), { recursive: true });
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

if (CHECK) {
  const committed = JSON.parse(readFileSync(COMMITTED, 'utf8'));
  const diff = differences(behaviour(committed), behaviour(set));
  if (diff.length) {
    console.error(
      `capture-exchanges: FAILED — the committed recording no longer matches the system (${diff.length}):`,
    );
    for (const d of diff) console.error(`  ✗ ${d}`);
    process.exit(1);
  }
  // Negative control: a recording that claims the boundary let the read through.
  const tampered = structuredClone(committed);
  tampered.demos.isolation.exchanges.attempt.status = 200;
  if (differences(behaviour(tampered), behaviour(set)).length === 0) {
    console.error('capture-exchanges: FAILED — a tampered recording passed the comparison.');
    process.exit(1);
  }
  console.log(
    'capture-exchanges: CONFORMS — the committed recording matches a fresh capture by behaviour ' +
      'across all five demonstrations; a tampered copy was caught.',
  );
}

/** What a recording says the system DID — nothing that varies run to run. */
function behaviour(r) {
  const d = r.demos;
  const audit = (rows) => rows.map((e) => `${e.action}:${e.outcome}`).sort();
  const iso = d.isolation.exchanges;
  const policy = iso.inspect.body?.policy?.policies?.[0] ?? {};
  const pay = d.payments.exchanges;
  const ai = d.ai.exchanges;
  return {
    'isolation.attempt.status': iso.attempt.status,
    'isolation.attempt.code': iso.attempt.body?.error?.code,
    'isolation.inspect.status': iso.inspect.status,
    'isolation.inspect.outcome': iso.inspect.body?.outcome,
    'isolation.layer.scope.refused': iso.inspect.body?.layers?.orgScope?.refused,
    'isolation.layer.rls.refused': iso.inspect.body?.layers?.rowLevelSecurity?.refused,
    'isolation.policy': `${policy.policyname} USING ${policy.qual}`,
    'isolation.rls.forced': iso.inspect.body?.policy?.rlsForced,
    'isolation.audit': audit(d.isolation.audit),
    'limits.statuses': d.limits.exchanges.map((e) => e.status),
    'limits.audit': audit(d.limits.audit),
    'payments.statuses': [pay.first.status, pay.second.status].sort(),
    'payments.outcomes': [pay.first.body?.outcome, pay.second.body?.outcome].sort(),
    'payments.replays': pay.key.body?.activation?.replay_count,
    'payments.statement': pay.key.body?.mechanism?.statement,
    'payments.audit': audit(d.payments.audit),
    'fraud.statuses': [d.fraud.exchanges.first.status, d.fraud.exchanges.second.status],
    'fraud.outcomes': [
      d.fraud.exchanges.first.body?.outcome,
      d.fraud.exchanges.second.body?.outcome,
    ],
    'fraud.digest': d.fraud.exchanges.second.body?.digest,
    'fraud.audit': audit(d.fraud.audit),
    'ai.operational.route': ai.operational.body?.route,
    'ai.operational.tokens': ai.operational.body?.tokensCharged,
    'ai.operational.intent': ai.operational.body?.intent?.id,
    'ai.creative.route': ai.creative.body?.route,
    'ai.creative.charged': (ai.creative.body?.tokensCharged ?? 0) > 0,
    'ai.audit': audit(d.ai.audit),
  };
}

function differences(expected, actual) {
  return Object.keys(expected)
    .filter((k) => JSON.stringify(expected[k]) !== JSON.stringify(actual[k]))
    .map(
      (k) =>
        `${k}: recorded ${JSON.stringify(expected[k])}, system now ${JSON.stringify(actual[k])}`,
    );
}
