# PHASE_LOG — append-only implementation record

Every phase ends by appending an entry here: what shipped, engineering decisions made inside
the blueprint boundaries, deviations (with reasons), and open `OWNER-INPUT` markers. Every
implementation session reads this file before touching code (`CLAUDE.md`). Entries are never
edited after the fact — corrections are new entries.

---

## Phase 1 — Foundation Live (Blueprint T1–T4) · 3 August 2026

### Shipped

- `CLAUDE.md` at the repo root, verbatim from `docs/IMPLEMENTATION_HANDOFF.md` §3.
- Scaffold: Astro + TypeScript strict, Prettier (+ astro plugin), MIT licence, README in an
  engineer's voice, `.editorconfig` + `.gitattributes` enforcing LF (Windows dev machine),
  `.nvmrc` pinning Node 22 for CI and Cloudflare Pages.
- Design tokens (`src/styles/tokens.css`, blueprint §5 values verbatim), self-hosted
  latin-subset variable fonts (Inter, JetBrains Mono) with OFL licences in `/public/fonts`,
  global styles with a site-wide reduced-motion collapse, prose styles.
- Layout shell: `BaseLayout` (meta slots), skip link, header with mobile disclosure nav
  (the site's only client JS — inlined, ≈0.4KB), footer with verified contact facts; styled
  404 with navigation recovery.
- Home hero: the locked §1 claim, sub-line, and four status chips. No placeholder anywhere.
- CI (`.github/workflows/ci.yml`): production dependency audit (high+), typecheck, build,
  banned-words copy gate against built HTML, internal link gate, HTML validation; Lighthouse
  CI warn-only until Phase 8. All gates also run locally via `npm run verify`.

### Verification record

- `npm run verify` green end to end (typecheck · build · copy gate · link gate · HTML
  validation); `npm audit` reports 0 vulnerabilities across the full tree.
- Copy gate proven, not assumed: banned words were injected into a page, the gate failed the
  build with file/line reporting, and the injection was reverted before commit.
- Budgets measured on built output: `index.html` 1.8KB gz + CSS 2.1KB gz (budget < 90KB gz);
  client JS ≈0.4KB inlined (budget < 15KB gz).
- Reduced motion: enforced by a global CSS collapse rule; no entrance animations exist yet
  (the motion utility is Phase 3 scope). Device-level verification rides with Phase 3's
  motion work and Phase 8's manual pass.
- Mobile nav: disclosure pattern (`aria-expanded`/`aria-controls`, Escape-to-close with
  focus return, resize reset) verified in the built output; interactive verification on a
  real device is part of the owner's first deploy check below.

### Engineering decisions inside the boundaries (Phase 5+ sessions: inherit these)

1. **Astro major 7.1.6, not the 5.x line named in the blueprint.** Every Astro release
   ≤ 7.0.9 — all of 5.x and 6.x — carries published high-severity advisories (XSS/SSRF
   classes); the fix exists only in ≥ 7.1.6. A public exhibit repo whose own flagship lesson
   is dependency-risk discipline cannot ship a failing `npm audit`. The stack decision
   (Astro + TypeScript strict + static-first + content collections) is unchanged.
2. **Dependency-audit CI gate added** (`npm audit --omit=dev --audit-level=high`) — the
   Electrical readiness-programme lesson applied to this repository itself.
3. **Navigation carries only live destinations.** Phase 1 header: GitHub, LinkedIn, Contact
   CTA. The five internal items (Systems · Experience · Engineering · About · CV) join the
   nav as their routes ship in Phases 3–6; the header GitHub/LinkedIn links are transitional
   and move to footer-only when internal items land. Constitution rule 9 (no placeholder
   ships) plus the CI link gate make this the only compliant shape.
4. **Fonts**: latin `wght` variable subsets copied verbatim from the pinned
   `@fontsource-variable` packages (kept as devDependencies as the provenance record); OFL
   licence files ship alongside in `/public/fonts`.
5. **Hero status chips are page-local markup.** The `EvidenceChip`/`StatusBadge` components
   proper are Phase 2 scope; Phase 3 should replace the hero's local chip styling when the
   Home page is assembled from collections.
6. `favicon.svg` is a minimal KT monogram placeholder-quality asset in the token palette;
   the proper monogram/favicon set is produced with the OG-image work (T17, blueprint §8.2).

### Deviations from the blueprint (as-executed, with reasons)

- Repository is `KishanThorat111/engineering-portfolio`, not `kishanthorat/portfolio`
  (handoff v1.1 as-executed amendment).
- The old Portfolio repository was made **private** rather than publicly archived (handoff
  v1.1). If it is ever re-publicized, it gets the archive-plus-honest-README treatment.
- Astro major version — decision 1 above.
- Deployment is prepared but not yet live: creating the Cloudflare Pages project requires
  the owner's Cloudflare account (OWNER-INPUT 2 below). Every other Definition-of-Done item
  for Phase 1 is met; "deployed URL serves the hero" completes with that one dashboard
  action, after which each push to `main` auto-deploys.

### OWNER-INPUT — open items

1. **Domain** — purchase `kishanthorat.dev` (+ `.com` if free) and add to Cloudflare.
   Phase 1 serves from the `*.pages.dev` URL; the domain is a hard launch blocker by
   Phase 8, not before.
2. **Cloudflare Pages project** (unblocks the live URL, ~5 minutes): Cloudflare dashboard →
   Workers & Pages → Create → Pages → Connect to Git → select
   `KishanThorat111/engineering-portfolio`, production branch `main` → build command
   `npm run build`, build output directory `dist` → Save and Deploy. No environment
   variables or secrets are required (Node version comes from `.nvmrc`). When the domain
   exists, bind it under the project's Custom domains tab.
3. **Headshot** — one owned, plain-background photo. Bites in Phase 3 (/about).
4. **Screenshots** — demo/staging tenants only, sanitized per blueprint §8.3. Bite in
   Phases 4–5.
5. **Lessons confirmation** — the two §4.5 entries. Bites in Phase 6; unblock by opening
   that session with "Lessons approved as drafted".
6. **GitHub profile rehabilitation** — unpin the six tutorial repositories, pin
   `engineering-portfolio`, and apply the profile README text below (any time before
   launch).

### Deliverable — GitHub profile README text (T2)

```markdown
Software engineer — I design, build, and operate production systems.

Three multi-tenant SaaS platforms, engineered and operated end-to-end as sole
engineer: one in daily use at a hospital, one live with subscription billing,
one pre-launch. Alongside: enterprise AI workflow automation for a UK client.

Portfolio: https://kishanthorat.dev — source at
[engineering-portfolio](https://github.com/KishanThorat111/engineering-portfolio),
where the commit history, CI truth gates, and planning documents are part of
the work.
```

### Next session

Phase 2 — The Constitution Becomes Code (T5–T6). Open with the Phase 2 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first.

---

## Phase 1 addendum — first CI incident, and a correction · 3 August 2026

Appended rather than edited into the entry above: this log is append-only, and the first
diagnosis recorded here was wrong. Both facts belong in the record.

### What happened

The Phase 1 push (`ff8571e`) failed CI immediately. Both jobs died at the first real step,
`npm ci`, before any gate ran. The gates were never the problem — nothing had reached them.

**First diagnosis — wrong.** `npm ci` under npm 10 reproduced an error locally, so the
failure was attributed to CI's Node 22 runners bundling npm 10 against an npm 11 lockfile.
Node 24 was pinned in `.nvmrc` (`6bc7b82`). CI failed again, identically. The pin fixed
nothing.

**Actual root cause.** `package-lock.json` was incomplete. It had been built up
incrementally — `npm install`, then `npm install astro@^7.1.6`, then `npm audit fix` — and
the resulting file never recorded the top-level `@emnapi/core` and `@emnapi/runtime`
entries that `@napi-rs/wasm-runtime` and `@img/sharp-wasm32` require. The strict installer
named exactly those two packages; that message was evidence about the lockfile, not about
the npm version, and it was misread the first time. Deleting `node_modules` and
`package-lock.json` and regenerating from `package.json` produced a complete tree
(`e977057`). Run `30828044611` is green: every step of both jobs succeeded, including
Lighthouse.

### Why local verification missed it

`npm run verify` passed on this machine throughout, because `node_modules` already held the
packages the lockfile failed to record. A clean install had nothing to fall back on. **Local
green proved the source was correct; it could not prove the lockfile was complete — only a
clean install from the lockfile alone can do that.** This is the same class of gap the
portfolio's own content publishes rather than hides: a documented mechanism that had never
actually been executed end to end.

### Standing rules from this incident (later phases: inherit)

1. **A phase is not done when local gates pass — it is done when remote CI passes.** Push,
   then verify the run's job and step conclusions before declaring completion or writing a
   Definition-of-Done claim.
2. **Never hand-edit or incrementally patch `package-lock.json` into a shipping state.**
   After any dependency change, regenerate from a deleted lockfile and confirm a clean
   install reproduces the tree.
3. **Read an installer's error as evidence about the artifact it names**, not about the
   nearest environmental difference. The environment difference (npm 10 vs 11) was real,
   visible, and causally irrelevant.

### Correction to the entry above

The Phase 1 entry's verification record stated the gates were verified locally. That was
true and remains true, but it was insufficient as a completion standard — remote CI was not
green when the entry was written. The Definition of Done is now met: run `30828044611` is
green on `e977057`. The Node 24 pin stays (active LTS, matches the development machine, and
Cloudflare Pages reads `.nvmrc`, so dev/CI/host share one runtime) — kept on its own merits,
credited with nothing.
