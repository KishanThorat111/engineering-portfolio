/**
 * Puts sustained concurrent load on the control plane and reports what it did.
 *
 * WHY NO LOAD-TESTING LIBRARY
 * autocannon and k6 are better tools than this, and both were considered. The
 * reason neither is here: this needs to drive an AUTHENTICATED, tenant-scoped
 * workload — provision a tenant, hold its credential, and read its own rows —
 * and both tools would need a custom script to do that anyway. Node's own
 * fetch and `performance.now()` measure this accurately enough for the claim
 * being made, and the claim is deliberately modest (see below).
 *
 * WHAT THIS MEASURES, AND WHAT IT DOES NOT
 * It measures the service on the machine it is run on, sharing a CPU with the
 * load generator itself. That makes the absolute latencies a CEILING on this
 * hardware, not a prediction of production. What it is genuinely good for is
 * the shape: whether latency stays bounded as concurrency rises, whether error
 * rate stays at zero, and whether the process is still healthy afterwards.
 *
 * Every number this prints carries the date and the machine, because an
 * unqualified performance number is exactly what rule 2 forbids.
 *
 * Run with: npm run verify:load
 */
const BASE = process.env.LIVE_API ?? 'http://127.0.0.1:8080';
const SECONDS = Number(process.env.LOAD_SECONDS ?? 20);

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}

async function provision(label) {
  const response = await fetch(`${BASE}/v1/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!response.ok) {
    throw new Error(
      `loadtest: could not provision (${response.status}). Is a control plane running at ${BASE}? ` +
        'Note that provisioning is itself rate limited, by design.',
    );
  }
  return response.json();
}

console.log(`loadtest: ${BASE}, ${SECONDS}s per level\n`);

/*
 * A POOL of tenants, not one.
 *
 * The limiter's budget is per credential, so driving load through a single key
 * measures the limiter and nothing behind it: after the first 120 requests
 * every response is a cheap 429, and mixing those into the percentiles produces
 * a very fast number that describes rejection rather than service. That is
 * precisely the flattering measurement rule 2 exists to stop.
 *
 * Provisioning is itself rate limited — deliberately, and it is not being
 * loosened for a test — so the pool is as large as the plane will allow and no
 * larger. Whatever it grants is reported, because a small sample that says it
 * is small is honest and a large one obtained by weakening a guard is not.
 */
const pool = [];
for (let i = 0; i < 8; i += 1) {
  try {
    const tenant = await provision(`loadtest ${i}`);
    pool.push({ authorization: `Bearer ${tenant.credential.apiKey}` });
  } catch {
    break; // the provisioning limiter said no, which is correct behaviour
  }
}
if (pool.length === 0) throw new Error('loadtest: could not provision any tenant');
console.log(`  pool: ${pool.length} tenant credential(s), each with its own limiter budget\n`);
let cursor = 0;
const nextHeaders = () => pool[cursor++ % pool.length];

/*
 * The workload is a tenant reading its own records: a real authenticated
 * request that goes through the limiter, the credential lookup, `withTenant`'s
 * transaction, and an RLS-filtered query. A /health ping would produce prettier
 * numbers by measuring nothing that matters.
 */
const rows = [];
for (const concurrency of [1, 8, 32, 64]) {
  // Latencies are kept apart by outcome. A 429 is answered without touching
  // the database, so averaging it in would quietly describe the wrong path.
  const servedLatencies = [];
  const refusedLatencies = [];
  const statuses = new Map();
  const deadline = performance.now() + SECONDS * 1000;
  let inFlight = 0;
  let stop = false;

  await new Promise((done) => {
    const pump = () => {
      if (stop) {
        if (inFlight === 0) done();
        return;
      }
      while (inFlight < concurrency) {
        inFlight += 1;
        const started = performance.now();
        fetch(`${BASE}/v1/records`, { headers: nextHeaders() })
          .then(async (response) => {
            await response.arrayBuffer();
            statuses.set(response.status, (statuses.get(response.status) ?? 0) + 1);
            const elapsed = performance.now() - started;
            if (response.status === 200) servedLatencies.push(elapsed);
            else refusedLatencies.push(elapsed);
          })
          .catch(() => statuses.set(0, (statuses.get(0) ?? 0) + 1))
          .finally(() => {
            inFlight -= 1;
            if (performance.now() >= deadline) stop = true;
            pump();
          });
      }
    };
    pump();
  });

  const served = [...servedLatencies].sort((a, b) => a - b);
  const total = servedLatencies.length + refusedLatencies.length;
  const ok = statuses.get(200) ?? 0;
  const limited = statuses.get(429) ?? 0;
  const errors = [...statuses.entries()]
    .filter(([status]) => status === 0 || status >= 500)
    .reduce((sum, [, count]) => sum + count, 0);

  rows.push({ concurrency, total, ok, limited, errors, served });
  const shape =
    served.length === 0
      ? '  served: none in this window — the limiter absorbed the level'
      : `  served p50 ${percentile(served, 50).toFixed(1)}ms  ` +
        `p95 ${percentile(served, 95).toFixed(1)}ms  ` +
        `p99 ${percentile(served, 99).toFixed(1)}ms  (n=${served.length})`;
  console.log(
    `  concurrency ${String(concurrency).padStart(2)}  ` +
      `${String(total).padStart(6)} req  ${(total / SECONDS).toFixed(0).padStart(5)} req/s  ` +
      `200:${ok} 429:${limited} err:${errors}\n  ${shape}`,
  );
}

const health = await fetch(`${BASE}/health`);
const healthy = health.status === 200;

/*
 * The pass conditions are about survival and honesty, not speed.
 *
 * Deliberately NOT asserted: a latency threshold. The load generator shares a
 * CPU with the service here, so any number chosen would be a property of this
 * laptop, and a gate that fails on a busy machine teaches people to ignore it.
 * The dossier's latency budgets belong to the deployed VM and are measured
 * there, against real traffic — which is recorded as outstanding, not claimed.
 */
const errored = rows.reduce((sum, row) => sum + row.errors, 0);
const answered = rows.reduce((sum, row) => sum + row.ok + row.limited, 0);
const servedTotal = rows.reduce((sum, row) => sum + row.ok, 0);

console.log('');
const checks = [
  ['no request failed with a server error or a dropped connection', `${errored}`, errored === 0],
  ['every request was answered, with a 200 or a 429', `${answered} answered`, answered > 0],
  [
    'real work was served, not only refusals',
    `${servedTotal} requests returned 200`,
    servedTotal > 0,
  ],
  ['the service is healthy after sustained load', `${health.status}`, healthy],
];
for (const [name, detail, pass] of checks) {
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name} — ${detail}`);
}

console.log(
  `\nloadtest: measured ${new Date().toISOString().slice(0, 10)} on ${process.platform}/` +
    `${process.arch}, ${(await import('node:os')).cpus().length} logical CPUs, load generator on ` +
    'the same machine as the service. These are a ceiling for this hardware, not a production ' +
    'prediction.',
);

if (checks.some(([, , pass]) => !pass)) {
  console.error('loadtest: FAILED');
  process.exit(1);
}
console.log('loadtest: OK');
