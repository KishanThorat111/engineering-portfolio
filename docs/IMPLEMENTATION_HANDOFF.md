# IMPLEMENTATION HANDOFF — PLANNING → CLAUDE CODE
**Project:** kishanthorat.dev — evidence-first engineering portfolio
**Version:** 1.0 · 3 August 2026 · **Planning is permanently closed after this document.**
**Authority chain:** `PORTFOLIO_IMPLEMENTATION_BLUEPRINT.md` (the contract) → `ENGINEERING_IDENTITY_REPORT.md` (the why) → three `PROJECT_KNOWLEDGE_BASE_*.md` files (content source only). This document adds no strategy; it transfers it.

---

## 1. Repository Strategy

**Verdict: a completely new repository. The existing portfolio repository is archived, not migrated.** Evaluated against the required criteria:

**Architecture compatibility — zero.** The existing repo is hand-assembled static HTML/CSS/JS with no build system, no type system, no components, no content model. The blueprint requires Astro 5 + TypeScript strict + Zod-validated content collections + CI truth gates. Not one file survives translation; "migration" would mean deleting 100% of the tree inside a repo whose history then preserves nothing but the deletion.

**Technical debt — disqualifying.** The old tree carries ~74MB of tutorial image assets, a third-party `.glb` model, 27 certificate scans, JavaScript that throws TypeErrors on every scroll, dead links, and content the ratified identity explicitly decommissions. Inheriting the tree means inheriting a cleanup project before the real project.

**Long-term maintainability & engineering quality — the history is content.** The blueprint makes the repository a public exhibit ("exhibit zero"): its commit history, CI configuration, and docs are part of the evidence. A fresh repo's first commit is the foundation of the new identity; the old repo's history is the 2025 template era. Those two stories must not share a git log.

**Migration complexity — trivially low, in the right direction.** Nothing moves except five planning documents into `/docs`. The only continuity obligations are external and already specified: the old Azure Static Web App becomes a 301 redirect at launch (Blueprint T19), and the old GitHub repo is **archived** with a one-line honest README ("Personal portfolio, 2024–2025. Superseded by github.com/KishanThorat111/portfolio"). Archiving, not deleting — the constitution favors honest history over erased history.

**Repository:** `KishanThorat111/portfolio` · public · MIT · default branch `main` · deploys to Cloudflare Pages on `kishanthorat.dev`.

---

## 2. The Inheritance Protocol (how two Fable instances stay one mind)

Claude Code sessions are fresh contexts. Philosophy transfer therefore runs through three repo-native mechanisms, established in Phase 1 and used by every phase after:

1. **`CLAUDE.md`** at the repo root — Claude Code reads it automatically at session start. It carries the standing role, the constitution, and the behavioral rules (§3 below). This is how every future session inherits the planning conversation without the planning conversation.
2. **`docs/PHASE_LOG.md`** — append-only. Every phase ends by recording: what shipped, notable engineering decisions made inside the boundaries, any deviations from the blueprint (with reasons), and open `OWNER-INPUT` markers. Each new session reads it before touching code. This is the project's memory between instances.
3. **`/docs`** — the five planning documents. The blueprint is cited by section (§) in every phase contract instead of being restated.

**Session protocol for the owner:** one phase per Claude Code session, in order. Open each session by pasting the phase contract from §4 verbatim. Do not proceed to phase N+1 until phase N's Definition of Done is verified and `PHASE_LOG.md` is updated. Never run phases in parallel.

---

## 3. CLAUDE.md — authored in Phase 1, verbatim content

```markdown
# CLAUDE.md — Standing Contract for this Repository

## Who you are here
You are the principal engineer implementing a ratified blueprint:
`docs/PORTFOLIO_IMPLEMENTATION_BLUEPRINT.md`. It is the contract — follow its
decisions. `docs/ENGINEERING_IDENTITY_REPORT.md` is the why — inherit its
philosophy. The three `docs/PROJECT_KNOWLEDGE_BASE_*.md` files are content
source material ONLY — extract, never copy verbatim, never publish raw.
This portfolio's subject is presented exclusively as an engineer. This repo is
itself an exhibit: its history, hygiene, CI, and docs are part of the evidence.

## The Truth Constitution (non-negotiable, CI-enforced)
1. Every published claim traces to the CV or a knowledge base.
2. Every number carries its date qualifier (e.g., "as of Jul 2026").
3. Every system page discloses at least one honest limitation.
4. Unknown facts are unstated — never estimated, never placeholder'd.
5. Banned words never ship (see scripts/copy-check + blueprint §3.4 and
   Ruling 1: founder/CEO/owner/startup/entrepreneur/passionate/etc.).
6. Engineer, never founder. 7. Hospital never named; clients never named;
   OPS360 content never exceeds CV wording. 8. Screenshots: demo tenants only,
   sanitized per blueprint §8.3. 9. No placeholder content ships.
10. Machine layer and human pages generate from one content source and
    cannot disagree.

## How you work
- Missing fact → insert `<!-- OWNER-INPUT: what is needed -->`, halt that
  content block, log it in docs/PHASE_LOG.md. Never invent.
- Challenge implementation decisions freely and improve maintainability,
  accessibility, and performance within blueprint boundaries. Never reopen
  strategy (paradigm, IA, positioning, stack, design direction are closed).
- No refactors of shipped phases except defect fixes. No new dependencies
  without a one-line justification in the commit body.
- Budgets are law: WCAG 2.2 AA; client JS < 15KB gz; page weight < 90KB gz
  (excl. images/fonts); LCP < 1.8s mid-range mobile; reduced-motion honored.
- Conventional commits. Run all CI gates locally before declaring any
  phase done. End every phase by appending to docs/PHASE_LOG.md.
- Read docs/PHASE_LOG.md at the start of every session.
```

---

## 4. Implementation Sequence — 8 phases

Eight phases, chosen so each ends at a state that is deployed, testable, and meaningful on its own: **Foundation Live → Constitution as Code → Human Fast Lane → Flagship Proof → System Suite → Narrative Layer → Machines & Discovery → Launch.** (Owner Phase 0 — domain, headshot, screenshots, lesson confirmation, GitHub cleanup — runs alongside per Blueprint §8.3 and is not a Claude Code session.) Blueprint task IDs T1–T20 map onto these phases exactly; no task is orphaned.

Each contract below is ready to paste as the opening message of its Claude Code session.

---

### PHASE 1 CONTRACT — Foundation Live (Blueprint T1–T4)

```
You are starting implementation of a fully planned project. Before writing
anything: read docs/PORTFOLIO_IMPLEMENTATION_BLUEPRINT.md end to end, then
docs/ENGINEERING_IDENTITY_REPORT.md §V and §IX. The five planning documents
are in ./docs (I have placed them there). Planning is closed; you are the
principal engineer executing it.

MISSION — by the end of this session, the foundation is LIVE: a real domain
serving a real hero, from a repository whose hygiene is itself evidence.

WHY THIS SHAPE — this repo is a public exhibit. Its first commits, CI
configuration, and README will be read by senior engineers as a work sample.
Treat repository setup with the same care as the site.

BUILD (blueprint T1–T4):
1. Author CLAUDE.md at the repo root with EXACTLY the content specified in
   docs/IMPLEMENTATION_HANDOFF.md §3, then follow it for the rest of this
   session and forever.
2. Scaffold: Astro 5 + TypeScript strict, Prettier, MIT license, README
   (intent, stack, run instructions — engineer's voice, no marketing).
3. Design tokens per blueprint §5 (tokens.css, self-hosted subset Inter +
   JetBrains Mono, font-display: swap), global + prose styles.
4. Layout shell: header/nav (desktop + mobile), footer, skip link,
   BaseLayout with meta slots; styled 404.
5. CI (GitHub Actions): build, typecheck, internal link check, HTML
   validation, and scripts/copy-check.mjs enforcing the banned-word lists
   from blueprint Ruling 1 + §3.4 against BUILT HTML. Lighthouse CI
   included but warn-only until Phase 8.
6. Deploy to Cloudflare Pages on kishanthorat.dev with the real Home hero:
   the locked claim + sub-line + status chips from blueprint §1 — no
   placeholder anywhere.
7. Create docs/PHASE_LOG.md and write the Phase 1 entry.

BOUNDARIES — do not build content collections, components beyond the shell,
or any page beyond the hero and 404; those are later phases.

DONE WHEN — domain serves the hero on mobile and desktop; mobile nav works;
prefers-reduced-motion verified; CI green including the copy gate; commit
history is clean conventional commits; PHASE_LOG entry written.
```

---

### PHASE 2 CONTRACT — The Constitution Becomes Code (T5–T6)

```
Read CLAUDE.md and docs/PHASE_LOG.md, then blueprint §4.0, §5, §7.1. Phase 1
is live; do not rework it.

MISSION — make it structurally impossible to ship a page that violates the
Truth Constitution, and build the complete component vocabulary of the site.

WHY — this project's differentiator is enforced honesty. Encoding the rules
as schema and CI is more credible than promising them; the schemas ARE
content for the engineers who read this repo.

BUILD:
1. Content collections with Zod schemas for: system, experience, decision,
   lesson, evidence-chip. Encode the constitution as constraints — e.g.,
   systems require status (enum), role line, stack, limitations (min 1),
   and date-qualified metrics as {value, qualifier} pairs so an unqualified
   number cannot typecheck. Add schema-level doc comments explaining WHY
   each constraint exists.
2. The complete component set from blueprint §5 — StatusBadge, EvidenceChip,
   SystemCard, DecisionCard, LimitationNote, StatBlock, ExperienceCard,
   SectionHeader, Figure, Buttons — token-driven, zero client JS,
   accessible by construction (focus, contrast, semantics).
3. /dev/components preview route rendering every component in every state,
   excluded from sitemap and robots.

You have latitude on component internals and file organization; you have
none on visual spec, token usage, or schema strictness.

DONE WHEN — a deliberately invalid content file (system without limitations;
bare metric) fails the build with a clear message; preview route matches
blueprint §5 on mobile and desktop; CI green; PHASE_LOG updated.
```

---

### PHASE 3 CONTRACT — The Human Fast Lane (T7–T9)

```
Read CLAUDE.md and docs/PHASE_LOG.md, then blueprint §2 (Home ordering,
recruiter journey), §3 (voice), §6 (motion). Phases 1–2 are shipped.

MISSION — complete the 90-second recruiter journey: Home (all six sections),
/about, /cv with a print-perfect PDF, and the site's entire motion system.

WHY — most visitors give this site under two minutes. Every fact a recruiter
needs (role, evidence, availability, CV) must be reachable from the hero
without depth-diving; depth stays one click away, never forced.

BUILD:
1. Home per blueprint §2 ordering, populated from content collections —
   evidence chips use only blueprint-listed facts with qualifiers.
2. /about per §1 narrative arc: the career-transfer story, the AI-assisted
   ownership statement lives on /engineering NOT here, human color in one
   short paragraph, headshot via responsive AVIF/WebP pipeline (if the
   image file is absent, build the pipeline and insert OWNER-INPUT).
3. /cv as semantic HTML from CV source content in docs/, plus a repeatable
   print-to-PDF script producing /public/cv.pdf; site and PDF must state
   identical facts.
4. Motion: the ≤1KB IntersectionObserver reveal utility + micro-interactions
   per §6. No animation library. Reduced-motion collapses everything to
   opacity/instant.

DONE WHEN — on a real or emulated mid-range phone: hero → proof → CV
download in under 90 seconds; copy gate passes; JS budget respected
(< 15KB gz total); PDF regenerates deterministically; PHASE_LOG updated.
```

---

### PHASE 4 CONTRACT — Flagship Proof: the Hospital System (T10)

```
Read CLAUDE.md and docs/PHASE_LOG.md, then blueprint §4.0–§4.1 and Rulings
3–4, then docs/PROJECT_KNOWLEDGE_BASE_WTMS.md §§1, 2, 8, 10, 12, 15.

MISSION — build /systems/hospital-operations, the flagship case study. It
sets the template and the honesty bar for everything after it.

WHY — this is the page a CTO reads. Its power comes from specificity plus
disclosed limitations: the KB documents that this hospital-production
system has NO automated test suite — that fact is published plainly in the
Limitations section and cross-linked (in Phase 6) to the lesson it
produced. Hiding it would destroy the entire site's thesis; publishing it
is the thesis.

BUILD:
1. The case-study page template implementing blueprint §4.0 items 1–10,
   composed from Phase 2 components — this template is reused verbatim by
   Phase 5, so build it as the reusable pattern.
2. WTMS content per §4.1: context, constraints, the four decision cards
   (QR-scoped identity; duplicate-photo fraud detection; cost-first AI
   routing with its real numbers and qualifiers; DPDP-first design),
   security/tenancy, operations, limitations (test-suite gap; in-process
   AI cost state), outcomes, recruiter-takeaway box.
3. Architecture SVG redrawn from the KB's structure in the token palette —
   hand-authored SVG, legible at 360px wide, with <title>/<desc>.
4. Gallery: Figure slots with per-slot HTML comments naming the exact
   screenshot required and its sanitization requirements (§8.3). Absent
   images = OWNER-INPUT markers, not stretched layouts.

Constitutional reminders in force: hospital never named ("a NABH-accredited
hospital"); every metric qualified; extract from the KB, never paste it.

DONE WHEN — the page passes the §4.0 checklist top to bottom; reads
correctly with zero images present; schema-valid; CI green; PHASE_LOG
updated with any template decisions Phase 5 must inherit.
```

---

### PHASE 5 CONTRACT — The System Suite (T11–T13)

```
Read CLAUDE.md and docs/PHASE_LOG.md (especially Phase 4's template notes),
then blueprint §4.2–§4.3, then PROJECT_KNOWLEDGE_BASE_MENUSAAS.md §§1, 3.4,
8, 9, 15 and PROJECT_KNOWLEDGE_BASE_ELES.md §§1, 10, 14, 16, 17, 18, 19.

MISSION — complete the suite: /systems/menu-platform,
/systems/electrical-platform, and the /systems index. Same template,
zero template drift.

WHY — three case studies with identical structure and identical honesty
read as discipline; any divergence reads as marketing. Menu's flagship
content is real-money payments engineering (the dual-path idempotent
activation flow — redraw its sequence diagram as a branded SVG). Electrical
is the engineering-maturity story: it is PRE-LAUNCH and says so plainly —
its evidence is the readiness programme itself (17 work packages, the four
real ADRs as decision cards, 256 tests as of Jul 2026, 21 tenant-isolation
test files, the test-tier SVG).

BUILD — both case studies per blueprint §4.2/§4.3 with their honest
limitations (Menu: purge documented but manual-only; process-local
cron/cache. Electrical: no production users yet; SSE single-instance
boundary; no external APM). Then the /systems index: three SystemCards +
the more-systems strip placeholder removed (that strip lives on
/experience, not here). Reuse Phase 4's template exactly — if the template
needs a change, change it once, apply to all three, and log why.

DONE WHEN — all three case studies pass the §4.0 checklist; statuses
render LIVE / IN PRODUCTION — HOSPITAL / PRE-LAUNCH correctly everywhere
they appear; payment and test-tier SVGs legible at 360px; CI green;
PHASE_LOG updated.
```

---

### PHASE 6 CONTRACT — The Narrative Layer (T14–T15)

```
Read CLAUDE.md and docs/PHASE_LOG.md, then blueprint §4.4–§4.5 and §1
(pillars, narrative), plus ELES KB §18 and §20 for decision-record and
charter source material.

MISSION — build /experience and /engineering: the pages where judgment,
not features, is the content.

WHY — senior hiring is judgment hiring. The decision records and the two
lessons are the most credibility-dense content on the site; the
confidential-client treatment turns an NDA into a professionalism signal
rather than a gap.

BUILD:
1. /experience — Vedha/OPS360 experience card using CV wording only, with
   the "CONFIDENTIAL CLIENT WORK — described at CV level" note; Avant Data
   card; the earlier-career transfer line; the more-systems strip (court
   bundle generator, lead-qualification agents, festival donations PWA)
   as compact cards, community project framed as community project.
2. /engineering — the five pillars each with one evidence line; the
   AI-assisted ownership statement (its single appearance on the site);
   six decision-record cards (four ELES ADRs + SQL-first router + dual-path
   activation), each with a source comment in the content file; the two
   Lessons from blueprint §4.5 rendered with the AGED treatment and the
   cross-link from Lesson 1 to the Electrical readiness programme.
   If docs/PHASE_LOG.md shows the owner has not confirmed the lessons,
   build the structure, insert OWNER-INPUT, and halt those blocks.

DONE WHEN — every decision card traces to a cited source; OPS360 content
diff-checks against CV wording (nothing beyond it); lessons render or halt
correctly; copy gate passes (this page is the highest banned-word risk —
verify "founder" never appears even in negations); PHASE_LOG updated.
```

---

### PHASE 7 CONTRACT — Machines & Discovery (T16–T17)

```
Read CLAUDE.md and docs/PHASE_LOG.md, then blueprint §7.6 and §3.4.

MISSION — make AI agents and search engines first-class readers whose view
of this engineer cannot diverge from the human view.

WHY — a growing share of first visits are automated screeners acting for
humans. This site treats them as an audience, not an accident — and the
credibility mechanism is single-sourcing: machine facts are generated from
the same content collections as the pages, so the two layers cannot
disagree by construction.

BUILD:
1. JSON-LD: Person site-wide; ProfilePage on /about and /cv;
   SoftwareApplication per case study with operating status stated
   honestly (including PRE-LAUNCH).
2. /api/profile.json — static, schemaVersion 1, generated at build from
   collections per blueprint §7.6 field list, including limitations[].
   Add a CI parity check that asserts key facts (statuses, role lines,
   qualified metrics) match between profile.json and built HTML.
3. /llms.txt per blueprint — including the line that unpublished figures
   are unpublished, not zero.
4. OG image generation (template on token background: title + status
   chips) for every page; full per-page title/description/canonical pass;
   sitemap + robots (AI crawlers allowed).

DONE WHEN — profile.json validates against its schema in CI; parity check
passes and demonstrably fails when a status is deliberately mismatched
(test this, then revert); every page has correct OG/meta; rich-results
validation clean for Person + one case study; PHASE_LOG updated.
```

---

### PHASE 8 CONTRACT — Hardening, Launch, Handover (T18–T20)

```
Read CLAUDE.md and docs/PHASE_LOG.md in full — this session closes the
project. Blueprint §7.5, §7.8–§7.9, Phase 6 criteria, and Appendix A.

MISSION — take the site from built to launched and operable: enforcing
gates, a full truth audit, launch operations, and a handover that keeps
this artifact alive after you.

WHY — the identity this site replaces died of neglect (a 14-month-stale
deploy with broken JS). The final deliverable is therefore not the launch;
it is the system that prevents that death from recurring.

BUILD:
1. Hardening — axe checks in CI; Lighthouse CI thresholds now ENFORCING
   (≥95 perf, accessibility pass, ≥95 SEO on home + flagship); image and
   font audit against §7.9 budgets; manual keyboard + screen-reader pass;
   cross-device QA (mid-range Android, iPhone, 1440p desktop) with fixes.
2. The Truth Audit — read every built page against Appendix A and the
   banned lists; verify every metric's qualifier; verify all OWNER-INPUT
   markers are resolved (any unresolved marker is a launch blocker —
   surface it, do not delete it).
3. Launch ops — production DNS final; the old Azure Static Web App
   replaced by a single-file 301 to kishanthorat.dev (produce the file +
   exact deploy instructions for the owner); owner checklist for LinkedIn/
   GitHub profile updates and archiving the old repo with its honest
   one-line README.
4. Handover — MAINTENANCE.md: add-a-system walkthrough, status-change
   procedure, local gate commands, and the quarterly review checklist
   (statuses current? qualifiers current? links alive? log reviewed?).
   Final PHASE_LOG entry: project state, deviations ledger, Phase 7+
   candidates parked (live status layer, Storylane embeds, light theme).

DONE WHEN — CI fully green with enforcing gates; zero unresolved
OWNER-INPUT markers; old URL 301s (or owner instructions delivered);
MAINTENANCE.md complete; final PHASE_LOG entry written. The portfolio is
live, truthful, and operable. Project closed.
```

---

## 5. Closing Note

Phase count: eight — chosen so every session ends deployed and verifiable, the flagship case study gets undivided attention before the template is replicated, and no session mixes strategic content work with mechanical hardening. The blueprint remains the contract; this document is only its delivery mechanism. **Planning is now permanently closed.**
