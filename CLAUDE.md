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
