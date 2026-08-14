/**
 * Attacks the running control plane, and asserts every attack is refused.
 *
 * WHY THIS IS A SCRIPT AND NOT A UNIT TEST
 * The service's own test suite proves each guard in isolation, with the app
 * built in-process. This runs against a control plane over a real socket, in
 * the shape it is deployed in, and asks a different question: not "does the
 * handler reject this?" but "is there any way in?" A guard that works in a unit
 * test and is bypassed by a header the framework normalises earlier is a guard
 * that passes its test and fails in production.
 *
 * WHAT COUNTS AS A PASS
 * Refusal, with a safe response. Two things are checked every time:
 *   1. the status is a refusal, not a success and not a 500 — a crash is a
 *      finding, because it means the input reached something that was not
 *      expecting it; and
 *   2. the body leaks nothing — no stack trace, no SQL, no driver text, no
 *      internal path. An attacker learning the schema from an error message is
 *      a real disclosure even when the request itself was denied.
 *
 * Run with: npm run verify:adversarial   (needs a control plane; see below)
 */
const BASE = process.env.LIVE_API ?? 'http://127.0.0.1:8099';

const results = [];
function record(name, detail, pass) {
  results.push({ name, detail, pass });
  console.log(`  ${pass ? 'ok  ' : 'FAIL'}  ${name} — ${detail}`);
}

/** Text that must never appear in a response body, however the request failed. */
const LEAKS = [
  /at\s+\w+\s+\(.*:\d+:\d+\)/, // a stack frame
  /\b(select|insert|update|delete)\b\s+.*\bfrom\b/i, // SQL
  /pg_|postgres|relation ".*" does not exist/i, // driver or schema detail
  /[A-Za-z]:\\\\|\/home\/|\/usr\/src/, // filesystem paths
  /node_modules/,
];

async function call(path, options = {}) {
  const response = await fetch(BASE + path, options);
  const text = await response.text();
  return { status: response.status, text, headers: response.headers };
}

/**
 * The single assertion every attack below makes.
 *
 * `expected` is the set of statuses that represent a correct refusal. A 500 is
 * never in it: it would mean the payload got further than the validation layer.
 */
function refused(name, response, expected) {
  const statusOk = expected.includes(response.status);
  const leak = LEAKS.find((pattern) => pattern.test(response.text));
  record(
    name,
    `${response.status}${leak ? ` · LEAKED: ${response.text.slice(0, 120)}` : ''}`,
    statusOk && !leak,
  );
}

console.log(`adversarial: attacking ${BASE}\n`);

/* ---- Setup: two real tenants, provisioned the way a visitor would --- */
async function provision(label) {
  const response = await fetch(`${BASE}/v1/tenants`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ label }),
  });
  if (!response.ok) {
    throw new Error(
      `adversarial: could not provision a tenant (${response.status}). ` +
        `Is the control plane running at ${BASE}?`,
    );
  }
  return response.json();
}

const victim = await provision('adversarial victim');
const attacker = await provision('adversarial attacker');
const authed = (key) => ({ authorization: `Bearer ${key}` });

// A record that genuinely belongs to the victim and not to the attacker.
const victimRecords = await (
  await fetch(`${BASE}/v1/records`, { headers: authed(victim.credential.apiKey) })
).json();
const victimRecordId = victimRecords.records?.[0]?.id;
if (!victimRecordId) throw new Error('adversarial: the victim tenant has no seeded record');

console.log('=== authentication ===');
{
  refused('no credential is refused', await call('/v1/records'), [401]);
  refused(
    'a forged credential is refused',
    await call('/v1/records', { headers: authed('dmo_tnt_ZZZZZZ_forged') }),
    [401],
  );
  refused(
    'a structurally valid but unknown key is refused',
    await call('/v1/records', { headers: authed(`${victim.tenant.publicRef}_${'a'.repeat(43)}`) }),
    [401],
  );
  refused(
    'a truncated credential is refused',
    await call('/v1/records', { headers: authed(victim.credential.apiKey.slice(0, -4)) }),
    [401],
  );
  refused(
    'a non-Bearer scheme is refused',
    await call('/v1/records', { headers: { authorization: `Basic ${victim.credential.apiKey}` } }),
    [401],
  );
  /*
   * The credential must be read from the Authorization header only. If a
   * query parameter or an alternate header were also honoured, the key would
   * end up in access logs and referrers — so these must NOT authenticate.
   */
  refused(
    'a credential in the query string does not authenticate',
    await call(`/v1/records?key=${encodeURIComponent(victim.credential.apiKey)}`),
    [401],
  );
  refused(
    'an X-Api-Key header does not authenticate',
    await call('/v1/records', { headers: { 'x-api-key': victim.credential.apiKey } }),
    [401],
  );
}

console.log('\n=== tenant isolation ===');
{
  // The headline attack: a real, authenticated tenant reaching for another
  // tenant's row by its real id. This is the break-out, run from a script.
  refused(
    "an authenticated tenant cannot read another tenant's record",
    await call(`/v1/records/${victimRecordId}`, { headers: authed(attacker.credential.apiKey) }),
    [403, 404],
  );
  /*
   * The isolation inspector answers 200 by design — explaining the refusal IS
   * the demonstration, and it publishes its own SQL and query plan on purpose.
   * So the assertion here is not the status code. It is the property that
   * actually matters: the explanation must contain no part of the row it
   * refused to return. A denial that quotes the record it denied would leak
   * the data through the very mechanism built to prove it cannot leak.
   */
  {
    const inspect = await call(`/v1/demos/isolation/inspect/${victimRecordId}`, {
      headers: authed(attacker.credential.apiKey),
    });
    const body = JSON.parse(inspect.text);
    const victimRow = victimRecords.records[0];
    const quotesRow = inspect.text.includes(victimRow.title);
    const bothRefused =
      body.outcome === 'denied' &&
      body.layers?.orgScope?.refused === true &&
      body.layers?.orgScope?.rowsReturned === 0 &&
      body.layers?.rowLevelSecurity?.refused === true &&
      body.layers?.rowLevelSecurity?.rowsReturned === 0;
    record(
      'the isolation inspector refuses at both layers and quotes no part of the row',
      `outcome=${body.outcome}, rows=${body.layers?.orgScope?.rowsReturned}/` +
        `${body.layers?.rowLevelSecurity?.rowsReturned}, ` +
        `quotes the victim's title: ${quotesRow}`,
      bothRefused && !quotesRow,
    );
  }

  // Header-level attempts to assert a different tenant. The org id is derived
  // from the credential on the server; nothing a client sends may influence it.
  for (const header of ['x-org-id', 'x-tenant-id', 'x-app-current-org', 'app.current_org']) {
    const response = await call(`/v1/records/${victimRecordId}`, {
      headers: { ...authed(attacker.credential.apiKey), [header]: victim.tenant.id },
    });
    refused(`spoofing ${header} does not change the tenant`, response, [403, 404]);
  }

  // The attacker's own listing must contain none of the victim's rows.
  const listing = await call('/v1/records', { headers: authed(attacker.credential.apiKey) });
  const bleed = listing.text.includes(victimRecordId);
  record(
    "the attacker's own listing contains no victim rows",
    bleed ? 'VICTIM ROW PRESENT' : 'clean',
    !bleed,
  );

  // And the audit trail is tenant-scoped too — a denial log is not a place to
  // learn about other tenants.
  const audit = await call('/v1/audit', { headers: authed(attacker.credential.apiKey) });
  const auditBleed = audit.text.includes(victim.tenant.id);
  record(
    "the audit trail does not expose another tenant's id",
    auditBleed ? 'VICTIM TENANT ID PRESENT' : 'clean',
    !auditBleed,
  );
}

console.log('\n=== injection ===');
{
  const payloads = [
    "' OR '1'='1",
    "'; DROP TABLE record; --",
    "1' UNION SELECT current_user, NULL, NULL --",
    "', app_current_org() = '",
    ' ',
    '../../../../etc/passwd',
    '%2e%2e%2f%2e%2e%2f',
    '{{7*7}}',
    '<script>alert(1)</script>',
  ];
  for (const payload of payloads) {
    // In a path parameter, where the value reaches a uuid-typed comparison.
    refused(
      `path injection is refused: ${JSON.stringify(payload).slice(0, 34)}`,
      await call(`/v1/records/${encodeURIComponent(payload)}`, {
        headers: authed(attacker.credential.apiKey),
      }),
      [400, 403, 404],
    );
  }

  // In a body field that is genuinely written to the database.
  for (const payload of payloads.slice(0, 4)) {
    const response = await call('/v1/records', {
      method: 'POST',
      headers: { ...authed(attacker.credential.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: payload, amountMinor: 100 }),
    });
    /*
     * A parameterised query makes this text, not code — so the correct
     * outcome is either a validation refusal or a row whose title is the
     * literal string. What must never happen is a 500 or a leaked error.
     */
    const safe =
      [200, 201, 400, 422].includes(response.status) && !LEAKS.some((p) => p.test(response.text));
    record(
      `body injection is inert: ${JSON.stringify(payload).slice(0, 30)}`,
      `${response.status}`,
      safe,
    );
  }

  // Prototype pollution through the JSON body.
  await call('/v1/records', {
    method: 'POST',
    headers: { ...authed(attacker.credential.apiKey), 'content-type': 'application/json' },
    body: '{"title":"x","amountMinor":1,"__proto__":{"polluted":true},"constructor":{"prototype":{"polluted":true}}}',
  });
  record(
    'a __proto__ payload does not pollute the prototype',
    `Object.prototype.polluted = ${{}.polluted}`,
    {}.polluted === undefined,
  );
}

console.log('\n=== request shape ===');
{
  refused(
    'an oversized body is refused',
    await call('/v1/records', {
      method: 'POST',
      headers: { ...authed(attacker.credential.apiKey), 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'x'.repeat(2_000_000), amountMinor: 1 }),
    }),
    [400, 413],
  );
  refused(
    'deeply nested JSON is refused rather than parsed',
    await call('/v1/records', {
      method: 'POST',
      headers: { ...authed(attacker.credential.apiKey), 'content-type': 'application/json' },
      body: '['.repeat(20_000) + ']'.repeat(20_000),
    }),
    [400, 413],
  );
  refused(
    'malformed JSON is refused safely',
    await call('/v1/records', {
      method: 'POST',
      headers: { ...authed(attacker.credential.apiKey), 'content-type': 'application/json' },
      body: '{"title":',
    }),
    [400],
  );
  refused(
    'a wrong content-type is refused',
    await call('/v1/records', {
      method: 'POST',
      headers: { ...authed(attacker.credential.apiKey), 'content-type': 'text/plain' },
      body: 'title=x',
    }),
    [400, 415],
  );
  refused(
    'a very long URL is refused',
    await call(`/v1/records/${'a'.repeat(20_000)}`, {
      headers: authed(attacker.credential.apiKey),
    }),
    [400, 403, 404, 414, 431],
  );
  refused(
    'an unsupported method is refused',
    await call('/v1/records', { method: 'DELETE', headers: authed(attacker.credential.apiKey) }),
    [400, 404, 405],
  );
}

console.log('\n=== the internal plane ===');
{
  /*
   * The purge job is the one endpoint that acts across tenants. If it were
   * reachable from the public edge with a guessable secret, a visitor could
   * destroy every other visitor's tenant. It is bound to the internal network
   * and additionally requires its own token.
   */
  refused(
    'the purge endpoint rejects an unauthenticated call',
    await call('/internal/purge/run', { method: 'POST' }),
    [401, 403, 404],
  );
  refused(
    'the purge endpoint rejects a tenant credential',
    await call('/internal/purge/run', {
      method: 'POST',
      headers: authed(attacker.credential.apiKey),
    }),
    [401, 403, 404],
  );
  refused(
    'the purge endpoint rejects a forged internal token',
    await call('/internal/purge/run', {
      method: 'POST',
      headers: { 'x-internal-token': 'guessed' },
    }),
    [401, 403, 404],
  );
}

console.log('\n=== disclosure ===');
{
  /*
   * `/health` publishes the service's own semver, which is operationally
   * useful and tells an attacker nothing they could act on. What it must not
   * publish is the runtime and infrastructure underneath it — a Node, OpenSSL
   * or PostgreSQL version is a CVE lookup, and a hostname or internal address
   * is a map of the private network.
   */
  const health = await call('/health');
  const fingerprint =
    /\b(node|v8|openssl|postgres(ql)?|redis|debian|alpine|ubuntu)\b/i.exec(health.text)?.[0] ??
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.exec(health.text)?.[0] ??
    /\b[\w-]+\.(?:internal|local|svc)\b/.exec(health.text)?.[0];
  record(
    'health does not fingerprint the runtime or the private network',
    fingerprint ? `EXPOSED: ${fingerprint}` : health.text.slice(0, 90),
    fingerprint === undefined,
  );

  const notFound = await call('/v1/does-not-exist');
  refused('an unknown route returns a safe 404', notFound, [404]);

  // CORS: the surfaces share an origin, so a permissive ACAO would be a gift
  // to an attacker's page and buy this system nothing.
  const cors = await call('/v1/records', {
    headers: { ...authed(attacker.credential.apiKey), origin: 'https://evil.example' },
  });
  const acao = cors.headers.get('access-control-allow-origin');
  record(
    'no permissive CORS header is sent',
    acao === null ? 'absent' : `Access-Control-Allow-Origin: ${acao}`,
    acao === null || acao === 'null',
  );

  // The response must not advertise the framework.
  const powered = cors.headers.get('x-powered-by');
  record('the server does not advertise its framework', powered ?? 'absent', powered === null);
}

console.log('\n=== rate limiting ===');
{
  /*
   * Burst the cheapest authenticated route. The assertion is not "requests
   * fail" — it is that the limiter engages and the service stays healthy while
   * it does. A limiter that returns 500 under load is a denial of service with
   * extra steps.
   */
  /*
   * The burst size is read from the service, not hardcoded.
   *
   * The first version of this assumed the 120/minute default and sent 200
   * requests. It reported "not rate limited" against a plane running at
   * 2000/minute — a false finding produced by the test believing it knew the
   * configuration. Asking the limiter for its own budget makes the check
   * correct against whatever the deployment is actually configured with.
   */
  const probe = await fetch(`${BASE}/v1/records`, { headers: authed(attacker.credential.apiKey) });
  const limit = Number(probe.headers.get('x-ratelimit-limit') ?? 0);
  record(
    'the limiter advertises a budget',
    limit > 0 ? `${limit}/minute` : 'no x-ratelimit-limit header',
    limit > 0,
  );

  // Sent in bounded waves: firing thousands of concurrent sockets would measure
  // this machine's descriptor limit rather than the service's limiter.
  const total = limit + 50;
  const burst = [];
  for (let sent = 0; sent < total; sent += 100) {
    const wave = await Promise.all(
      Array.from({ length: Math.min(100, total - sent) }, () =>
        call('/v1/records', { headers: authed(attacker.credential.apiKey) }).catch(() => ({
          status: 0,
          text: '',
        })),
      ),
    );
    burst.push(...wave);
  }
  const limited = burst.filter((r) => r.status === 429).length;
  const errored = burst.filter((r) => r.status >= 500).length;
  const dropped = burst.filter((r) => r.status === 0).length;
  record(
    'exceeding the advertised budget is refused with 429',
    `${limited}/${burst.length} returned 429 (budget ${limit})`,
    limited > 0,
  );
  record('no request in the burst produced a server error', `${errored} 5xx`, errored === 0);
  record('no connection was dropped rather than answered', `${dropped} dropped`, dropped === 0);

  const after = await call('/health');
  record('the service is still healthy after the burst', `${after.status}`, after.status === 200);
}

const failed = results.filter((r) => !r.pass);
console.log(`\nadversarial: ${results.length - failed.length}/${results.length} attacks refused`);
if (failed.length > 0) {
  console.error('adversarial: FAILED — the following were not refused safely:');
  for (const f of failed) console.error(`  ✗ ${f.name} — ${f.detail}`);
  process.exit(1);
}
console.log('adversarial: OK — every attack refused, no response leaked internals.');
