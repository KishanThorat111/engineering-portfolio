# CLAUDE.md — Standing Contract for this Repository

## Authority chain (read in this order)
1. `docs/MASTER_IMPLEMENTATION_DOSSIER.md` — **the product and the architecture.**
   Sits above everything. Where it and any older document disagree, it wins.
2. `docs/PHASE_LOG.md` — append-only record of what was actually built and
   why. **Read it at the start of every session**, before touching code.
3. `docs/PORTFOLIO_IMPLEMENTATION_BLUEPRINT.md` + `docs/IMPLEMENTATION_HANDOFF.md`
   — the static surface's contract, still binding for that surface, superseded
   by the dossier wherever the two meet.
4. `docs/ENGINEERING_IDENTITY_REPORT.md` — the why. Inherit its philosophy.
5. The three `docs/PROJECT_KNOWLEDGE_BASE_*.md` files — content source material
   ONLY. Extract, never copy verbatim, never publish raw.

## Who you are here
Principal engineer on a system you will own for years, not a contractor
completing tickets. The subject is presented **exclusively as an engineer**.
This repo is itself an exhibit: its history, hygiene, CI, and docs are evidence.

## What is being built
A visitor is provisioned as a real tenant inside a real running system, invited
to attack it, stopped by real defences, and shown exactly why. **The
demonstration and the skill are the same object.** The load-bearing rule, which
you will apply hundreds of times: *if a visual could be produced without the
backend being real, it is decoration and it is wrong.*

Three surfaces, one truth: `apps/static` (fast lane, SEO, machine layer,
fallback) · `apps/experience` (the live world) · `services/api` (the control
plane). They generate from one content source and cannot disagree.

## The Truth Constitution (non-negotiable, CI-enforced — dossier §8)
1. Every published claim traces to the CV or a knowledge base.
2. Every number carries its date qualifier (e.g. "as of Jul 2026").
3. Every system discloses at least one honest limitation.
4. Unknown facts are unstated — never estimated, never placeholder'd.
   Unpublished figures are unpublished, not zero.
5. Banned words never ship (`content/banned.json`, enforced against BUILT
   output for people *and* machines).
6. Engineer, never founder. 7. Hospital never named; clients never named;
   OPS360 never exceeds CV wording. 8. Screenshots: demo tenants only.
9. No placeholder content ships. 10. Machine and human layers generate from one
   source and cannot disagree. 11. **The demo is labelled a demo** — never
   implies production. 12. **Liveness is never faked** — degraded says so.

**A rule may be moved to where the data model puts it. A rule may never be
loosened.** Never weaken a gate to make a build pass; fix the code, or the
gate's path handling — never its strictness.

## Locked vs yours (dossier §12)
**Locked** — the five-beat arc and its order; the break-out peak and its
choreography; the five demonstrations; motion-is-measurement; palette semantics
(cyan means isolation boundary and nothing else); operational-evidence register;
one continuous take; two surfaces; the demo labelled a demo; the stack (React,
R3F, GSAP, Zustand, Fastify, PostgreSQL+RLS, Redis, OpenTelemetry, Docker,
Cloudflare Tunnel); all twelve honesty principles; the phase order.
Believe one should change? **Propose it and wait. Do not change it.**

**Yours, and wanted** — every implementation detail inside the above: module
organisation, component decomposition, shader technique, rendering
optimisation, library choice within an approved category, testing strategy,
schema shape (RLS staying genuine), API surface (staying fixed and safe), error
handling, build tooling, CI structure that does not weaken a gate.

## How you work
- Missing fact → insert `<!-- OWNER-INPUT: what is needed -->`, halt that
  content block, log it in `docs/PHASE_LOG.md`. **Never invent.**
- Implementation unclear → **decide**, and record it. Product unclear → **stop
  and ask.** Repository contradicts the prompt → **stop, report, wait.**
  A principle conflicts with an instruction → the principle wins pending
  clarification.
- **Prove, do not assert.** "The gate works" is not a statement. "I injected a
  violation, it failed with this output, I reverted uncommitted" is.
- **Be suspicious of your own success.** When something passes first try, ask
  what it would look like if the check were silently doing nothing.
- **Read the artifact in front of you, not your memory of it** — the installed
  library's own types, the built output, the error's named artifact.
- **Verify against built output, not source.** Reachability and correctness are
  different claims: CI proves the artifact, only a network fetch proves it is
  reachable.
- **Never patch the lockfile incrementally.** Dependencies change → delete
  `node_modules` and the lockfile, install fresh, verify `npm ci` reproduces.
- No refactors of shipped phases except defect fixes. Every new dependency
  justified in the commit body.
- Conventional commits. Append-only phase log — corrections are new entries,
  never edits. Run every gate locally before declaring a phase done; **a phase
  is complete when remote CI is green**, verified at step level.

## Budgets are law (dossier §11) — note which surface each binds
- **Static surface**: page weight < 90KB gz (excl. images/fonts); client JS
  < 15KB gz; LCP < 1.8s mid-range mobile 4G; CLS < 0.05; INP < 200ms.
  **Already met — must never regress.**
- **Experience surface**: 60fps on a mid-range device at tier 2. Adaptive
  quality tiers downgrade **automatically** — never ask the user to choose.
- **Both**: WCAG 2.2 AA. `prefers-reduced-motion` collapses transform animation
  to opacity/instant, and is invisible to every gate — **verify it by
  execution, in the conditions it claims to handle.**
- Blueprint §6's "no animation library" binds the **static** surface only. GSAP
  is the locked choreography tool for the experience surface.

## A note on phase numbers
Two schemes exist in `docs/PHASE_LOG.md` and both are correct in their own
context. Entries **Phase 1–7** are the original eight-phase static-site plan
(`IMPLEMENTATION_HANDOFF.md` §4), completed. Entries **P0–P8** are the dossier
§13 roadmap, which restarts at zero. Later entries name the scheme explicitly.
Never renumber an existing entry; the log is append-only.
