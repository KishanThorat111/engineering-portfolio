/**
 * PRODUCTION DEPENDENCY AUDIT, WITH CHECKED EXCEPTIONS.
 *
 * This is `npm audit --omit=dev --audit-level=high`, and it stays exactly that
 * strict: any high or critical advisory in the production tree fails the build.
 *
 * The one addition is a list of exceptions (scripts/audit-exceptions.json) for
 * advisories that cannot be fixed yet AND cannot be reached. An exception is
 * not an ignore: every run re-verifies each condition that makes it harmless,
 * and the build fails as soon as any of them stops holding —
 *
 *   - a patched version of the package is published   (so: upgrade now)
 *   - any other production package starts depending on it
 *   - the code path it lives on becomes reachable    (remote images enabled)
 *   - the review date passes                           (someone must look again)
 *   - the advisory's version range is one this script cannot read (fail closed)
 *
 * Added on the owner's decision, 3 Oct 2026 (docs/PHASE_LOG.md, S8).
 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const SEVERE = new Set(['high', 'critical']);
const { exceptions } = JSON.parse(readFileSync('scripts/audit-exceptions.json', 'utf8'));

function run(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 64 << 20,
    });
  } catch (error) {
    // npm audit exits non-zero when it finds anything; the report is still on stdout.
    if (error.stdout) return error.stdout;
    throw error;
  }
}

/** Compare dotted versions numerically; prerelease tags are not expected here. */
function cmp(a, b) {
  const x = a.split('.').map(Number);
  const y = b.split('.').map(Number);
  for (let i = 0; i < 3; i += 1) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) - (y[i] ?? 0);
  return 0;
}

/** True if `version` is inside a range of the form "<=X.Y.Z" or "<X.Y.Z". Null if unreadable. */
function inRange(version, range) {
  const m = /^(<=|<)\s*(\d+\.\d+\.\d+)$/.exec(range.trim());
  if (!m) return null;
  return m[1] === '<=' ? cmp(version, m[2]) <= 0 : cmp(version, m[2]) < 0;
}

const report = JSON.parse(run('npm audit --omit=dev --json'));
const vulns = report.vulnerabilities ?? {};
const today = new Date().toISOString().slice(0, 10);

const failures = [];
const accepted = [];
const excusedPackages = new Set();

// 1. Every severe advisory object, wherever it sits in the tree.
for (const [name, v] of Object.entries(vulns)) {
  for (const via of v.via ?? []) {
    if (typeof via !== 'object' || !SEVERE.has(via.severity)) continue;
    const id = (via.url ?? '').split('/').pop();
    const ex = exceptions.find((e) => e.advisory === id && e.package === via.name);
    if (!ex) {
      failures.push(`${via.name}: ${via.title} (${via.url})`);
      continue;
    }

    const problems = [];
    if (today > ex.reviewBy) problems.push(`review date ${ex.reviewBy} has passed`);

    if (ex.requires?.noPatchedVersionPublished) {
      const latest = run(`npm view ${via.name} version`).trim();
      const stillVulnerable = inRange(latest, via.range);
      if (stillVulnerable === null) problems.push(`cannot read advisory range "${via.range}"`);
      else if (!stillVulnerable)
        problems.push(`a patched version exists (${latest}) — upgrade instead`);
    }

    if (ex.requires?.astroConfigHasNoRemoteImages) {
      const config = readFileSync('apps/static/astro.config.mjs', 'utf8');
      if (/remotePatterns|domains\s*:/.test(config)) {
        problems.push('astro.config now allows remote images, which reaches the vulnerable code');
      }
    }

    if (problems.length)
      failures.push(`${via.name} (${id}) exception no longer holds: ${problems.join('; ')}`);
    else {
      accepted.push(`${via.name} ${id}`);
      excusedPackages.add(name);
    }
  }
}

// 2. Packages flagged only because they depend on an excused package must be
//    exactly the dependents the exception names — a new one fails the build.
for (const [name, v] of Object.entries(vulns)) {
  if (!SEVERE.has(v.severity) || excusedPackages.has(name)) continue;
  const objects = (v.via ?? []).filter((x) => typeof x === 'object');
  if (objects.length) continue; // already judged in step 1
  const via = (v.via ?? []).filter((x) => typeof x === 'string');
  const allowed = via.every((dep) => {
    const ex = exceptions.find((e) => e.package === dep);
    return excusedPackages.has(dep) && ex?.reachedOnlyVia.includes(name);
  });
  if (!allowed)
    failures.push(
      `${name} depends on a vulnerable package (${via.join(', ')}) by an unexcused path`,
    );
}

for (const line of accepted)
  console.log(`audit-check: ACCEPTED (conditions re-verified) — ${line}`);
if (failures.length) {
  console.error(`audit-check: FAIL — ${failures.length} high/critical issue(s):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('audit-check: OK — no unexcused high or critical advisory in production dependencies.');
