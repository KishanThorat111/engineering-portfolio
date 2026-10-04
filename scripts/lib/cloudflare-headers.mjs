/**
 * `_headers`, applied the way Cloudflare ACTUALLY applies it.
 *
 * Shared by scripts/render-verify.mjs (the local browser harness) and
 * scripts/policy-check.mjs (the CI gate), so the two cannot model the platform
 * differently. Extracted unchanged from render-verify in S16.
 *
 * WHY THIS IS NOT THE OBVIOUS IMPLEMENTATION (B-202). It once `set` each
 * header, so a later rule replaced an earlier one and /live/ appeared to
 * receive only its own policy. Cloudflare does not do that: every matching
 * rule ACCUMULATES, repeated names are joined with a comma, and `! Header` is
 * the only way to drop an inherited one. /live/ really received two
 * Content-Security-Policy headers, and a browser enforces the INTERSECTION of
 * every policy it is given — so nothing on the live surface could connect,
 * while the harness reported 35/35 green (3cf7754, 17 Aug 2026).
 *
 * Verified against the installed wrangler's own bundle: UNSET_OPERATOR = "! ",
 * each rule compiles to { set, unset }, and same-name values within a rule are
 * joined with `, `.
 */

/** Parses `_headers` text into rules: { pattern, headers: [name, value][], unset: name[] }. */
export function parseHeaders(text) {
  const rules = [];
  let current = null;
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd();
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: [], unset: [] };
      rules.push(current);
      continue;
    }
    const trimmed = line.trim();
    if (!current) continue;
    // `! Header` — the unset operator, matching wrangler's UNSET_OPERATOR.
    if (trimmed.startsWith('! ')) {
      current.unset.push(trimmed.slice(2).trim().toLowerCase());
      continue;
    }
    const index = trimmed.indexOf(':');
    if (index > 0) {
      current.headers.push([
        trimmed.slice(0, index).trim().toLowerCase(),
        trimmed.slice(index + 1).trim(),
      ]);
    }
  }
  return rules;
}

const matches = (pattern, pathname) =>
  pattern.endsWith('/*') ? pathname.startsWith(pattern.slice(0, -1)) : pattern === pathname;

/** Returns pathname → { header: value } with every matching rule accumulated, in file order. */
export function composer(text) {
  const rules = parseHeaders(text);
  return (pathname) => {
    const applied = new Map();
    for (const rule of rules) {
      if (!matches(rule.pattern, pathname)) continue;
      // Unset first, then set — the order each compiled rule is applied in.
      for (const name of rule.unset) applied.delete(name);
      for (const [name, value] of rule.headers) {
        const existing = applied.get(name);
        applied.set(name, existing ? `${existing}, ${value}` : value);
      }
    }
    return Object.fromEntries(applied);
  };
}
