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

---

## Phase 2 — The Constitution Becomes Code (Blueprint T5–T6) · 3 August 2026

### Shipped

- **Five content collections** (`systems`, `experience`, `decisions`, `lessons`,
  `evidenceChips`) with Zod schemas encoding the Truth Constitution. Schemas live in
  `src/schemas/` (`constitution.ts` primitives, `content.ts` entities);
  `src/content.config.ts` wires loaders only, so the schemas stay independently importable.
- **The complete component set** from blueprint §5 — StatusBadge, EvidenceChip, SystemCard,
  DecisionCard, LimitationNote, StatBlock, ExperienceCard, SectionHeader, Figure, Button.
- **`/dev/components`** gallery rendering every component in every state, excluded from
  discovery by page-level `noindex, nofollow` **and** `Disallow: /dev/` in a new
  `public/robots.txt`.
- **Token contrast gate** (`scripts/contrast-check.mjs`, wired into `npm run verify` and CI)
  enforcing WCAG 2.2 AA on the pairings components actually use.
- **The five evidence chips** as real content, transcribed from blueprint §2.

### Verification record

- Remote CI green — this is the completion standard inherited from the Phase 1 incident.
- **The schema was proven by breaking it**, in the Phase 1 copy-gate manner: each invalid
  file was built, the failure captured, and the file deleted before commit. All four fail
  the build naming the field and the rule:
  - system with `limitations: []` → *"Every system discloses at least one honest limitation
    (constitution rule 3). A case study with nothing to disclose is marketing, not
    engineering."*
  - metric with no qualifier → *"metrics.0.qualifier: Required"* — a bare number is not a
    representable value.
  - chip stating `256 CI-gated tests` with no date → the rule-2 message.
  - chip containing "founder" → *"Banned identity word …"*, proving the schema layer fires
    before the built-HTML copy gate.
- The schema also caught a genuine error in my own first draft of the chips, which is the
  most useful evidence available that it is not decorative.
- Budgets: gallery 4.5KB gz, home 1.8KB gz, CSS 2.1KB + 1.7KB gz — all far inside the 90KB
  page budget. Components add **zero** client JS; the gallery carries one script tag, the
  Phase 1 nav (≈0.4KB).
- `npm run verify` green end to end; `npm run format:check` clean; `npm audit` 0
  vulnerabilities.

### Engineering decisions — Phase 3+ MUST inherit these

1. **A prop named `as` silently breaks prop typing.** In this toolchain (Astro 7.1.6 +
   @astrojs/check 0.9.10), a component prop literally named `as` collapses `Astro.props` to
   `any`, disabling typechecking for that whole component — it surfaces only as a stray
   "'Props' is declared but never used" warning. Isolated by bisecting a minimal component
   pair: renaming the prop to `level` with everything else identical fixes it. **Every
   polymorphic component here uses `level`.** This matters beyond style: it silently
   disables a gate, so a future component adding an `as` prop would lose prop typechecking
   without any error saying so.
2. **Astro 7 content-layer API, read from the installed types rather than recalled:**
   collections declare a `loader` (`glob` from `astro/loaders`), config must be
   `src/content.config.ts`, and `z` is **Zod 4** via `astro/zod` (`astro:content`'s `z`
   export is deprecated). Zod 4 takes `error`, not `message`; a dynamic message naming the
   offending term needs `superRefine` with `ctx.addIssue`, because `.refine()`'s second
   argument is no longer a message-producing function.
3. **Hero status chips — the Phase 1 hand-off.** Phase 1 decision 5 parked the hero's chips
   as page-local markup. `EvidenceChip` now exists and the `evidenceChips` collection is
   populated. **Phase 3 must delete the `.status-chips` block and its styles from
   `src/pages/index.astro` and render the proof strip from `getCollection('evidenceChips')`
   through `EvidenceChip`.** Note the two are different things: the four hero *status* chips
   (`3 platforms`, `1 in hospital production`, …) are locked hero wording from blueprint §1
   and stay in `src/config/site.ts`; the *evidence* chips are the separate proof strip,
   blueprint §2 section 2. Phase 3 should render the hero status chips with `EvidenceChip`
   too, so one component owns that visual form.
4. **Evidence chips are authored; Phase 3 renders them.** Blueprint §2 enumerates them
   exactly, so writing them was transcription. Phase 3 owns ordering and placement, not
   re-authoring.
5. **Case-study routes do not exist yet.** The gallery's `SystemCard` hrefs point at `/`
   because the CI link gate rightly refuses dead internal links. Phase 4/5 must update
   `src/dev/preview-fixtures.ts` to the real hrefs when those routes ship.
6. **Collection naming**: plural (`systems`, `decisions`, `lessons`, `evidenceChips`) except
   `experience`, which is a mass noun and matches the `/experience` route.
7. **Never put a `README.md` inside a content directory.** The loader pattern is `**/*.md`,
   so any Markdown file there is parsed as an entry and fails validation. Each directory's
   `.gitkeep` says so.
8. **Empty-collection warnings are expected**, not a defect: the glob loader warns for
   `systems`, `experience`, `decisions`, and `lessons` until Phases 4–6 author them. Do not
   silence them by inventing content.
9. **Experience bullets carrying figures need an inline absolute date** (e.g. "1,500+
   Confluence pages … (as of Jul 2026)") to satisfy rule 2. Adding a date qualifier
   *narrows* a claim, so it stays inside Ruling 4's "never exceeds CV wording" — Phase 6
   should expect this rather than treat it as a schema problem.
10. **Phase 7 must preserve `Disallow: /dev/`** when it authors the full robots.txt, and must
    exclude `/dev/` from the sitemap. The page-level `noindex` is the second layer, not a
    substitute.

### Findings logged for Phase 8's accessibility pass

- **`--border` on `--bg` is 1.33:1, and `--bg-raised` on `--bg` is 1.07:1.** Blueprint §5
  locks these values and puts elevation in a border-plus-background shift, so card and chip
  edges are close to imperceptible for low-vision readers. This is not a WCAG AA failure —
  SC 1.4.11 governs what identifies a component or its state, and these edges identify
  neither, with all card content independently readable well above AA. It is nonetheless a
  real consequence of a locked design decision, so the contrast gate prints it on every run
  rather than hiding it. Changing a locked token is out of scope here; Phase 8's manual pass
  should decide whether to raise it as an amendment.
- The contrast gate found and fixed one genuine defect: the secondary button took its
  outline from `--border` (1.33:1) when SC 1.4.11 requires 3:1 for the boundary identifying
  a control. Fixed in usage — it now uses `--text-muted` (7.59:1). Tokens were not touched.

### OWNER-INPUT — open items

Unchanged from Phase 1; Phase 2 added none. Items 1 (domain) and 2 (Cloudflare Pages
project) remain the only ones blocking a live URL, and neither blocks Phase 3.

### Next session

Phase 3 — The Human Fast Lane (T7–T9). Open with the Phase 3 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially decisions 1 and 3.

---

## Phase 3 — The Human Fast Lane (Blueprint T7–T9) · 3 August 2026

### Shipped

- **Home**, composed in blueprint §2 order. The hero's page-local chip markup is gone,
  replaced by `EvidenceChip` (the Phase 2 hand-off). Sections 3 and 4 are driven by the
  `systems` and `experience` collections and render nothing while those are empty.
- **/about** — the career-transfer narrative, human colour in one paragraph, and the
  responsive headshot pipeline (`Headshot.astro`, AVIF/WebP via `Picture`) built and waiting
  behind an OWNER-INPUT marker.
- **/cv** — semantic HTML from `src/config/cv.ts`, with print styles that invert to black on
  white — plus `scripts/cv-pdf.mjs` producing a committed, deterministic `/public/cv.pdf`.
- **The motion system** — `src/styles/motion.css` and a ~600-byte inline reveal script. No
  animation library; still zero bundled JavaScript.
- Nav grown to About and CV; GitHub and LinkedIn moved to footer-only as Phase 1 planned.
- A plain-language notice on `/dev/components` saying it is a workshop page.

### Verification record

- Remote CI green.
- **Motion verified in a real browser across three conditions**, not asserted:
  reduced-motion → nothing ever hidden (opacity 1, no transform, root flag never set);
  JS disabled → identical; motion enabled → all 11 elements reveal on scroll, none left
  hidden.
- **Mobile checked at 390×844**: zero horizontal overflow on all four pages, exactly one
  `h1` per page, mobile nav disclosure toggles `aria-expanded`, `/cv.pdf` resolves 200
  `application/pdf`. The **CV download button sits at 683px — inside the first viewport**, so
  the recruiter journey is one tap with no scrolling, well inside the 90-second budget.
- **PDF determinism proven by hashing**: `npm run cv:pdf -- --check` renders twice and
  reports identical SHA-256. Output is 3 pages, 237KB.
- Budgets: heaviest page `/cv` at 5.8KB gz HTML + 3.4KB gz CSS ≈ 9.2KB (budget 90KB).
  **Zero bundled JS files** — both scripts are inlined, ~1.1KB raw combined (budget 15KB gz).
- All gates pass including contrast; `npm run format:check` clean; `npm audit` 0
  vulnerabilities. Lockfile regenerated from scratch after adding the dependency, and `npm ci`
  verified to reproduce the tree — the Phase 1 rule.

### Engineering decisions — Phase 4+ MUST inherit these

1. **Home sections 3 and 4 are data-driven and currently invisible.** `src/pages/index.astro`
   renders the featured-systems grid only when `getCollection('systems')` is non-empty, and
   the role snapshot only when `experience` is non-empty. **Phase 4 lights up the systems
   section purely by authoring content — do not edit Home to "add" it.** Card hrefs are
   already `/systems/{entry.id}`, so a file named `hospital-operations.md` must correspond to
   a page at `/systems/hospital-operations` or the link gate will fail.
2. **Home shows the first three systems by `order`**, and `SystemCard` shows the first three
   `stack` entries. Phase 4/5 should set `order` deliberately: the flagship hospital system
   should be `order: 1`, and the most important stack tags first.
3. **The hero has one button, not two.** Blueprint §2 specifies "See the systems" and
   "Download CV"; only the latter exists because `/systems` does not. **Phase 5 must restore
   the second button** when it ships the systems index. The omission is deliberate — a dead
   link fails the gate and inventing different wording would breach locked §1 copy.
4. **Getting an empty collection logs a warning**, e.g. *"The collection 'systems' does not
   exist or is empty"*. Expected until Phases 4–6 author content, same as decision 8 above.
   Do not silence it by inventing entries.
5. **The `.body-copy` and `.prose` classes activate the link underline slide-in** from
   `motion.css`. Case-study prose in Phase 4 should use `.prose` so links behave consistently
   with /about; nav and footer links deliberately keep their Phase 1 treatment.
6. **`data-reveal` marks a revealable element; `data-reveal-ready` is the root flag.** They
   must never share a name — see the bug below. To stagger entrances, set
   `style="--reveal-delay: 60ms"`, capped at 240ms; the helper on Home shows the pattern.
7. **Do not add a prop named `as`** (Phase 2 decision 1 still stands). `Headshot`, `Button`,
   and `SectionHeader` all avoid it.
8. **CV facts live in `src/config/cv.ts`, not in the page.** Phase 7's machine layer should
   read that module rather than parse `/cv`. If a CV fact changes, change it there and
   re-run `npm run build && npm run cv:pdf` so the PDF matches — the PDF is printed from the
   page, so nothing else is needed to keep them consistent.
9. **`npm run cv:pdf` is local-only and must never enter CI.** `playwright-core` was chosen
   over `playwright` precisely because it has no browser-download postinstall. It drives Edge
   or Chrome already installed on the machine. If CI ever needs the PDF, commit it — do not
   add a browser to the pipeline.
10. **Three narrowing edits to CV wording** are recorded in `src/config/cv.ts` with reasons:
    the venture framing replaced per Ruling 1, absolute date qualifiers added to figures per
    Ruling 3 and rule 2, and "Currently" replaced with a date per §3.5. Phase 6 will need the
    same treatment for /experience bullets (Phase 2 decision 9).
11. **Platform domains are plain text, never links** — Ruling 1 records that one page on that
    domain uses language this portfolio does not, so the portfolio does not route a reader
    there. Phase 4/5 case studies should follow this when naming platform URLs.

### The bug the browser caught that the code review did not

The reveal system was first written with the root flag and the per-element hook sharing one
attribute name, `data-reveal`. That makes `<html>` itself match `[data-reveal]` — the exact
selector the observer collects — so the root was observed, flipped to `in`, and every reveal
rule stopped matching. Reading the code, it looked correct; the three-condition browser test
showed `revealCount` of 12 instead of 11 and a root attribute reading `in`. Renamed to
`data-reveal-ready`, re-tested, correct.

The general lesson, which is the same one Phase 1 recorded in a different costume: **a
mechanism is not verified until it has been executed in the conditions it claims to handle.**
Reduced-motion support in particular is invisible to every gate in this repository — no
typecheck, no copy gate, no HTML validation, and no contrast check would have caught it.

### OWNER-INPUT — open items

Phase 3 adds **one**: the headshot (item 3, previously listed as "bites in Phase 3" — it now
does). It is marked in `src/pages/about.astro` with the exact filename and the two lines that
switch it on. The page reads correctly without it, so this is not a launch blocker until
Phase 8, but it is the last thing standing between /about and its intended form.

Otherwise unchanged: domain and Cloudflare Pages project (items 1–2) still gate a live URL;
screenshots (4) bite in Phases 4–5; lessons confirmation (5) in Phase 6; GitHub profile
rehabilitation (6) any time before launch.

### Next session

Phase 4 — Flagship Proof: the Hospital System (T10). Open with the Phase 4 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially decisions 1–3.

---

## Phase 4 — Flagship Proof: the Hospital System (Blueprint T10) · 4 August 2026

### Shipped

- **`src/layouts/CaseStudyLayout.astro`** — the reusable case-study template implementing
  blueprint §4.0 items 1–10 in order, and the anti-drift mechanism Phase 5 depends on.
- **`/systems/hospital-operations`** — the flagship case study.
- **`src/content/systems/hospital-operations.md`** — the system entry, and four decision
  entries in the `decisions` collection scoped to it.
- **`src/components/diagrams/HospitalArchitecture.astro`** — hand-authored architecture SVG
  in the token palette.
- The metric schema gained a required `caption`; the phone number moved to print-only.

### Verification record

- Remote CI green.
- **The anti-drift guard was proven by breaking it**: removing the `security` slot failed the
  build with *"Case study 'hospital-operations' is missing required section(s): security"*.
  Reverted uncommitted.
- **The route/id coupling was proven too**: renaming the content file failed the build
  immediately with *"Missing content entry: systems/hospital-operations"* — the page's own
  guard catches it before it can degrade into a subtle broken link. Reverted uncommitted.
- **Verified in a browser**: page renders with **zero images** and no holes; 0 horizontal
  overflow at 390px; exactly one `h1`; sections render in §4.0 order (Context, Constraints,
  Architecture, Decisions, Security, Operations, Limitations, Outcomes); 4 decision cards, 2
  limitations, 3 stat blocks, 3 takeaways.
- **Home's featured-systems section now renders** — 1 card, linking to
  `/systems/hospital-operations`, which returns 200. It appeared purely from authoring
  content, with no edit to Home, exactly as Phase 3 designed.
- **Diagram legibility measured, not assumed**: at 360px the SVG renders 328px wide, labels at
  13.1px and secondary text at 10.4px; every text node measured against its own box, nothing
  overflows. One label was shortened after measurement.
- Budgets: case study 10.6KB gz HTML + 2.3KB gz CSS ≈ 12.9KB (budget 90KB). Still **zero
  bundled JS**.
- All gates pass including contrast; `format:check` clean; `npm audit` 0 vulnerabilities.
- The regenerated `cv.pdf` is byte-identical to the committed one after the phone change,
  which independently confirms both determinism and that the number still prints.

### Template contract — what Phase 5 MUST inherit

1. **What is shared (do not re-implement per system).** `CaseStudyLayout` owns the section
   order and renders these from schema data, so they cannot drift: the **header** (title,
   status badge, role line, stack), the **decision cards**, the **limitations**, and the
   **outcomes block** (metrics, optional prose, three-bullet recruiter box). Section headings
   and kickers are also the layout's, not the page's.
2. **What is per-system.** Five required prose slots — `context`, `constraints`,
   `architecture`, `security`, `operations` — plus two optional ones, `outcomes` (prose above
   the takeaway box) and `gallery`. A sixth slot, `owner-input`, carries asset markers.
3. **A missing required slot fails the build.** This is the anti-drift guard. If Phase 5 finds
   a section genuinely does not apply to a system, **do not delete the requirement** — the
   correct move is to write the section saying so plainly, which is more honest anyway. If the
   section list itself must change, change it once in the layout, apply to all three, and
   record why here.
4. **A page is one file per system**, e.g. `src/pages/systems/menu-platform.astro`, and it must
   `getEntry` with a hard error if the entry is missing (copy the guard from the hospital
   page). The content file name fixes the route, so `menu-platform.md` ⇒
   `/systems/menu-platform`, which is what Home already links to.
5. **Decision cards come from the `decisions` collection**, filtered by `system` matching the
   entry id and sorted by `order`. Phase 5 authors Menu's and Electrical's the same way. The
   layout's decisions heading currently reads "Four calls, and what each one cost" — **if a
   system has a different number of decisions, that heading needs generalising once, in the
   layout, for all three.** This is the single most likely drift point.
6. **Gallery renders only if the page provides the slot.** With no images the section is
   absent, not empty. Do not ship placeholder frames.
7. **OWNER-INPUT markers must be injected with `set:html`**, not written as literal comments
   in a Fragment. A Fragment whose only children are comments renders as empty — Astro treats
   it as having no content, so the markers silently never reach the built HTML. The hospital
   page shows the pattern: an array of asset descriptions mapped to comment strings.
8. **Ruling 4 holds on every case study.** No user counts, tenant counts, revenue, or uptime
   — they do not exist in evidence. Where a reader might expect them, the hospital page says
   plainly why they are absent, in the `outcomes` slot. Phase 5 should do the same rather than
   leaving a silent gap.
9. **Metrics now require a `caption`.** Split the figure from its unit: value `256`, caption
   "CI-gated tests passing at the readiness audit", qualifier "as of Jul 2026".

### Content decisions worth knowing

- **Two limitations, not three.** Blueprint §4.1 names exactly two as mandatory and §4.0
  allows two or three. A third real finding is available from the knowledge base if the owner
  wants it published: the worker permanent-delete endpoint lacks the history guard its
  supervisor equivalent has (KB §15 finding 4, rated Medium/High). It was left out because
  publishing a potential data-loss path in a hospital system is a disclosure decision beyond
  an implementation phase, and Ruling 4 makes conservative the default. **Not a gap — a
  parked choice.**
- **The first limitation is stated without a rescue.** Its "addressed by" line says nothing
  was retrofitted, because nothing was. Softening it there would have discredited every other
  sentence on the site. Phase 6 supplies the cross-link to the readiness programme that
  followed.
- **The phone number is print-only.** Hidden from the rendered page, present in the PDF, since
  claims must match between them but contact routing need not. Residual: it is still in the
  page source, so this stops it being read, not scraped. If the owner wants it genuinely
  absent from the HTML, the PDF script would need to inject it at print time instead.

### OWNER-INPUT — open items

Phase 4 adds **five**, all gallery screenshots for the hospital case study, each recorded in
the built HTML with its exact capture and sanitisation requirements. The page is complete
without them by design. Total open markers now six, including the headshot.

Otherwise unchanged: domain and Cloudflare Pages project still gate a live URL; lessons
confirmation bites in Phase 6; GitHub profile rehabilitation any time before launch.

### Next session

Phase 5 — The System Suite (T11–T13). Open with the Phase 5 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially the template contract
above — items 3, 5, and 7 are where drift would start.

---

## Phase 5 — The System Suite (Blueprint T11–T13) · 4 August 2026

### Shipped

- **`/systems/menu-platform`** and **`/systems/electrical-platform`** — the payments case study
  and the engineering-maturity case study, on the Phase 4 template unchanged in shape.
- **`/systems`** — the index: three cards, correct statuses, no more-systems strip.
- **Four new diagrams**: menu architecture, the payment-flow diagram, electrical architecture,
  and the test-tier diagram.
- **Two shared changes made once and re-verified across all three**: the decisions heading now
  derives from the card count, and diagram styling moved to `src/styles/diagrams.css`.
- The hero's second button restored; Systems added to the nav; the phone number removed from
  the CV page source entirely.

### Verification record

- Remote CI green.
- **The heading generalisation was proven by breaking it**: unscoping one decision changed the
  menu page's heading to *"Three calls, and what each one cost"*. Reverted uncommitted.
- **All three case studies verified identical in the built output**: same eight sections in
  §4.0 order (Context, Constraints, Architecture, Decisions, Security, Operations,
  Limitations, Outcomes), one `h1` each, zero horizontal overflow at 390px, **zero images**,
  three takeaways each.
- **Statuses verified everywhere they appear** — the three case studies, Home, and the index —
  reading `IN PRODUCTION — HOSPITAL`, `LIVE`, `PRE-LAUNCH (Q3 2026)` consistently.
- **All five diagrams measured at 360px**: 13.1px labels, 10.4px secondary text, every text
  node checked against its own containing box, none overflowing.
- **The phone number appears zero times across all nine built pages**, confirmed by searching
  the built output rather than the source. The PDF still regenerates deterministically with
  identical hashes across two runs.
- Budgets: heaviest page 10.8KB gz HTML + 2.3KB gz CSS ≈ 13.1KB (budget 90KB). Still **zero
  bundled JS**.
- All gates pass including contrast; `format:check` clean; `npm audit` 0 vulnerabilities.

### Changes to shared code — the record Phase 6 needs

1. **The decisions heading counts its cards.** `CaseStudyLayout` spells the count as a word
   ("Four calls, and what each one cost", "One call, and what it cost"). If a system ever
   carries more than nine decisions the helper falls back to a digit — revisit the wording
   then rather than adding a special case now.
2. **Diagram styling is `src/styles/diagrams.css`**, imported once by `CaseStudyLayout`.
   Classes are `dg`, `dg-box`, `dg-key`, `dg-inner`, `dg-label`, `dg-sub`, `dg-flow`,
   `dg-flow-dashed`, `dg-arrowhead`. **Type sizes there are load-bearing** — they are what
   put labels at 13.1px on a 360px screen. Changing them changes every diagram at once;
   re-measure if you do.
3. **Arrowhead markers need unique ids per diagram.** `ArrowMarker.astro` takes an `id`
   because marker ids are document-global and the menu page carries two diagrams — sharing an
   id would have the second silently inherit the first's definition.
4. **The template itself was not otherwise touched.** Slots, section order, and the required-
   slot guard are exactly as Phase 4 left them.

### What Phase 6 inherits

1. **The more-systems strip belongs on `/experience`**, not on `/systems` — blueprint §4.4.
   The index was deliberately left as three cards only.
2. **The hospital limitation is waiting for its cross-link.** The first limitation on
   `/systems/hospital-operations` says nothing was retrofitted; the electrical page's context
   says that platform is where the lesson was applied. **Phase 6's Lesson 1 is what joins
   them** — blueprint §4.5 asks for the cross-link from the lesson to the readiness
   programme.
3. **Decision entries carry a `system` field.** The eight authored so far are all scoped to a
   system. Blueprint §4.5c wants six decision records on `/engineering`, including the
   SQL-first router and dual-path activation — both already exist as entries
   (`wtms-sql-first-ai-router`, `menu-dual-path-activation`). Render them there from the same
   entries rather than re-authoring; that is rule 10 working.
4. **Phase 6 will need date qualifiers on CV-derived experience bullets** (Phase 2 decision 9,
   still open).
5. **`src/config/pillars.ts` already holds the five pillars** with their one-line forms, used
   by Home. `/engineering` adds a concrete evidence line to each — extend that module rather
   than writing a second copy.

### Content decisions worth knowing

- **The Electrical audit verdict is published; its two critical findings are not.** The page
  states plainly that the most recent readiness audit returned a not-ready verdict with two
  critical blockers open, and frames that as the programme working. The findings themselves —
  known dependency vulnerabilities in the production set, and a non-functional offsite backup
  path — are deliberately not enumerated. They are live security findings on an unlaunched
  system, and naming them publicly is a disclosure rather than a case study. This is the same
  judgement as the hospital one below, applied consistently.
- **The WTMS worker permanent-delete finding is permanently unpublished — planning-authority
  ruling.** A live data-loss path in a clinical production system is a security disclosure,
  not portfolio content. **No later phase reopens this.** It is not a gap in the case study
  and should not be re-proposed as one; Phase 4 parked it as an open choice and that choice
  is now closed.
- **The phone number ruling superseded Phase 4's approach.** Print-only CSS hid it from
  readers but left it in the page source for harvesters. It now lives in
  `content/print-contact.json`, which nothing under `src/` imports, and the PDF script injects
  it at print time. Do not move it back into `src/`.

### OWNER-INPUT — open items

Phase 5 adds **seven** gallery screenshots — four for Menu, three for Electrical — each with
its exact capture and sanitisation requirements in the built HTML. Both pages are complete
without them. **Total open markers now thirteen**: one headshot and twelve screenshots.

Otherwise unchanged: domain and Cloudflare Pages project still gate a live URL; lessons
confirmation bites in Phase 6; GitHub profile rehabilitation any time before launch.

### Next session

Phase 6 — The Narrative Layer (T14–T15). Open with the Phase 6 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first. Note the unblock rule: if the
owner's opening message says "Lessons approved as drafted", blueprint §4.5 wording is
confirmed and both lessons publish; otherwise build the structure, insert OWNER-INPUT, and
halt those blocks.

---

## Phase 6 — The Narrative Layer (Blueprint T14–T15) · 4 August 2026

### A note on how this session opened

The session was opened with the **Phase 4 contract pasted twice**, not the Phase 6 one.
Phases 4 and 5 were both already shipped and CI-green, and re-running that contract would
have regressed Phase 5's phone-number fix back to print-only CSS — a refactor of a shipped
phase, which `CLAUDE.md` forbids. I stopped, reported the state with evidence, and asked.
The owner confirmed Phase 6 and, in the same exchange, that **the two Lessons are approved as
drafted** — the documented unblock condition. Both lessons are therefore published in
blueprint §4.5 wording.

### Shipped

- **`/experience`** — the confidential-client card, Avant Data, the earlier-career line, and
  the more-systems strip.
- **`/engineering`** — five pillars with evidence, the AI ownership statement, six decision
  records, and both lessons with the AGED treatment.
- **`scripts/confidential-parity.mjs`** — a new CI gate holding Ruling 4 in place.
- Two schema extensions (`decisions.featured`, `lessons.whatHappened` + `lessons.why`), the
  completed navigation, and Home's two remaining section links.

### Verification record

- Remote CI green.
- **The parity gate was proven by breaking it**: adding six words naming the client platform
  to one confidential bullet failed the build with that sentence quoted back. Reverted
  uncommitted.
- **`"founder"` appears zero times across all eleven built pages**, including in negations —
  checked directly against built HTML, since `/engineering` is the highest-risk page for it.
- **Verified in a browser at 390px**: both pages zero horizontal overflow, one `h1` each.
  `/engineering` renders 5 pillars with 5 evidence lines, exactly 1 ownership statement, 8
  decision cards (6 featured + 2 lessons), exactly 2 AGED rows, and 1 cross-link resolving to
  `/systems/electrical-platform`. `/experience` renders 2 role cards, 1 CONFIDENTIAL badge
  with its note, 3 more-systems cards, 1 community label.
- **Home's role snapshot appeared on content alone** — no edit to the page was needed, exactly
  as Phase 3 wired it.
- Budgets: heaviest page unchanged at 10.8KB gz; `/engineering` 8.3KB gz, `/experience`
  5.3KB gz. Still **zero bundled JS**.
- All six gates pass; `format:check` clean; `npm audit` 0 vulnerabilities.

### What Phase 7 inherits

1. **`scripts/confidential-parity.mjs` is a gate, not a formality.** It fails if it finds *no*
   confidential bullets, because a markup change that makes it check nothing is worse than one
   that makes it fail. If `ExperienceCard`'s markup changes, fix the selector — do not relax
   the gate.
2. **`decisions.featured` selects the six records on `/engineering`.** The machine layer should
   read the same flag rather than re-deriving the set, or `profile.json` and the page will
   disagree about which decisions are the headline ones.
3. **The pillars live in `src/config/pillars.ts` with both a one-line form and an evidence
   line.** Home uses the first, `/engineering` the second. Phase 7's machine layer should read
   this module, not scrape either page.
4. **CV facts remain in `src/config/cv.ts`; the phone remains in `content/print-contact.json`,**
   which nothing under `src/` imports. The machine layer must not publish the phone.
5. **`/dev/components` is still excluded twice** — page-level `noindex` and `Disallow: /dev/`.
   Phase 7 owns the full robots and sitemap work and must preserve both, and must exclude
   `/dev/` from the sitemap.
6. **Eleven public routes now exist**: `/`, `/about`, `/cv`, `/experience`, `/engineering`,
   `/systems`, three case studies, `/404`, plus `/dev/components` which is not public.

### Content decisions worth knowing

- **Both lessons publish in blueprint §4.5 wording**, extended to fill the decision card's four
  rows. The added "why" rows are the substance: for the test-suite lesson, that each individual
  decision to defer was defensible and the accumulation was not; for the purge lesson, that
  every visible artefact said the behaviour existed and the only missing part was the one that
  does anything.
- **Neither lesson is softened by its cross-link.** Lesson 1 links to the readiness programme
  that followed, but its cost row still says the hospital platform has no regression net today.
  The cross-link is a sequel, not a retraction.
- **The client and platform behind the confidential engagement are named in the CV and not on
  the site.** Ruling 4 forbids customer names; narrowing is always permitted.
- **The more-systems strip is config, not collection content**, so it cannot leak onto
  `/systems` or Home beside the three platforms with full case studies.

### OWNER-INPUT — open items

Phase 6 adds **none**. Total remains **thirteen**: one headshot and twelve gallery screenshots
across the three case studies.

Otherwise unchanged: domain and Cloudflare Pages project still gate a live URL; GitHub profile
rehabilitation any time before launch. **The lessons-confirmation item is now closed** — the
owner approved them as drafted this session.

### Next session

Phase 7 — Machines & Discovery (T16–T17). Open with the Phase 7 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. Read this log first, especially items 2–5 above: the
machine layer must read the same modules the pages read, or rule 10 breaks.

---

## Phase 7 — Machines & Discovery (Blueprint T16–T17) · 5 August 2026

### Shipped

- **`/api/profile.json`** — static, `schemaVersion: 1`, built by `src/lib/profile.ts`, which
  reads the same collections and config modules the pages render.
- **JSON-LD** — 16 blocks: `Person` site-wide, `ProfilePage` on `/about` and `/cv`,
  `SoftwareApplication` per case study.
- **Open Graph cards** — 10, generated at build with satori + sharp, byte-identical run to run.
- **Full meta pass** — canonical, description, OG and Twitter tags on every public page.
- **`/llms.txt`**, an auto-discovered **sitemap**, and **`robots.txt`** moved to a generated
  route so its `Sitemap:` line derives from the configured origin.
- **A seventh CI gate** — `scripts/machine-parity.mjs`, 21 checks.

### Verification record

- Remote CI green on `762b4ae` (run `30995285882`), **every step confirmed executed** at job
  level rather than inferred from the run conclusion — including the new parity gate.
- **The parity gate was proven, and proving it was instructive.** Editing a system's status in
  its content file did *not* fail the gate, because both layers read that file and changed
  together. That is rule 10 working: a content edit cannot create divergence. The proof had to
  tamper with one layer alone — rewriting `statusLabel` in the built `profile.json` while
  leaving the pages untouched — which failed naming both divergences, the badge and the
  JSON-LD. Reverted by rebuilding.
- **The gate caught a real defect on its first run**: the noindex component gallery was
  advertising an `og:image` that was never generated. Fixed by giving noindex pages no share
  card at all.
- Built output inspected directly: 11 canonicals, 10 OG images, 6 JSON-LD `@id`s, 9 sitemap
  entries, 9 absolute URLs in `profile.json`, 11 in `llms.txt` — all on the configured origin,
  with **zero** surviving references to any previous origin anywhere in `dist`.
- All JSON-LD validated as parsing with required properties present.
- Budgets: largest page 11.6KB gz (budget 90KB). Still **zero bundled JS**.

### ⚠ THE ORIGIN IS WRONG AND PHASE 8 MUST FIX IT FIRST

**`astro.config.mjs` currently reads `https://kishanthorat-portfolio.pages.dev`. That host
does not exist.** A DNS lookup returns NXDOMAIN, while `engineering-portfolio.pages.dev` and
`api.github.com` resolve and return 200 from the same shell seconds later. `*.pages.dev` is
not wildcard-resolved, so NXDOMAIN means no Pages project answers to that name.

The origin was supplied by the owner as confirmed-loading and was pushed without first
checking that it resolved. **That was the mistake: one `curl` before the push would have
caught it.** Everything downstream is internally consistent and locally verified, and every
gate passes — but every canonical, OG URL, sitemap entry, JSON-LD `@id`, and absolute URL in
`profile.json` currently points at a host that does not answer.

Eight hostname variants were probed and verified by content rather than guessed; the two that
resolved belong to other people. The correct hostname is still unknown and is an owner input.

**No CI gate can catch this class of error**, and that is worth understanding rather than
patching over. Every gate checks *internal consistency against whatever origin is configured*.
Reachability is a property of the network, not the artifact. Phase 8's launch checklist needs
an explicit "fetch the deployed site and confirm it serves the artifacts" step, because
passing CI and being reachable are two different claims.

### What Phase 8 inherits

1. **Fix the origin first, before anything else.** It is one line in `astro.config.mjs`,
   marked PROVISIONAL in capitals with the swap instructions beside it. Change it, rebuild,
   re-run all seven gates, re-inspect built output, and then **fetch the deployed site** and
   confirm `/api/profile.json`, `/llms.txt`, `/sitemap-index.xml`, and at least one
   `/og/*.png` return 200 over the network.
2. **The ratified production domain is `kishanthorat.com`, and it is not purchased.** Note the
   conflict: blueprint §7.4 names `kishanthorat.dev` as primary with `.com` redirecting to it,
   and the Phase 8 contract in `IMPLEMENTATION_HANDOFF.md` §4 repeats `.dev`. The planning
   authority ratified `.com` during Phase 7. **Use `.com`; treat the blueprint and handoff
   wording as superseded.** This is recorded in `astro.config.mjs` too, so whoever does the
   swap meets it there rather than discovering it mid-launch.
3. **Nothing else hardcodes a host.** That is why the swap is one line, and it is why
   `robots.txt` moved out of `public/` — its `Sitemap:` line had a literal hostname that would
   have gone stale silently. Every rule in it was preserved verbatim.
4. **OWNER-INPUT markers: 13.** One headshot on `/about`; five hospital screenshots, four menu,
   three electrical. Unchanged by this phase. All are launch blockers under the Phase 8
   contract, and all are surfaced by `scripts/copy-check.mjs` on every run.
5. **Lighthouse has still only ever scored a local build.** It has run warn-only in CI since
   Phase 1 against `dist` on a CI runner — never against the deployed site, never enforcing.
   Phase 8 turns the thresholds on (≥95 performance, accessibility pass, ≥95 SEO on home and
   the flagship). Expect the first enforcing run to be the first time these numbers have
   meant anything, and budget for it failing.
6. **The machine-parity gate reads the origin from the artifact**, not from a constant, so it
   keeps working across the swap without edits.
7. **Seven gates now run in CI**: dependency audit, typecheck, build, copy, links, HTML
   validation, contrast, confidential parity, machine parity. A new page must satisfy all of
   them; `npm run verify` runs the same set locally.

### Content and design decisions worth knowing

- **Nothing in the machine layer asserts anything the pages do not say.** `creativeWorkStatus`
  carries the same status label the badge renders, so the pre-launch platform reads
  `PRE-LAUNCH (Q3 2026)` to a machine exactly as it does to a person, and the disclosed
  limitations travel into both `profile.json` and the structured data.
- **`profile.json` carries its own disclosure block** — that figures are dated, that
  unpublished figures are unpublished and not zero, and that one engagement is described only
  at CV level. A machine reader gets the site's honesty rules, not just its claims.
- **The phone number is absent and structurally unreachable**: it lives outside `src/`, so
  nothing that builds a page or a payload can import it.
- **OG chips render in Inter, not the mono face** the design system uses for status badges. At
  the size a share card is seen the distinction is invisible, and it avoids a second font
  package. Recorded as a deliberate deviation.
- **Four dependencies added**, each justified in its commit: `@astrojs/sitemap` (auto-discovery
  beats a hand-maintained route list), `satori` (converts glyphs to paths so cards do not
  depend on fonts installed on the rasterising machine), `sharp` (pinned `^0.35.3` — the 0.34
  line carries libvips advisories the audit gate refused), and `@fontsource/inter` (the site's
  variable woff2 is rejected by satori's parser twice over; both failures were reproduced
  before choosing this).

### Next session

Phase 8 — Hardening, Launch, Handover (T18–T20). Open with the Phase 8 contract from
`docs/IMPLEMENTATION_HANDOFF.md` §4. **Read item 1 above first — the site currently emits URLs
for a host that does not exist, and that is the first thing to fix.**

---

## P0 — Foundation split (Dossier §13) · 8 August 2026

### A note on the numbering, before anything else

`docs/MASTER_IMPLEMENTATION_DOSSIER.md` arrived after the seven entries above and sits above
every other document in this repository. It restarts the roadmap at **P0** while the entries
above run **Phase 1–7** under the original eight-phase plan. Both numberings are correct in
their own context and neither is renumbered, because this log is append-only and a log that
rewrites its own history is worth nothing here of all places.

From this entry on, dossier phases are written `P0`–`P8`. The old scheme's Phase 7 (Machines
& Discovery) and the dossier's P7 (Fast lane and machine layer) are different phases with the
same digit; the prefix is what distinguishes them. `CLAUDE.md` records this so a fresh session
meets it before it meets the log.

### Shipped

- **The monorepo split.** `apps/static` (the Astro surface, moved whole with `git mv` so
  history follows the files), `apps/experience` and `services/api` as real directories with
  READMEs stating what lands there, when, and what blocks it. npm workspaces at the root.
- **Root `dist/` is the composed deployment artifact**, and each workspace builds into it.
- **The copy gate now covers the machine layer** — `/api/profile.json`, `/llms.txt`,
  `robots.txt`, and the sitemaps — and fails when it finds nothing to scan.
- **The origin defect is fixed**: the site had been emitting every canonical, OG URL, sitemap
  entry, JSON-LD `@id`, and machine-layer URL for a host that does not exist.
- A formatting step in CI, `.wrangler/` gitignored, `CLAUDE.md` rewritten against the dossier,
  and `README.md` corrected — it claimed Astro 5, Cloudflare Pages, and a domain that returns
  NXDOMAIN.

### Verification record

- **Byte-identical, measured rather than asserted.** Every one of the 34 built files was
  SHA-256 hashed before the split and after it: `diff` exits 0 across all 34. The comparison
  was itself proven capable of failing — appending a single byte to `dist/llms.txt` produced a
  hash mismatch and a non-zero exit, so the exit-0 result is a measurement and not a silence.
- **The dependency tree was regenerated from nothing**, per the Phase 1 rule: `node_modules`
  and `package-lock.json` deleted, fresh `npm install`, then `node_modules` deleted again and
  `npm ci` verified to reproduce the tree. **The rebuild after regeneration is still
  byte-identical to the pre-split baseline**, which is the useful result: the split changed
  where the code lives and changed nothing about what deploys.
- The regeneration moved `astro` 7.1.6 → 7.2.0, `wrangler` 4.119.0 → 4.120.0, `prettier`
  3.4 → 3.9.6, all inside existing ranges. Two things follow, and both were checked rather
  than assumed. Astro 7.2.0 produces output identical to 7.1.6 for this site — that is the
  byte-identity result above, and it is evidence about this site, not a claim about the
  release. And **the full-tree audit is now clean**: `npm audit` reports 0 vulnerabilities
  where wrangler 4.119.0 carried a high-severity advisory through miniflare → undici. Dossier
  §15's "wrangler dev-tree advisories" open item is closed by arithmetic, not by argument.
- **The widened copy gate was proven by breaking it, four ways**, each reverted:
  `founder` injected into `dist/llms.txt` → *"banned identity word"*, exit 1;
  `world-class` injected into `dist/api/profile.json` → *"banned hype word"*, exit 1;
  an empty `dist/` → *"nothing to scan … Either way it is not a pass"*, exit 1;
  clean run afterwards → OK. **The gate as it stood before this phase passed all three of the
  failing cases**, which is the reason to record it: it was reporting success for work it was
  not doing.
- All seven gates green locally, `format:check` clean, `npm audit` clean at both production
  and full-tree scope.

### The defect this phase found, and how

Phase 7 recorded that `astro.config.mjs` named a host that returned NXDOMAIN, and left fixing
it to Phase 8. What that entry could not know is that **the site was live the whole time**.
`https://portfolio.kishanthorat.workers.dev/` returns 200 and serves this site's own home
page — verified by fetching it and reading the HTML back, not by trusting the name.

So the live artifact was healthy and every URL inside it was wrong. `/llms.txt` — the file
written specifically for the agent readers the dossier names as the tertiary audience — was
directing every one of its eleven links at nothing. That is the worst possible place for this
particular failure: the machine layer is this site's signature, and it was the part that was
broken.

The origin now reads `https://portfolio.kishanthorat.workers.dev`, confirmed against the
network before the change was made. Rebuilt output carries **zero** surviving references to
the dead host: 11 canonicals, 10 OG URLs, 9 sitemap entries, 11 `llms.txt` URLs, and 6 of
`profile.json`'s 9 absolute URLs on the new origin (the other three are GitHub and LinkedIn),
plus the `Sitemap:` line in `robots.txt`.

**The rule this confirms, in the dossier's own words (§9.7): reachability and correctness are
different claims.** Every gate in this repository checks internal consistency against whatever
origin is configured. None of them can check that the origin answers. One `curl` can.

### Engineering decisions — later phases inherit these

1. **The deployment artifact is the repository-root `dist/`, not `apps/static/dist`.** One
   Cloudflare Worker serves one assets directory, so the origin a visitor reaches is a single
   composed tree; from P5 it carries both surfaces. Building into a shared root `dist/` also
   meant `wrangler.jsonc`, `lighthouserc.json`, and every gate kept pointing at the path they
   already pointed at, so the split could not change what deploys. **P4 must have the
   experience app build into this same tree**, not beside it.
2. **The truth gates stay at the repository root**, because they validate the composed
   artifact rather than any one workspace. Two of them read source rather than output —
   `contrast-check` reads `apps/static/src/styles/tokens.css` and `cv-pdf` writes
   `apps/static/public/cv.pdf` — and those two literals are the only places the layout is
   written down in `scripts/`. A third consumer justifies a shared path module; two do not.
3. **`content/banned.json` lives at the repository root and is imported across the workspace
   boundary** by `apps/static/src/schemas/constitution.ts`. The four-level relative import is
   visible and intended: rule 5 binds every surface, so the list cannot belong to whichever
   surface needed it first. The experience app and the API read this same file.
4. **Minified JavaScript is deliberately outside the copy gate**, and that has a consequence
   P4 must design around. Bundled third-party code contains `owner` and `clients` as
   identifiers in volumes that would drown the signal. **The experience app's visitor-facing
   copy must therefore reach the build as data — one content module emitted as JSON — not as
   literals scattered through a bundle.** That is also what rule 10 requires of it, so the
   gate and the constitution are asking for the same shape.
5. **Workspace dependencies are declared where they are used.** `astro`, `satori`, `sharp`,
   and the fonts belong to `apps/static`; `wrangler`, `prettier`, `html-validate`, and
   `playwright-core` are root tools. `apps/experience` and `services/api` have no
   `package.json` yet, which is why the workspace globs are `apps/*` and `services/*` — npm
   matches package manifests, not directories, so an empty directory is simply not a workspace
   yet.
6. **`npm run cv:pdf` still never enters CI** (Phase 3 decision 9 stands). It now writes to
   `apps/static/public/cv.pdf`.

### Deviations and things deliberately not done

- **Nothing was pushed.** The site is live, and the Cloudflare Workers build command lives in
  a dashboard this repository cannot read. If it is anything other than `npm run build` from
  the repository root, the first push after this split fails the deploy. That is an owner
  input, recorded below, and it is the reason this phase stops at a verified local state
  rather than declaring itself done — the completion standard is remote CI green, and remote
  CI has not run.
- **`profile.json` emits its own URLs without trailing slashes** (`/cv`, not `/cv/`) while
  canonicals carry them and the Worker 307-redirects to the slashed form. Not a factual
  disagreement, so the parity gate is right not to fail; it is a URL-normalisation nit worth
  tidying in P7 when that surface is revisited.
- **No test framework was added.** It is P1's decision to make against a real service, and
  adding one here with nothing to test would be scaffolding, not testing. Recorded because
  the absence is deliberate and this repository's own published lesson is about exactly this.

### OWNER-INPUT — open items

Unchanged at **thirteen** markers (one headshot, twelve gallery screenshots); P0 added none
and resolved none. Beyond the markers:

1. **Confirm the Cloudflare deploy configuration** before the first push after this split:
   build command `npm run build`, root directory `/`, output `dist`. One dashboard field.
2. **The VM** — still the owner's action, and it gates P1 entirely.
3. **`kishanthorat.com`** — ratified, not purchased. P8 swaps the origin and re-verifies.
4. **Hospital telemetry permissions** — unanswered, and it ceilings the estate layer in P6.

### Next session

P1 — Control plane. Blocked on the VM. Read this entry's decisions 1 and 3 first, and the
adversarial review that opened this session for the two items awaiting a ruling: the
relationship between the demo's Postgres RLS and the `orgId` row-scoping the real platforms
actually run on, and whether the session-audit-log take-away leads with a shareable link
rather than an email.

### P0 closing note — rulings, and the completion evidence · 9 August 2026

Appended rather than edited into the entry above, per the append-only rule. The entry above
was written before the push and before the product architect's rulings; both are recorded
here so the record shows what was known when.

#### Rulings received

- **The demo implements both isolation layers.** Server-derived `orgId` scoping matching
  ADR-0003 — what the hospital, menu, and electrical platforms actually run — and Postgres
  RLS beneath it. The membrane inspector at the §2.5 peak shows **both**, labelled honestly:
  the production pattern, and the RLS layer disclosed as stronger than what those platforms
  have. **Dossier §7.1 and §16.2 are amended accordingly.** As originally written, the peak
  would have shown a mechanism the engineer does not operate, to an audience selected for
  being able to tell.
- **The signed permalink is the primary take-away.** Email is demoted to opt-in behind an
  explicit confirmation click and is never the default path. §2.8 and §2.10 amended.
- **Five demonstrations = the four stations plus the break-out.** P2 builds five endpoints,
  not six. §2.6 amended to say so explicitly.
- The four decisions recorded in the entry above all stand: root `dist/` as the composed
  artifact, gates at the repository root, `content/banned.json` at the root imported across
  the workspace boundary, and the origin swapped now rather than at P8.
- **A1–A14 approved.** Five of them are **binding on the phases that own them, not
  optional**, and a later session may not quietly drop them:
  - **A4** — the experience app's visitor-facing copy reaches the build as data, one content
    module emitted as JSON, never as literals scattered through a bundle. *(P4)*
  - **A5** — P4's fixtures **are** the §6.3 degraded-mode payload: recorded real traces
    shipped in the static bundle, so they cannot rot unseen. *(P4, consumed P5)*
  - **A6** — the arrival beat's PoP and RTT are served from the Cloudflare edge, so beat 1
    is real even when the live plane is unreachable. *(P5)*
  - **A11** — model-budget exhaustion is a designed, honest state, not an error. *(P2)*
  - **A14** — the signed session-receipt permalink. *(P2, surfaced P5)*

#### Carried forward as design constraints, not notes

Three risks are now constraints that later phases design against rather than acknowledge:

1. **The single-VM failure mode.** When the demo is down, the portfolio actively argues
   against its own central claim. Degradation must fail *closed* into honest degraded mode,
   and the fallback must live where it survives the VM being gone.
2. **Presence must be non-identifying by construction, not by policy.** §2.3 makes other
   visitors visible; no configuration mistake may make a visitor identifiable or correlatable.
3. **The peak beat is the most expensive frame in the experience**, arriving at the moment
   the visitor is paying the most attention. Budget it as the worst case, not the average.

#### Accepted as a real defect — P8

The live origin sends **no** `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or `X-Frame-Options` —
all six confirmed absent by fetching the headers, not by reading configuration. For a site
whose subject is security engineering this is the wrong detail for a reader to find, and
Phase 8's ≥95 best-practices threshold will fail on it. **The delivery mechanism must be
verified against the installed wrangler's own config schema before one is chosen**, not
recalled — Workers static assets and Pages do not handle this identically.

#### The push, and the two claims that had to be proved separately

The Cloudflare build configuration was confirmed by the owner as `npm run build` with root
directory `/`, which was the only thing holding the push. Pushed `15b3331..ff03cfc`.

**CI — proved at step level, not by the run's conclusion.** Run `31308900821` on `ff03cfc`:
**26 steps across both jobs, 26 success, 0 skipped, 0 non-success.** The zero-skipped count
is the load-bearing part — a skipped step is a gate that ran nothing while the run still
reports green. The new formatting step executed and passed, which is what proves it is wired
in rather than merely declared.

**Reachability — proved by fetching, because CI cannot make this claim (§9.7).** All ten
probed paths return 200 with correct content types: `/`, `/api/profile.json`, `/llms.txt`,
`/sitemap-index.xml`, `/sitemap-0.xml`, `/robots.txt`, `/og/home.png`, `/cv.pdf`, `/about/`,
`/systems/hospital-operations/`. A missing path still returns a real **404**; `/about` still
**307**s to `/about/`. The sitemap carries nine entries, all on the live origin, with `/dev/`
absent from it and the gallery still `noindex, nofollow`.

**That the deploy actually landed was proved by content, not by a cache header.** The first
responses came back `CF-Cache-Status: HIT`, and query-string busting does not force origin
for static assets — so cache status could not settle it. Byte comparison could:
**seven served artifacts are SHA-256 identical to the local build of `ff03cfc` on a clean
tree** — `/`, `/llms.txt`, `/api/profile.json`, `/robots.txt`, `/sitemap-0.xml`,
`/og/home.png`, and `/systems/hospital-operations/`. A cached copy of the previous build
would have carried the dead host; zero occurrences of it survive anywhere on the live origin,
against 11 in `llms.txt` and 6 in `profile.json` now naming the origin that answers.

**P0 is complete.** Remote CI is green at step level and the deployed artifact is verified
reachable and byte-correct.

#### Next session

P1 — Control plane. **Still blocked on the VM**, which remains the owner's action. Read the
rulings above before the entry they amend, and note that P1 now owes two isolation layers
rather than one.

---

## P1 — Control plane (Dossier §13) · 9 August 2026

### Shipped

- **`services/api`** — Fastify 5 + TypeScript strict over PostgreSQL 17, Redis, a scheduled
  purge worker, and OpenTelemetry. Fixed endpoint surface, no ORM, no arbitrary SQL.
- **Both isolation layers, additive** (ruling A10): server-derived `orgId` scoping matching
  ADR-0003, and genuine PostgreSQL row-level security beneath it.
- **The real TTL lifecycle**: provision → seed → operate → expire → purge, where the purge is
  a separate worker process on its own timer under a Postgres advisory lock.
- **`infra/`** — Compose topology with no published ports, an internal-only network for
  Postgres/Redis/collector, Caddy, cloudflared, and an OTel collector.
- **CI** (`.github/workflows/api.yml`) running the suite against a real Postgres service
  container, plus two direct database assertions about RLS.
- **Deployment** (`.github/workflows/deploy-api.yml`) — manually dispatched, image pinned by
  digest, secrets written at release time, automatic rollback on a failed health check.

### The two layers, and how the distinction stays observable

P2's peak depends on being able to show the difference between them, so they are built as two
independently observable mechanisms rather than one defence with two names.

Layer 1 is `tenant_id = $orgId` on every tenant-owned statement, where `orgId` comes from a
verified credential and from nothing else. Layer 2 is RLS policies on all five tenant-owned
tables, `FORCE` enabled, enforced against `demo_app` — a role with no `BYPASSRLS`, which owns
nothing and cannot alter the schema.

**The production platforms do not have layer 2, and the system says so** — in
`/v1/tenants/me`, in the migration comments, and in the service README, so P2's inspector
reads the disclosure rather than re-asserting it.

`test/integration/tenant-isolation-rls-enforcement.test.js` removes layer 1 and asserts the
database still refuses: a read with no org predicate, a bare `SELECT *` with no scope at all,
a cross-tenant UPDATE, a cross-tenant DELETE, and an INSERT claiming another tenant.

### Verification record

- **52 tests, all passing**, against a real PostgreSQL with the real migrations applied.
  Six suites, one file per tenant-owned resource in the ELES pattern: `demo_record`,
  `audit_event`, `tenant_credential`, `tenant_budget`, the RLS-alone suite, and the lifecycle.
- **The isolation suite was proven by breaking it, twice, both reverted.** Dropping `FORCE`
  on `demo_record` failed one case. Disabling RLS on that table outright failed six. **And
  with RLS disabled, the ordinary `demo_record` isolation suite still passed 5/5** — which is
  the whole argument for the RLS-alone file: every other isolation test is satisfied by
  layer 1 working, so a broken policy would hide behind a correct WHERE clause indefinitely.
- **The lifecycle was proven end to end through curl** against the production-shaped stack,
  with a 30-second TTL: provisioned a tenant with 8 seeded rows and a real key, attacked a
  second tenant's record (403, `isolation.denied`), then waited. At t+30s the key returned
  **410 `tenant.purged`** — purged by the worker, with no endpoint called. The worker's own
  log recorded `"sweep complete","due":2,"purged":2,"failed":0`.
- **Post-purge database state confirmed directly**: records 0, live credentials 0, audit
  events retained, `purged_at` set. The audit trail reads `tenant.provision` →
  `record.read/denied` → `tenant.purge`.
- **No published ports.** Every container's port bindings are null and Postgres/Redis/worker/
  collector sit on an `internal: true` network. Two host ports did answer during the check and
  were traced to the owner's separately-running `electrical-db` and `electrical-caddy`
  containers — a different stack on the same machine, not this one.
- **109 spans reached the collector, 0 rejected**, including `lifecycle.purge_sweep`,
  `lifecycle.purge_tenant`, and `pg.query` spans carrying the real SQL text.
- The static surface is unregressed: all its gates green, `format:check` clean, `npm audit`
  0 vulnerabilities at production scope.

### Five defects found by running it, not by reading it

Recorded because each was invisible to typechecking and to review.

1. **`REVOKE ALL ON SCHEMA public FROM PUBLIC` broke both cross-tenant functions.**
   `BYPASSRLS` exempts a role from *policies* and grants no table or schema privilege
   whatsoever. Revoking PUBLIC's default silently removed `demo_definer`'s ability to resolve
   names, so both `SECURITY DEFINER` functions failed with **42P01 — relation does not
   exist**, not "permission denied", because a role that cannot see a schema cannot resolve
   names inside it. Authentication would have failed closed and the purge worker would have
   found no work, on a schema that migrated cleanly.
2. **The denial audit row was rolled back by the throw that denied the request.** The 403 was
   raised from inside `withTenant`, which rolls the transaction back — including the audit
   insert written moments earlier. Every blocked break-in logged nothing. §2.5 ends with the
   visitor reading the entry for their own attempt and there would have been none. Denial
   paths now commit, then signal.
3. **A purged tenant got a generic 401 instead of 410.** The purge revokes credentials and
   `auth_resolve_credential` filtered revoked rows out, so "your tenant reached its TTL and
   was destroyed" was indistinguishable from "unknown key". The function now returns
   revocation state and the caller decides; tenant status is checked before revocation
   precisely because the purge causes both.
4. **Every authenticated audit row recorded the same actor.** The public ref was parsed out of
   the API key by splitting on `_` — but the ref itself contains one, so
   `dmo_tnt_AbC123_<secret>` yielded `dmo_tnt` for every tenant alive. It typechecked and
   never threw. The ref now comes from the database and the parsing is gone.
5. **The OTel collector was rejecting every span.** A `file` exporter could not create its
   output directory in the distroless image, and because a failing exporter fails the batch,
   the pipeline dropped everything — including spans bound for the debug exporter. The API
   was emitting real spans the whole time and nothing was landing. Compounded by
   `telemetry.logs.level: warn`, which silences the debug exporter's own output, so the
   collector looked clean while receiving nothing.

### Engineering decisions — later phases inherit these

1. **`pg` directly, not Prisma.** RLS needs explicit control of the transaction boundary and
   the session setting, and P2's inspector has to show the real query plan, which means owning
   the SQL. The production platforms use Prisma; this service does not, and that is a
   deliberate divergence, not drift.
2. **`withTenant()` is the only doorway to tenant-owned data**, and it uses `SET LOCAL` via
   `set_config(..., true)`. A plain `SET` would persist on a pooled connection and leak one
   tenant's scope into the next tenant's query — the classic way RLS is defeated by its own
   plumbing. No other code may set `app.current_org`.
3. **Exactly two cross-tenant capabilities exist**, both fixed-signature `SECURITY DEFINER`
   functions owned by `demo_definer` (`NOLOGIN`, `BYPASSRLS`, owns nothing else). Adding a
   third is an architecture decision, not a per-PR call.
4. **The purge runs inside the tenant's own RLS scope.** The narrow hatch finds work; it never
   does work. A bug in the purge cannot reach another tenant's rows.
5. **Audit rows survive the purge**, deliberately, because §2.8 and A14 have the visitor
   leaving with them. P2's permalink reads `/v1/audit`.
6. **The demo answers 403 on a cross-tenant read; the ELES production suite asserts 404.**
   Both are right. Production must not confirm existence; the demo must be *seen* refusing,
   and a 404 is indistinguishable from a typo. §2.5 locks the 403. The response says which is
   which so no reader infers the hospital behaves this way. Enumeration is bounded by ids
   being uuids.
7. **The rate limiter fails open when Redis is down**, weighed rather than defaulted: A13 puts
   Cloudflare's limiter in front, so failing open degrades from two layers to one rather than
   none — and failing closed would turn a Redis blip into a total outage, which is the
   single-VM constraint. `/health/ready` reports it honestly, and health is never rate limited.
8. **A11's foundation is `exhausted_at` being a column.** Exhaustion is a representable state,
   so P2 implements "the model budget is spent" as a designed outcome with no schema change.
   `consumeTokens` clamps and stamps in SQL so two concurrent calls cannot both see headroom.
9. **A timer, not a cron library or a Redis queue.** The work is idempotent, discovery is one
   indexed query, and the advisory lock already makes concurrent workers safe — ADR-0004's
   reasoning about not adding infrastructure Postgres already provides.
10. **Migrations were iterated before first release.** `001` and `002` were amended three
    times against a disposable local database and have never run anywhere else. **That ends
    here**: from the first deployment, a change to the schema or to either function is a new
    migration, never an edit.

### Deviations and things deliberately not done

- **Nothing was deployed.** The VM is provisioned but this session has no host, user, SSH key,
  known-hosts entry, or tunnel token, and none can be invented. Everything up to the deploy is
  proven locally against the real production-shaped topology; the deploy itself is one
  `workflow_dispatch` once the secrets exist. Listed below.
- **No durable trace backend.** The collector receives and prints spans; choosing where they
  are stored depends on what P3's fanout needs to query, and picking early would mean picking
  wrongly. Recorded rather than quietly deferred.
- **Cloudflare edge rate limiting is not configured** — it is a dashboard rule, not repository
  state. A13 holds in the architecture and in Fastify's reasoning; the edge half is an owner
  action listed below.
- **No P2 functionality.** No payments, fraud, AI routing, or rate-limit demonstration. The
  budget model and the idempotency keyspace exist as foundations and nothing consumes them.

### OWNER-INPUT — open items

Static-surface markers unchanged at **thirteen**. P1 adds five, all deployment credentials:

1. **`VM_HOST`, `VM_USER`, `VM_SSH_KEY`, `VM_SSH_KNOWN_HOSTS`** as GitHub Actions secrets.
   The known-hosts entry is not optional — the workflow pins it rather than accepting any
   host key, because that channel carries every other secret.
2. **`CLOUDFLARE_TUNNEL_TOKEN`** from Zero Trust → Networks → Tunnels.
3. **`POSTGRES_USER`, `POSTGRES_PASSWORD`, `APP_DB_PASSWORD`, `IP_HASH_PEPPER`,
   `ADMIN_TOKEN`** — `openssl rand -base64 36` each. Production refuses to boot without the
   pepper and the admin token.
4. **`API_PUBLIC_URL`** as an Actions variable, for the post-deploy reachability check.
5. **A Cloudflare edge rate-limiting rule** in front of the tunnel hostname (A13).

### Next session

P2 — Proof engine. Five demonstrations as real endpoints emitting real spans and audit
records: the break-out plus the four stations. Read decisions 1–6 above first, and note that
the break-out's endpoint already exists and already denies — P2 makes it inspectable.

---

## P2 — Proof engine (Dossier §13) · 10 August 2026

### A note on deployment timing

The planning authority changed the deployment *timing* and nothing else: the complete
P1→P5 system is built and integrated locally first, and the VM deployment happens once the
implementation is finished. The architecture, the phase order, the demonstrations, and the
real-backend requirement are unchanged. The production-shaped Docker Compose topology remains
the integration environment, and P2 was exercised end to end against it.

### Shipped

Five demonstrations as real endpoints on the real P1 control plane — the four stations plus
the break-out, per the ruling. Each writes a real audit row and emits a real OpenTelemetry
span, and each is reproducible by curl.

- **`/v1/demonstrations`** — the unauthenticated catalogue: what each proves, the curl that
  reproduces it, the mechanism behind it. Stable ids; this is the contract P5 renders against.
- **Isolation** — `/v1/demos/isolation/inspect/:id` peels the membrane open (§2.5): the live
  policy predicate read from `pg_policies`, a real `EXPLAIN` plan, both layer results, the
  branch that returned 403, and the honest disclosure about production parity.
- **Payments** — `/v1/demos/payments/webhook` and `/verify`, HMAC-verified over the raw body,
  converging on one idempotent activation; `/keys/:key` opens the key that decided it.
- **Fraud** — `/v1/demos/fraud/evidence`, SHA-256 with a per-tenant unique constraint.
- **AI cost** — `/v1/demos/ai/ask`, a fixed intent table answering from SQL at zero tokens,
  escalating otherwise; `/intents` publishes the table.
- **Limits** — `/v1/demos/limits/hammer` on its own tight bucket.
- **The take-away (A14)** — `POST /v1/receipt` issues a stateless signed permalink; `GET
  /r/:token` renders the session, the predicate that blocked you, and the reproduction
  commands, and keeps working after the tenant is purged.
- Migration `003`: `payment_activation` and `fraud_submission`, both under the same two
  isolation layers, both destroyed by the purge.

### Verification record

- **103 tests, all passing** (51 new), against a real PostgreSQL with the real migrations.
  One file per demonstration, alongside the P1 suites.
- **Proved by breaking the mechanisms that do the work**, both reverted:
  dropping `payment_activation_key_unique` → 6 payments cases fail, including the concurrent
  one; dropping `fraud_submission_hash_unique` → 7 fraud cases fail. In both cases the
  demonstration collapses without the constraint, which is the point: the database decides,
  not the application.
- **The five-demonstration CI gate was proved by deleting a demonstration** from the built
  catalogue — the check reported `isolation,payments,fraud,ai-cost` and exited non-zero.
  Reverted.
- **All five proved end to end by curl** against the production-shaped stack (no published
  ports, reached through Caddy the way the tunnel does):
  - isolation → `403`, both layers refused, `qual` = `(tenant_id = app_current_org())`, and
    the plan's `One-Time Filter` carrying the policy expanded by the planner.
  - payments → four simultaneous signed webhooks returned exactly one `201 activated` and
    three `200 replayed`, `replay_count` 3; a forged signature returned `401`.
  - fraud → `201` then `409 rejected-duplicate` on the same bytes.
  - ai-cost → `data-plane`, `tokensCharged: 0`, answer computed from the tenant's real rows;
    then `model-plane`, `tokensCharged: 266`, budget decremented, provider absence disclosed.
  - limits → ten `200`s then `429`s.
  - receipt → rendered the session, the predicate, and the reproduction curl.
- **109→more spans reaching the collector, 0 rejected**, including `demo.isolation.inspect`,
  `demo.payments.activate`, `demo.fraud.submit`, `demo.ai.ask` with
  `ai.route=model-plane ai.tokens_charged=266`.
- **P1 is unregressed**: all 52 P1 tests still pass, plus a new one asserting the purge
  destroys the two P2 tables. **The static surface is unregressed**: all its gates green.
  `npm audit` 0 at production and full-tree scope; `format:check` clean.

### The honesty decision at the AI station

The model plane is a real HTTP call to a configured provider. No provider is configured
locally, and the station **says so** — it does not synthesise a reply. The routing decision,
the SQL, the token accounting, the span, and the audit record are real either way; the model's
answer is the one thing absent and it is reported absent.

This was the sharpest judgement call in P2. A stub that returned plausible prose would have
made the station look finished and made every real number beside it suspect. Principle 12 is
not suspended because a credential is missing.

Two ceilings, not one. Per-tenant budgets stop one visitor exhausting the estate; a Redis
day-keyed **estate-wide** ceiling stops the estate exhausting the owner's wallet, because
every visitor to a public demo can spend real money here. When Redis is unavailable the
global reservation **fails closed** — the opposite of the rate limiter's fail-open, and
deliberately so: the failure with a bill attached is the one to refuse.

### Defects found by running it

1. **The rate limiter was keyed by IP, not by tenant.** `keyGenerator` read `request.tenant`,
   but the limiter runs at `onRequest` and `requireTenant` runs in the handler — so the tenant
   was always undefined and every authenticated request shared one bucket. Behind Cloudflare
   that means one office exhausting everyone's budget: the exact failure keying by tenant was
   meant to prevent. Now keyed by a hash of the bearer token, available at `onRequest` with no
   database lookup.
2. **Empty-string environment variables failed the boot.** Compose's `${VAR:-}` substitutes
   an empty string, which Zod's `.optional()` reads as present-and-invalid — the API refused
   to start with "MODEL_API_URL: Invalid URL" for a setting nobody had configured. Empty is
   now treated as unset before parsing, which also makes a genuinely missing required value
   report `Required` rather than a confusing format complaint.
3. **A test file closed the shared pg pool between its own suites.** `stopApi` ends a module
   singleton that cannot be revived, so the second `describe` 500'd on every request several
   suites away from the cause. The harness now fails loudly with the reason instead.

### Two corrections to my own assertions

- I asserted the query plan would contain `app_current_org`. It does not — PostgreSQL expands
  the function body, so the plan carries `current_setting('app.current_org'…)` as a
  `One-Time Filter`. The real output is stronger evidence than the assertion I wrote, and the
  test now checks for what the database actually emits.
- The migration comment claimed a test asserted the P2 tables are purged. It did not, until I
  wrote one. A comment describing a test that does not exist is worse than no comment.

### An unresolved observation, recorded rather than smoothed over

One suite run reported 4 failures. I could not reproduce it across four subsequent runs,
including the identical command sequence, and I did not capture the failure output at the
time. The Redis model-budget counter — the one piece of state that accumulates across runs —
was at 3,171 of a 200,000 ceiling, so that is ruled out. The most likely cause is resource
contention: both the dev stack and the production-shaped stack were running, and the pool's
connection and statement timeouts are a deliberately tight 5s. **Production config was not
loosened to quiet a test-environment symptom.** Flagged here so a future session that sees it
again has the prior observation rather than discovering it fresh.

### Engineering decisions — later phases inherit these

1. **The catalogue's five ids are a contract.** `isolation`, `payments`, `fraud`, `ai-cost`,
   `limits`. P5 renders against them and a CI gate fails if the set changes.
2. **Denial paths commit their audit row, then throw.** The P1 rule, now applied in five more
   places. Any new refusal must follow it.
3. **The raw JSON body is retained** by a content-type parser so HMAC verification signs what
   arrived. Re-serialising would break every genuine signature.
4. **Every new tenant-owned table needs a line in the purge** and an assertion in
   `tenant-lifecycle-purge.test.js`. Two exist; a third that is forgotten would outlive its
   tenant.
5. **The AI router never generates SQL.** Adding a question means adding a hand-written
   parameterised statement to the intent table. There is no text-to-SQL path and there must
   not be one.
6. **The receipt is stateless and outlives the tenant.** P5's take-away UI reads `/r/:token`;
   it must not assume the tenant still exists.

### OWNER-INPUT — open items

Static-surface markers unchanged at **thirteen**. P1's five deployment credentials remain
open and are now deferred by decision rather than blocking. P2 adds two, neither blocking:

1. **A model provider** (`MODEL_API_URL`, `MODEL_API_KEY`, `MODEL_NAME`) if the AI station
   should return real model output. Without it the station is complete and honest about the
   absence; with it, the escalation path returns a real answer.
2. **`MODEL_DAILY_TOKEN_CEILING`** — currently 200,000/day estate-wide. This is a spending
   decision, not an engineering one, and should be set deliberately before the demo is public.

### Next session

P3 — Live spine. WebSocket telemetry, presence, event fanout. Two browsers must see each
other's events in real time. Note the binding constraint from the risk register: **presence
must be non-identifying by construction, not by policy** — and the audit and span data P3
fans out already exist, so P3 transports what P2 produces rather than inventing a second
event source.

---

## P3 — Live spine (Dossier §13) · 10 August 2026

### Shipped

- **`GET /v1/live`** — a WebSocket gateway carrying what the control plane is actually doing.
- **Migration 004** — an `AFTER INSERT` trigger on `audit_event` that calls `pg_notify`, plus
  `duration_ms` on the audit row.
- **`src/live/`** — the Postgres listener, the presence model, per-connection pseudonyms, the
  wire envelope P4 renders against, and the gateway.
- **Failure-output capture** — `scripts/run-tests.mjs` retains every run's full output, and CI
  uploads it as an artifact when the job fails.
- The health contract now includes the spine: a disconnected listener makes `/health/ready`
  return 503 with `livePlaneAvailable: false`.

### The database is the event source, and that was the design decision

P3 transports what P2 already produces. The obvious implementation — publish from the
application after writing the audit row — is wrong twice. It can announce a write that then
rolls back, which is the P1 bug in reverse. And it creates a **second emitter**: the row and
the event become two statements that can disagree, which is exactly the divergence rule 10
exists to prevent.

So the trigger is on the table. PostgreSQL delivers `NOTIFY` **only on commit**, so an event
cannot exist without a committed audit row and a committed row cannot fail to produce an
event — by mechanism, not by discipline. It also removes the need for a broker on this path,
since every replica listening to Postgres is notified directly.

**Redis therefore carries presence, not fanout.** `KEY.presence` is used as reserved.
`KEY.events` is not, and that is deliberate rather than an oversight: routing audit events
through Redis pub/sub would reintroduce the possibility of an event with no row behind it.
The key stays reserved for genuinely non-audit signals a later phase may need.

### Presence: what is stored, in full

A Redis sorted set of **random 128-bit per-connection ids** scored by last heartbeat, and a
short-TTL key per active tenant. That is the entire dataset. No address, no user agent, no
cookie, no session id outliving the socket, no join time, no link between the ephemeral id
and a tenant. The id is generated in memory on connect and is unrecoverable once the socket
closes. There is nothing to correlate because the correlating column does not exist.

A ZSET rather than a counter, because a counter needs a decrement on disconnect and a
decrement that never runs — killed process, dropped TCP — leaks the count upward forever. The
world would then report people who are not there, which is faked liveness by accident, and
principle 12 forbids that as firmly as faking it on purpose. A heartbeat-scored set can only
ever be too low for a few seconds.

**Other tenants appear under a per-connection pseudonym.** A random salt, held in memory for
the life of one socket, hashes tenant ids into `vol_…` labels. Stable within a session so a
volume stays itself; unrelated across sessions so nobody can be tracked. Proved: two watchers
saw the same underlying event under `vol_4pSUURKBeins` and `vol_9UrFalwbkQvK`.

### Verification record

- **121 tests, all passing** (18 new). The live suite runs against a **real listening port and
  real WebSockets** — `inject()` cannot upgrade a connection, and two in-process fakes sharing
  a bus would prove nothing about the transport.
- **Definition of done, proved through Caddy** against the production-shaped stack: three
  independent clients, one acting over HTTP, the others watching. `POST /v1/records` → 201,
  and both watchers received the event **41ms later**, same underlying event id. A 403
  break-out arrived live as `record.read / denied`. An unauthenticated watcher saw the world
  too (§2.3).
- **Non-identifying, proved not asserted**: the actor's real id never appeared on either
  socket; the two watchers saw different pseudonyms for it; a stranger's `correlationId` and
  `traceId` came through as `null`; and the presence message has exactly five fields — `at`,
  `connections`, `measured`, `type`, `windowSeconds` — asserted exhaustively so a future
  addition of anything identifying fails the test.
- **Motion is measurement, proved**: `durationMs=6` from a real measurement, commit-to-fanout
  of **7ms** computed from two real timestamps, and the purge event — which no request timed
  — carrying `durationMs: null` rather than 0. A test asserts that distinction specifically.
- **A rolled-back audit write emits no event.** Asserted directly by inserting inside a
  transaction and rolling it back.
- **Every delivered event has a matching audit row by id.** Asserted across a session.
- 269 spans reaching the collector, 0 rejected. P1 and P2 unregressed; the static surface
  unregressed; `npm audit` 0 at both scopes; `format:check` clean.

### The ruling task: failure output is now kept

`npm test` runs through `scripts/run-tests.mjs`, which tees stdout and stderr to
`test-output.log` with a header recording when the run happened and against which database.
CI uploads it on failure with a 30-day retention.

**Proved by breaking a test**: the log retained the full assertion diff, the file and line,
and the stack. Reverted. The runner deliberately does **not** retry — a retry that goes green
converts an intermittent defect into a tick, which is the opposite of the point.

The P2 flake has not recurred in any run since. It stays open rather than closed.

### The defect this phase found

**Twelve live tests failed on the first run, and the product was right.** Tests one to four
each opened a socket and left it open; the per-address ceiling is four; every connection from
test five onward was correctly rejected with `live.too_many_from_origin`. The cap was doing
precisely its job. The fix belonged in the tests — sockets now close after each case, which
is also what a real browser does — and the cap kept its real default so the ceiling test
still exercises it.

### Engineering decisions — later phases inherit these

1. **`src/live/envelope.ts` is the wire contract.** P4 renders against those types. A timing
   that was not measured is `null`, and the renderer **must** treat null as unmeasured rather
   than instant — drawing a fast packet for an untimed request is the decoration §1.3 rules
   out.
2. **Nothing is buffered or replayed.** A gap in the socket is a gap; events missed during a
   disconnect remain in `audit_event` and a client that wants them reads `/v1/audit`. P5's
   degraded mode reads `livePlaneAvailable`, it does not get a silent replay.
3. **The pseudonym salt never leaves the process and is never persisted.** Any future feature
   that needs a stable cross-session identity for another tenant is a product decision, not
   an implementation one, because it undoes the anti-correlation property.
4. **Subscriptions are `self` and `world` only.** `self` requires a credential on the socket.
5. **Browsers cannot set headers on a WebSocket handshake**, so the key may arrive as a query
   parameter and therefore may reach an access log. Accepted knowingly: the keys are
   short-lived, single-tenant, and scoped to a plane with nothing real behind it. Recorded in
   `gateway.ts` next to the code rather than only here.

### An observation the owner should see

The presence count is reported **honestly**, including when it is 1. The constraint asked that
a visitor not be able to infer they are alone; principle 12 forbids inflating the number, and
the principle wins. What keeps a quiet world from looking dead is that the event stream is not
only other humans — scheduled purges and expiring tenants are genuinely happening and are
genuinely broadcast. When the demo is quiet the visitor will correctly perceive quiet, and
`measured: false` distinguishes "nobody is here" from "we cannot tell". If the product wants
something stronger than that, it is a product decision and I have not taken it.

### OWNER-INPUT — open items

Unchanged. Static-surface markers at thirteen; P1's deployment credentials deferred by
decision; P2's model provider and spend ceiling deferred by ruling. P3 adds none.

### Next session

P4 — Render layer. R3F scene, lattice, volumes, packets, camera, shaders, **against
fixtures**, at 60fps on a mid-range device at tier 2. Binding: A5 makes those fixtures the
degraded-mode payload rather than throwaway scaffolding, A4 requires visitor-facing copy to
reach the build as data, and A8 keys quality tiers on sustained frame time rather than an
initial probe. The wire contract to render against is `src/live/envelope.ts`.

---

## P4 — Render layer (Dossier §13) · 11 August 2026

### Shipped

- **`apps/experience`** — React 19 + TypeScript strict + Vite, React Three Fiber, Zustand.
  Three-plane lattice, instanced tenant volumes, instanced packets, the isolation membrane,
  a camera rig with weight, and monospace labels rendered in the world.
- **Custom GLSL** for all four materials (`src/render/shaders.ts`).
- **The quality governor** (A8) — sustained frame-time tiers with hysteresis.
- **Real recorded traces** as the degraded-mode payload (A5), captured from the live plane.
- **The accessible document** — the authoritative reading of the system, always rendered.
- **`scripts/render-verify.mjs`** — ten browser-verified checks, local-only.
- `content/origin.json` — the origin, now shared by both surfaces.

### The interruption

This phase was interrupted by a Claude Code API connectivity error partway through render
verification. Nothing was lost and nothing was rebuilt: the working tree was intact, the
uncommitted work was inspected file by file, and the verification was re-run from the
recovered state rather than assumed. Recorded because "the tool disconnected" and "the work
failed" are different facts and the log should not let a future reader confuse them.

### Verification record

- **Ten browser checks, all passing**, against the built artifact served the way the Worker
  serves it. Re-run three times across the session, including after Prettier reformatted the
  source.
- **Sustained frame time on this machine: p50 4.5ms, p95 6.9ms, p99 8.5ms, 209.8fps over 1679
  frames** at tier 3, after a warm-up discard. Budget is p95 ≤ 19ms.
- **The governor demonstrably downgrades.** Under ~6x the pixels (1920×1080 at DPR 3) it went
  tier 2 → tier 1 with the reason `sustained p95 19.1ms over budget`, and in later runs was
  already at tier 1 before sampling began.
- **Reduced motion verified by execution**, not by the presence of a media query: the canvas
  is dimensionally stable across a 1.2s interval, the camera does not drift, packets do not
  travel, the membrane collapses to presence/absence, and the disclosure renders.
- **Degraded mode verified with a genuinely unreachable live plane** — no stub, no mock. The
  REPLAY badge appears, the heading explains, 8 recorded events replay, and the LIVE badge is
  **absent**: the surface never claims to be live when it is not.
- **WebGL removed at the prototype** (`getContext` returning null): the notice renders, the
  event log is present, zero canvases. The information survives the absence of the scene.
- Accessibility: one `h1`, canvas `aria-hidden`, one polite live region, skip link first in
  tab order and focused by the first Tab press.
- Zero horizontal overflow at 390, 834, and 1440.
- **P1–P3 unregressed**: 121/121 control-plane tests. Static surface unregressed: all gates
  green, `npm run verify` exits 0, `format:check` clean, `npm audit` 0 at production scope.

### What the performance number does and does not establish

It establishes that the scene is far inside budget **on this machine** — a desktop with a real
GPU. It does **not** establish the dossier's "60fps on a mid-range device at tier 2", and this
entry will not claim it does.

CPU throttling was tried first and is recorded because it proved nothing:
`Emulation.setCPUThrottlingRate` slows script execution and does not slow a GPU, so a
GPU-bound scene ran at 237fps under a 4x throttle and the governor correctly did nothing —
a test that would have passed for a governor that was never wired up. It was replaced with
real pixel pressure, which the scene does feel.

**A real mid-range device measurement remains outstanding and belongs to P8's hardening pass.**

### Engineering decisions — later phases inherit these

1. **The surface builds to `/live/`, not `/experience/`.** The first build overwrote the static
   site's `/experience` page and the link, confidential-parity, and machine-parity gates all
   failed within one run. The gates caught a real regression exactly as designed. `/live` also
   matches the socket it consumes.
2. **The wire contract is single-sourced**, aliased as `@contract` to
   `services/api/src/live/envelope.ts`. It is types plus one const, so it carries no Node
   dependency into the browser. **P5 must not copy it.**
3. **`content/origin.json` is now the one place the origin is written down.** It moved out of
   `astro.config.mjs` when this surface needed the same value for its own canonical; a second
   hardcoded copy would have gone stale silently while every gate kept passing. **P8's domain
   swap is this file, not the Astro config.**
4. **No transmission material.** §3.3 asks for translucent shells with refraction, and
   `MeshTransmissionMaterial` renders the scene again per object and composes badly with
   instancing — which is what dozens of volumes need. A fresnel shell with an interior term
   gets the read and instances cleanly. This is what makes the budget reachable.
5. **`durationMs: null` is never defaulted.** It draws a dashed packet, reads as "not measured"
   in the document, and the legend explains it. P5 must preserve this: a zero standing in for
   unknown would draw a fast packet for a request nobody timed.
6. **The document is always rendered**, never hidden when WebGL works. It is the accessible
   path and the authoritative reading; the canvas illustrates it.
7. **GSAP is declared nowhere yet.** It is the locked choreography tool and P4 has no
   choreography — the cold open and the beat timing are P5's. It arrives with the phase that
   uses it, because an unused dependency has no justification.
8. **`apps/experience/index.html` is Prettier-ignored.** Prettier normalises void elements to
   `<meta … />` and lowercases the doctype; html-validate requires the omitted end tag and an
   uppercase doctype, matching what Astro emits everywhere else. Both tools are right in their
   own remit and neither is configurable to agree, so the one hand-written HTML file matches
   the gate that ships. The meta description must also stay on **one line** — the parity gate
   matches it contiguously and Vite does not minify this shell.

### Budgets

The static surface is unchanged and still far inside its budgets — home 5.6KB gz, /about
4.6KB gz, /cv 6.4KB gz against 90KB.

The live surface carries 1.3MB of JavaScript uncompressed, **367KB gzipped** across three
chunks (three 182KB, app 122KB, React 60KB) plus 1.8KB CSS. That is **not** a breach of the
static surface's "client JS < 15KB gz": §11 scopes that budget to the static surface, and
`CLAUDE.md` records the split. A WebGL world cannot exist inside 15KB and the dossier never
asked it to — which is precisely why the fast lane exists as a separate surface (§6.2).

### OWNER-INPUT — open items

Unchanged at thirteen static-surface markers. P4 adds none. Deployment credentials remain
deferred by decision; the model provider remains deferred by ruling.

### Next session

P5 — Fusion. Render wired to live telemetry: the cold open, provisioning, the break-out
choreography, and the four stations. Done when every visual state traces to a real backend
event. Binding: A6 puts the arrival beat's PoP and RTT at the edge rather than the VM, A14's
receipt already exists at `/v1/receipt`, GSAP arrives here for the locked slow-stop-hold-resume
choreography, and decisions 2, 3 and 5 above must not be undone.

---

## P4 addendum — the Phase 1 lockfile incident, recurring · 11 August 2026

Appended rather than edited into the entry above, because the entry above declared local
verification complete and the push then failed. Both facts belong in the record.

### What happened

The P4 push (`4362390`) failed both workflows immediately, at `npm ci`, before any gate ran:

```
npm error `npm ci` can only install packages when your package.json and
npm error package-lock.json are in sync.
npm error Missing: @emnapi/runtime@1.11.3 from lock file
```

**The same package and the same failure mode as the Phase 1 incident**, which this repository
publishes as one of its own lessons. The cause was the same as well: the lockfile was
regenerated cleanly earlier in the phase and then patched incrementally by later `npm install`
runs as `@react-three/postprocessing` was added and `gsap` was removed. Rule 9.1 was followed
once and then not followed to the end.

### The part that is new, and that changes the rule

**`npm ci` passed on the development machine.** It was run, it succeeded, and it was not
evidence.

`@img/sharp-wasm32` requires `@emnapi/runtime` only on platforms where the wasm path is
selected. Windows never needs the entry; Linux always does. So a lockfile can be genuinely
complete for the machine that generated it and genuinely incomplete for the machine that runs
CI, and a clean install locally cannot tell the two apart.

Phase 1's rule was "local green proves the source was correct, not that the lockfile was
complete — only a clean install from the lockfile alone can do that." That rule is now
insufficient as written. The corrected form:

> **A clean install proves the lockfile is complete for the platform that ran it.** After any
> dependency change, regenerate the lockfile and verify `npm ci` on the platform CI uses, not
> only on the development machine.

### How it was fixed

Diagnosed by reproducing the CI environment rather than guessing: the repository's manifests
were mounted into a `node:24-bookworm-slim` container and `npm ci` was run there, which
produced the error in one attempt. The lockfile was then regenerated **inside that container**,
copied back, and `npm ci` verified on both platforms — 679 packages on Linux, 688 on Windows,
no errors on either. The `@emnapi/core`, `@emnapi/runtime`, and `@emnapi/wasi-threads` entries
are now recorded.

Everything was re-verified on the regenerated tree before the second push: `npm run verify`
exits 0, 121/121 control-plane tests, 10/10 render checks, formatting clean, audit clean.

### Completion standard met

Run `31487468329` (CI) — **26 steps, 26 success, 0 skipped, 0 non-success**.
Run `31487468312` (API) — **24 steps, 23 success, 1 skipped**; the skip is the
`if: failure()` test-output upload, correctly not running because nothing failed.

Both verified at step level on `b00dfdb`, not inferred from the run conclusion.

### Standing rule for P5 onward

Dependencies change in every remaining phase. **Regenerate the lockfile in a Linux container
and verify `npm ci` there before pushing**, every time. The one-line form:

```sh
docker run --rm -v "$PWD:/repo" node:24-bookworm-slim sh -c '…npm install…'
```

A local `npm ci` remains necessary and is no longer sufficient.

---

## P5 — Fusion (Dossier §13) · 11 August 2026

### Shipped

- **The render layer wired to the real control plane.** `src/live/api.ts` is a typed client
  for the endpoints P1 and P2 built; there is no mock layer and no demo mode.
- **The cold open** (§2.2) — real edge PoP and a real measured round trip (A6), the browser's
  actual TLS state, real provisioning, and geometry assembling at a pace set by that
  measurement.
- **The break-out choreography** (§2.5), locked: slow → stop → **hold** → resume, with the
  audit pulse ~200ms after the resume. GSAP, per the locked stack.
- **The four stations plus the boundary** (§2.6), each hitting the real P2 endpoints.
- **Stations as real URLs** (§2.9) — `/live/isolation/`, `/live/payments/`, `/live/fraud/`,
  `/live/ai/`, `/live/limits/`, each a built page with its own title, description, and
  canonical.
- **The take-away** (§2.10, A14) — the signed receipt permalink from `/v1/receipt`.
- **The cold open plays once per visitor**; returning visitors land already provisioned.

### Verification record

**21/21 browser checks**, six of them new and run against a **real control plane** — a real
Postgres, a real Redis, the real migrations, the real API process. Nothing is stubbed.

- Arrival reports a **real measured round trip** (4ms locally) and prints `edge unknown`
  rather than inventing a location when the trace endpoint is absent.
- A **real tenant** was provisioned by the control plane: `tnt_XA5oG1HZbQdT`.
- The break-out is refused by the real service: **403 — "That record does not belong to your
  tenant."**
- The inspector carries the **live predicate read from `pg_policies`**:
  `(tenant_id = app_current_org())`. Not a description of it.
- The refusal **returns over the socket as a real audit event** and appears in the log.
- The surface reports **LIVE when it is genuinely live** — one live badge, zero replay badges.
- All five station URLs return 200 with correct per-station canonicals.
- P4's checks all still pass: p95 6.6ms / 192fps, governor reacts under pressure, reduced
  motion, degraded mode, WebGL absent, three viewports.
- Static surface unregressed: all gates green, `npm run verify` exits 0. 121/121 control-plane
  tests. Formatting clean.

### The defect the fusion check caught

**The socket subscribed to `world` only, so the visitor's own events were silently dropped.**

That was correct in P4, where the surface had no tenant of its own. In P5 it is a bug with a
sharp edge: the gateway routes an event to `self` when it belongs to the subscriber and to
`world` when it does not, so a world-only subscription discards exactly the audit row §2.5
ends on — the visitor reading the record of their own attempt. The scene looked right, the
403 was real, and the one thing missing was the beat the whole peak builds toward.

Nothing else would have caught it. The check that did is the one asserting the refusal comes
back over the socket, which exists because P5's definition of done is that every visual state
traces to a real backend event — not that it looks like it does.

### Engineering decisions — P6 inherits these

1. **The verification harness PROXIES the control plane** rather than pointing the page at a
   second origin. In production both sit behind one Cloudflare origin, so the browser makes
   same-origin calls; testing across two ports would exercise a shape that never ships and
   would need CORS headers the production service is right not to have.
2. **The browser uses the CLIENT-VERIFY payment path, never the webhook.** The webhook needs
   an HMAC over the raw body and that secret is a server secret — shipping it in a bundle
   would hand every visitor the ability to forge a signed webhook and make the signature
   verification the station demonstrates meaningless. The client path is the other half of the
   same dual-path activation and is what a real checkout return does.
3. **The break-out target is a real second tenant**, provisioned on demand, whose record id is
   then attacked. A fabricated uuid would produce a 403 that proved nothing.
4. **`__API_BASE__` / `__LIVE_URL__` are runtime overrides** so a PRODUCTION build can be
   pointed at a local control plane without rebuilding. The artifact under test is then the
   artifact that ships.
5. **The session lives in localStorage**, holds only a short-TTL demo key, and is discarded
   when past its TTL rather than reused — a stale key would produce a world full of 410s with
   no explanation.
6. **Time dilation is applied to the R3F clock at the root**, so one number slows the entire
   world. That is why the timeline exposes `timeScale` instead of animating each element.
7. **The authored choreography is the ONLY authored motion on this surface**, and it is
   authored because §2.5 authored it. It fires on a real 403 and represents an event that
   genuinely happened. Everything else remains measured.

### Known limitations

- **The station interactions have no automated coverage beyond the isolation break-out.**
  Payments, fraud, AI and limits are verified through their P2 API tests (121 passing) and by
  hand in a browser; the browser harness drives only the break-out end to end. Recorded rather
  than hidden: extending the harness across all five is P8 hardening work.
- The arrival beat's PoP reads `edge unknown` locally because `/cdn-cgi/trace` only exists on
  a Cloudflare-proxied host. It will resolve a real colo in production; that is a deployment
  observation, not a code path change.

### OWNER-INPUT — open items

Unchanged. Thirteen static-surface markers; deployment credentials deferred by decision; the
model provider deferred by ruling.

### Next session

P6 — Estate and record. Four-system zoom-out (§2.7), case studies in context (§2.8), honest
health. The three other platforms are **explicitly not attackable** and carry only
already-published facts — dossier §15 leaves hospital telemetry permissions unanswered, so
the estate layer shows what the case studies already publish and nothing more.

---

## P6 — Estate and record (Dossier §13) · 11 August 2026

### Shipped

- **The scale reveal** (§2.7) — the demonstration plane resolves into one node of four, beside
  the hospital, menu, and electrical platforms.
- **Case studies in context** (§2.8) — each production node links to its case study and
  carries its disclosed limitations, read after the visitor has operated the system.
- **Honest health** — one node is live and attackable; three are neither, and say so.

### The estate reads the machine layer. It does not re-author it.

`/api/profile.json` is generated at build from the same content collections the case-study
pages render, and a CI gate already asserts the two cannot disagree. So the estate fetches it.
Re-typing three platforms' names, statuses, and limitations into this surface would have
created a **third** copy — and a third copy drifts, always in the flattering direction. Rule
10 exists for exactly this.

A test asserts the statuses shown match the machine layer's exactly, so a future edit that
starts hardcoding them fails rather than merely looking fine.

### The contrast is the point, and it is enforced

§2.7: *this one is yours to break; those three are load-bearing and I am not letting you near
them.* Implemented as data rather than styling — `attackable: false` and `liveSignal: false`
are properties of the three production nodes, and a check asserts exactly one node is
attackable. A second attackable node would not be a visual slip; it would be the page
inviting somebody at a system other people depend on.

**No live signal is claimed for any production platform.** Dossier §15 leaves hospital
telemetry permissions unanswered, and until they are answered the estate shows only
already-published facts. The node says so in words — that nothing is shown *rather than
something estimated* — and a check asserts that sentence is present.

### Verification record

**26/26 browser checks**, five of them new, run three consecutive times with identical
results:

- The estate resolves into **4 nodes**.
- **Exactly one is attackable**; three are load-bearing.
- Statuses match the machine layer exactly: `IN PRODUCTION — HOSPITAL`, `LIVE`,
  `PRE-LAUNCH (Q3 2026)`.
- **9 disclosed limitations** shown in context.
- No live signal claimed for the production platforms.
- All P4 and P5 checks still pass, including the fusion against a real control plane.
- Static surface unregressed; `npm run verify` exits 0; formatting clean.

### The test defect this phase found

The fusion suite failed once — `the refusal returns as a real audit event over the socket` —
and then passed twice in a row. It was not flake and it was not the product.

`locator.isVisible({ timeout })` **evaluates once and ignores the timeout entirely.** The
check had always been a race: the denial has a genuine journey to make — commit, NOTIFY,
gateway, socket, store, render — and the assertion was sampling a single instant. It had been
passing on luck.

Replaced with `waitFor({ state: 'visible' })`, which genuinely retries. Three consecutive
full runs at 26/26 afterwards.

Worth recording because the instinct on a one-off failure is to re-run and move on. Re-running
was the right first step and the wrong last one: two green runs would have buried a check that
proved nothing on a mechanism the whole peak depends on.

### Engineering decisions — P7 inherits these

1. **The estate is data, not markup.** `attackable` and `liveSignal` are fields on the node.
   Anything that wants to change what a node offers changes the data, where a test can see it.
2. **The three production nodes link to the STATIC surface's case studies** by relative path.
   The absolute URLs in `profile.json` carry the configured origin, which is correct there and
   unnecessary here — a relative link works on whatever origin is serving.
3. **P7 must not add a second estate.** The static surface already publishes these three
   systems at `/systems/*`; this is the same content rendered in context, from the same
   source. If P7 reconciles anything, it reconciles toward `profile.json`.

### OWNER-INPUT — open items

Unchanged and now load-bearing for this phase: **hospital telemetry permissions** (§15). Until
answered, the estate shows published facts only. The node's wording already states the reason,
so answering it later is a content change rather than a redesign.

Thirteen static-surface markers, deployment credentials, and the model provider all remain as
recorded.

### Next session

P7 — Fast lane and machine layer: static surface reconciled, SEO, no-JS, low-power, agent
layer. The static surface is already built and gated; P7 reconciles it with the live surface
that now exists beside it, and must not undo decision 3 above.

---

## P7 — Fast lane and machine layer (Dossier §13) · 11 August 2026

### The finding this phase existed to catch

**The live surface was unreachable from the site.** It shipped across P4, P5 and P6, and
nothing on the static surface pointed at it — the most unusual thing this portfolio has was
also the least discoverable, and no gate noticed because every gate checked one surface at a
time.

That is the reconciliation §13 names, and it had three halves: a human path, a machine
description, and an honest statement of which surface is authoritative for what.

### Shipped

- **Home links to the live surface.** A quiet invitation rather than a third hero button: the
  two locked buttons are blueprint §2's and their wording is not mine to reorder, and §3.9
  invites rather than instructs. The description is deliberately flat — the thing itself is
  more persuasive than an adjective would be.
- **`profile.json` carries a `demonstration` block** — the URL, the catalogue endpoint, what
  it is, and the disclosure that it is a demo and **must not be reported as one of the three
  production platforms**.
- **`llms.txt` gains "Verifying the claims rather than quoting them."** Most of this site is
  assertions a reader has to trust; the demonstration is not. An agent is pointed at
  `/v1/demonstrations`, which returns all five with a reproducible command each.
- **`scripts/fastlane-check.mjs`** — a new truth gate, wired into `npm run verify` and CI.

### Why the demo is described but kept out of `systems[]`

`profile.systems` is the three production platforms, and a screener quoting it is quoting the
CV's claims. Adding a fourth entry would inflate the count of systems this engineer operates —
exactly the drift rule 4 forbids. So the demonstration is a **sibling field**, described fully,
labelled a demo twice, and carrying an explicit instruction not to fold it in.

A gate asserts `systems.length === 3` and that no entry matches /demo/i.

### Verification record

**15 fast-lane checks**, all passing, over the built artifact — offline and browser-free, which
is why this one belongs in CI beside the other truth gates rather than in the local-only render
harness.

**Proven by breaking it, three ways, each reverted:**

| Injection | Caught |
|---|---|
| Home's `/live/` link repointed | *"nothing on the static surface pointed at /live/"* |
| Demo pushed into `systems[]` | *"should hold exactly the three production platforms, found 4"* |
| `/live/` added to the sitemap | *"a noindex page in the sitemap is a contradictory instruction"* |

Also verified: the live surface is `noindex` and absent from the sitemap, so the two surfaces
are not competing for the same queries; the no-JS path leads to a real destination; the static
home page still loads **zero** bundled JavaScript; and every own-origin URL the machine layer
promises resolves to a built file.

The external links in `profile.links` are deliberately **not** checked here — LinkedIn and
GitHub are somebody else's to serve, and their reachability is a quarterly maintenance concern
rather than a build one. The link gate makes the same split; the first version of this gate did
not, and failed on three URLs it had no business asserting about.

Everything else unregressed: `npm run verify` exits 0 across six gates, 26/26 render and fusion
checks, 121/121 control-plane tests, formatting clean.

### Engineering decisions — P8 inherits these

1. **`gate:fastlane` runs in CI.** It is offline and needs no browser. Do not move it into the
   render harness, which needs a GPU and stays local.
2. **The demonstration stays out of `systems[]` permanently.** If a later phase wants the demo
   in a machine-readable list of systems, that is a product decision about what this engineer
   claims to operate.
3. **`/live/` is `noindex` and out of the sitemap, and must stay so.** The static surface is
   the SEO and machine layer; two canonical copies of the same claims competing for the same
   queries is the divergence rule 10 exists to stop.
4. **P8's Lighthouse enforcement will meet a new page.** `/live/` is a WebGL surface carrying
   367KB gz of JavaScript and will not score like the static pages. It is `noindex`, its
   budgets are the §11 experience budgets rather than the static ones, and the thresholds
   should be applied to the static surface as blueprint §7.5 specifies — Home and the flagship
   case study — not blanket across both.

### OWNER-INPUT — open items

Unchanged: thirteen static-surface markers, deployment credentials, the model provider, and
hospital telemetry permissions.

### Next session

P8 — Hardening and launch: adversarial and load testing, WAF, Lighthouse enforcing,
accessibility, domain, runbook. Carried forward as explicitly outstanding: **the real
mid-range device performance measurement from P4**, and **the missing security response
headers** recorded as a P8 defect in the P0 review.

---

## P8 — Hardening and launch (Dossier §13) · 14 August 2026

Dossier §13 lists six things for P8: adversarial and load testing, WAF, Lighthouse
enforcing, accessibility, domain, runbook. Four were completed. The two that could not be
honestly finished are named in full at the bottom rather than quietly counted as done.

### The defect P0 recorded, finally closed

The P0 review fetched the live origin and found it sent **no security response headers at
all** — no CSP, no HSTS, no `X-Content-Type-Options`, no `Referrer-Policy`. For a site
whose subject is security engineering that is the wrong thing for a reader to discover.

`scripts/emit-headers.mjs` now generates `dist/_headers` **as part of the build**, so it
cannot go stale relative to what it describes. Verified against the installed wrangler
bundle rather than from memory: it declares `HEADERS_FILENAME = "_headers"`, so this stays
a static-assets deployment with no Worker script and no request-time code.

**The CSP is computed, not written.** The static surface carries inline scripts, and a
policy with `'unsafe-inline'` would pass a scanner while permitting exactly the injection
CSP exists to stop. So the script bodies in the build are hashed and precisely those are
allowed. Two policies, because the surfaces genuinely differ: the static pages get
`connect-src 'none'` — they load no bundled JavaScript and have nothing to talk to — and
`/live/*` gets `script-src 'self'`, `connect-src 'self'` and `worker-src blob:`, which is
what three needs and nothing wider.

### The harness had to become more honest before it could check this

Applying the real policy in `render-verify` exposed two things about the harness itself.

**The fusion tests were pointing the socket at a different origin than the page.** In
production both surfaces sit behind one origin and the WebSocket is same-origin; the
harness was using a cross-origin socket, which `connect-src 'self'` correctly refuses. The
fix was not to widen the policy — it was to proxy the WebSocket upgrade through the
harness origin, so the test now exercises the topology that actually ships.

**And that broke the degraded-mode check, which had been passing on an accident.** It
asserts the surface degrades when the live plane is unreachable, and the plane was
unreachable only because the harness did not forward WebSockets. The moment it did, the
socket connected and the check failed. It now runs against a **second origin serving the
same build with no control plane behind it** (`DEAD_PORT`), so the plane is absent by
construction. One subtlety cost a run: passing `undefined` for the upstream took the
default parameter and quietly proxied to the live plane — it has to be `null`.

**Proven by breaking it, both ways, both reverted:**

| Injection | Caught |
|---|---|
| Unhashed inline script added to `dist/index.html` | browser refused it; both the CSP-refusal check and the hash-coverage check failed |
| `Referrer-Policy` stripped from `dist/_headers` | *"missing referrer-policy"* on all three pages |

### Lighthouse enforcing — and it found two real defects

Flipped from `warn` to `error`, `continue-on-error` removed from the job. P7's log warned
that `/live/` would meet these thresholds badly; it is excluded deliberately, with the
reason recorded in `lighthouserc.json`: it is a WebGL surface whose budgets are the §11
experience budgets, verified against a real GPU by the render harness. Scoring it as a
static document would measure the wrong contract. `/dev/components/` is excluded as a
noindex gallery that ships no claims.

**The accessibility threshold was extended past the two pages blueprint §7.5 names, to
every indexed route** — Lighthouse's accessibility category *is* axe-core, so this is the
"axe in CI" gate T18 asks for, with no new dependency. Extending it immediately failed two
routes that had never been audited:

- `/systems/` — `h1` straight to `h3`, a skipped level.
- `/experience/` — the same, and the later "What transferred" heading was an `h2`, so the
  document ran `h1 → h3 → h2`.

`SystemCard` hardcoded `h3`. That was right on Home, where the cards sit under a section
header, and wrong on `/systems/`, where they follow the `h1` directly. **A card cannot know
its own heading level — that is a property of where it is used, not of what it is.** Both
components now take the level as a prop and style by class rather than by tag, so they look
identical at either level. `ExperienceCard` already had the prop; it just did not allow
`h2`.

Final: **9 routes × 4 categories, all 100, worst of three runs.**

### Adversarial testing — 47 attacks, all refused

`scripts/adversarial.mjs` attacks a running control plane over a real socket, which asks a
different question from the unit suite: not "does this handler reject this?" but "is there
any way in?" Every attack asserts two things — a refusal that is not a 500, and a body that
leaks no stack frame, no SQL, no driver text and no filesystem path.

Coverage: seven authentication attacks, including that a credential in the query string or
in an `X-Api-Key` header must **not** authenticate, so keys cannot leak into access logs
and referrers; cross-tenant reads and four header-spoofing attempts at the org id; nine
injection payloads through both a path parameter and a body field that is genuinely written
to the database; prototype pollution; oversized, deeply nested and malformed bodies;
content-type and method confusion; three attempts at the internal purge plane; disclosure
checks; and the limiter.

**Run against the production-shaped Compose stack, not a dev process** — the real container
behind the real `Caddyfile`, with the real 120/minute limit. `infra/compose.local.yml`
publishes Caddy on `127.0.0.1:8080` **only**, and stubs `cloudflared`. It is never
deployed: the deploy workflow copies `compose.yml`, `Caddyfile` and `otel-collector.yaml`
and nothing else.

**Two of my own assertions were wrong, and finding that out was the point.**

1. I asserted the isolation inspector must refuse with a 4xx. It answers **200 by design** —
   explaining the refusal *is* the demonstration, and it publishes its own SQL and query
   plan on purpose. The assertion now checks the property that actually matters: both layers
   report `rowsReturned: 0`, and the explanation quotes **no part** of the row it refused.
2. I asserted a burst would be rate limited, and it was not — because the plane I was
   attacking ran at 2000/minute, not the 120 default. A false finding produced by a test
   believing it knew the configuration. It now reads `x-ratelimit-limit` from the service
   and bursts past whatever that is.

**Proven by breaking it, reverted:** `ALTER TABLE demo_record DISABLE ROW LEVEL SECURITY`
produced *"rows=0/1"* — the app-layer org scope still refused, and the database returned
the foreign row. That is the clearest evidence in this repository that **RLS is
load-bearing and not decoration**, and that the two layers are genuinely independent.
Restored and re-verified end-to-end: both layers refusing, `rlsEnabled` and `rlsForced`
true.

### Load testing — and a measurement that was lying

`scripts/loadtest.mjs`, with no new dependency: the workload has to be authenticated and
tenant-scoped, which autocannon or k6 would have needed a custom script for anyway.

The first version reported excellent percentiles. They were **rejection latency** — one
credential exhausts its budget in the first 120 requests and everything after is a cheap
429, which then dominated the numbers. That is precisely the flattering measurement rule 2
exists to stop. It now keeps served and refused latencies apart, and drives a pool of
tenants so that real work is actually served.

Measured 14 Aug 2026, win32/x64, 20 logical CPUs, generator on the same machine as the
service:

| Concurrency | Requests | Served p50 / p95 / p99 | Errors |
|---|---|---|---|
| 1 | 9,060 | 3.0 / 4.7 / 5.9 ms (n=840) | 0 |
| 8, 32, 64 | 186,311 | budgets exhausted — the limiter absorbed the level | 0 |

**195,371 requests answered, zero 5xx, zero dropped connections, healthy afterwards.** The
served path is the full authenticated one: credential lookup, `withTenant` transaction,
`set_config`, RLS-filtered query. No latency threshold is asserted, deliberately — the
generator shares a CPU with the service, so any number chosen would be a property of this
laptop, and a gate that fails on a busy machine teaches people to ignore it.

### Runbook

`docs/MAINTENANCE.md` — what is running and why there is no inbound port, how to run both
stacks, what each gate actually proves, deploy and rollback, routine operations, six
incident playbooks, a release checklist, quarterly maintenance, and a closing section on
**what the runbook does not claim**.

### Verification record

`npm run verify` exits 0 across seven gates · 121/121 control-plane tests · 35/35 render
and fusion checks · 47/47 attacks refused · load suite OK · Lighthouse 100/100/100/100 on
all nine indexed routes, enforcing · formatting clean.

### Engineering decisions — inherited by whatever comes next

1. **`dist/_headers` is a build artifact and must stay one.** Hand-editing it would let the
   hashes drift from the scripts they authorise, and the failure mode is a blank page.
2. **The accessibility threshold applies to every indexed route, permanently.** A screen
   reader does not care which route it landed on. Performance stays scoped to the two pages
   §7.5 names, so a heavier page added later fails on the thing that matters rather than on
   a budget never written for it.
3. **Components take their heading level from where they are used.** Do not hardcode it.
4. **`compose.local.yml` never deploys.** The loopback binding is load-bearing — an
   unqualified port would publish to every interface, which on a cloud VM is the internet.
5. **Do not raise a rate limit to make a suite pass.** The adversarial suite failing to
   provision means it has been run four times in an hour, which is the limiter working.

### OWNER-INPUT — open items

Unchanged: thirteen static-surface markers, deployment credentials, the model provider, and
hospital telemetry permissions. Plus, now explicitly:

- **The domain.** P8 lists it and it is not done. The swap itself is a one-line change to
  `content/origin.json`, which is the single place the origin is written down — but the
  domain is an owner decision, and no deployment has happened.

### NOT PROVEN — stated plainly

Two P8 items could not be honestly completed in this environment, and neither is counted as
done:

- **The WAF.** Cloudflare's WAF and edge rate limiting are console-side settings on a real
  zone, not reproducible from this repository. The design (A13) assumes them and the
  topology is built for them. Until they are configured, **the edge tier of the defence is
  a plan, not a fact.** The origin-side tier — Caddy refusing `/internal/*`, the
  per-credential limiter, tenant-scoped authorisation, RLS — is real and is proven above.
- **The mid-range device measurement, carried from P4 and still outstanding.** The render
  harness measures a real GPU: the one in this machine. It is not a mid-range phone, and CPU
  throttling approximates one without being one. **The §11 claim of 60fps on a mid-range
  device at tier 2 remains unverified.** It needs a physical device. It was not faked.

Also recorded so it is not mistaken for a result: the local Redis rate-limit counters
(`rl:*` only) were cleared between suites, because the load test legitimately exhausts the
10/hour provisioning budget. That is local test-state hygiene. **No limit was changed**, and
the limiter refusing was itself observed and recorded as correct behaviour.

---

## P9 — The redesign: colour becomes a register, and the world stops being wallpaper

**Scheme: dossier §13 roadmap.** Owner-directed, following an explicit reset of the creative
objective: the site was working, deployed and honest, and it still read as a conventional dark
developer portfolio. Design decisions were delegated in full. Nothing in the Truth Constitution
was touched.

### The diagnosis, before any code

Four structural causes, not a shortage of polish:

1. **One accent doing five jobs.** Green was links, the LIVE badge, focus rings, the contact
   button and text selection. When one colour means five things it means nothing, and a page
   where every interactive and every status share a hue is indistinguishable from any other
   dark template. This was the single largest cause.
2. **One material.** `--bg-raised` with a 1px border, repeated until it was wallpaper.
3. **One composition.** Six consecutive homepage sections were the same object: `.band` >
   `.container` > `SectionHeader` > grid > link.
4. **The live surface's 3D was decoration.** A 62rem opaque document column sat centred over
   the scene, so the world survived only as two strips down the margins.

### What changed

- **A five-entry semantic register** (`--signal`, `--pending`, `--isolation`, `--record`,
  `--fault`). Colour now carries exactly one axis: what state a thing is in. Old names are
  retained as aliases so no call site was churned.
- **Links left the accent.** They are text-coloured with a permanent underline that fills to
  signal on hover — a *stronger* affordance than the old transparent-until-hover rule, and it
  frees the register to mean something. Navigation is exempt: position already identifies those.
- **The indexed section.** A numbered hairline spine anchored to the container, which is the
  site's structural signature and lets sections differ wildly in shape without the page losing
  its spine.
- **The homepage became seven distinct compositional modes** — opening, evidence rail, recessed
  live well, ledger, editorial post, manifest, closing — replacing six copies of one.
- **`/systems` became a register**, and each entry now shows the limitation that system
  discloses about itself, on the index, before a visitor has committed to reading anything.
  The text is the collection's own. This is the page's most distinguishing feature and it cost
  nothing but nerve.
- **The live surface's document column was narrowed and moved off-centre**, so the world has
  continuous screen area to occupy and the panels read as instruments standing in a space.
  Panels went from 82% opaque to 62% with a heavier blur. Its palette was synced to the static
  register: crossing from home into the live plane no longer looks like crossing sites.

### Two real defects found in my own work, by measurement not by eye

- **`--text-faint` failed AA at 3.89:1** on the page ground and 3.60:1 on a raised surface —
  and it was carrying *content* (stack lists, "as of Jul 2026" qualifiers, post dates), not
  decoration. Solved numerically to `#768095`, which clears 4.5:1 on all three grounds.
- **The link underline was invisible** at 1.53:1. It is the affordance identifying every link
  on the site. Now 4.87:1.

### The gate was strengthened, never loosened

`contrast-check` could not read `--accent: var(--signal)` and exited 1 — the gate reporting a
palette failure when the only fault was its own parser. Aliases now resolve transitively, and
the enforced list went from **12 pairings to 25**, including every new register entry on every
ground it is painted on. Proven by injection: restoring the old `--text-faint` value produced
three FAILs and a non-zero exit; reverting returned 25/25.

### An amendment, recorded rather than assumed

Blueprint §5 assigned the green accent to links and focus states. That clause is **amended**,
on the owner's explicit instruction to take the colour decisions. The locked meaning of
isolation-cyan (§12.1) was not loosened but tightened — it now names a tenancy boundary and
nothing else, on both surfaces.

### A locked-content removal I caught in my own diff

Rebuilding the hero silently dropped the four locked §2 status chips, and **no gate covers
them**. They are restored, verified present in the built output rather than in source. The
wording is untouched. Worth noting as a gap: locked hero content has no automated guard.

### Verified

`npm run verify` 7/7 gates · typecheck 0 errors · `api:verify` 121/121 · `render-verify` 41/41
including zero horizontal overflow at 390/834/1440 · `format:check` clean · homepage 7.3 KB gz
against a 90 KB budget, static JS 0.02 KB gz against 15 KB · 25 contrast pairings.

**Reduced motion was verified by execution, differentially**: under `reduce`, 16 reveal nodes
are painted before any scroll and the observer is never armed; under `no-preference`, 14 are
correctly staged. Content is never withheld from a visitor who asked for less motion.

No change to `services/`, `infra/`, or `.github/` — confirmed at zero files. No secrets in the
diff.

### Not done, and not counted as done

`/about`, `/experience` and `/engineering` inherit the new palette, type scale and section
openings — verified rendering correctly — but keep their card-based internal layouts. They were
lifted by upgrading `SectionHeader` rather than rebuilt. The 3D world's geometry is unchanged;
what changed is the composition it sits in. The mid-range device measurement carried from P4
remains outstanding.


---

## R0/R1 — The reference reconstruction: decomposition, two rulings, and the kit · 22 August 2026

**Scheme: a new one, and it is named here to stop a third numbering fight.** `R0..R6` is the
reference-reconstruction roadmap in `docs/REFERENCE_DECOMPOSITION.md` §4. It is not the dossier
§13 `P0..P8` roadmap, which completed at P8, and it is not the original static eight-phase plan.
Owner-directed, following the delivery of ten approved visual references in `design-references/`.

### What prompted it

Ten reference images were supplied as approved visual targets — explicitly not inspiration, and
explicitly not to be implemented as flat background images. The directive required each to be
decomposed on thirteen axes, each major object assigned an implementation medium, and one shared
visual system built rather than ten unrelated scenes.

### Three collisions with locked items, found by reading the references against §12

This is the finding the phase existed to produce, and it was found before any code:

1. **Cyan.** §3.4/§12 lock cold white-cyan to the isolation boundary "and nothing else, ever."
   Cyan is the most-used hue in the reference set — plate rims, grid lines, TLS arrows, packet
   beads, LIVE glows. **Resolved without asking, because the rule permits one resolution:** a
   rule may never be loosened. Structural edges took a new `--structure` tone that is
   deliberately NOT a register entry, the data plane took ember as material temperature (which
   §3.3 already sanctions as a measurement), and `isolationCyan` is unchanged and now rarer.
2. **The register.** §3.2 records a design-review correction rejecting "volumetric glowing
   shapes in darkness" as forgettable genre. The references are exactly that. **Escalated.**
3. **The narrative.** §2.1/§12 lock a five-beat arc in one continuous take. The references show
   a ten-section site with a persistent nav. **Escalated.**

### The two rulings

Put to the owner and answered the same day.

- **C2 — reference form, evidence content.** Composition, lighting, depth and material language
  are reconstructed at full fidelity. §3.2 survives as *provenance* rather than as restraint:
  **nothing emits light unless it is carrying a real measurement; an unlit panel means idle, not
  unstyled.** This is stricter than §3.2 as written — that clause restrained saturation, this
  restrains cause.
- **C3 — one take, ten camera stations.** The references' numbered nav becomes a visible station
  index, not page links. Both were satisfiable at once because the reference nav is a persistent
  overlay, not evidence of page loads.

### The truth reconciliation, which is most of the design work

The reference images are AI-generated and their numbers are inventions; several name figures the
constitution specifically forbids. Every one was checked and dispositioned in
`REFERENCE_DECOMPOSITION.md` §3 — uptime percentages, tenant and user counts, throughput,
service and region counts, and six fabricated archive totals are all struck. **The composition
survives in every case; only the content of the slot changes.** Two are worth naming here: the
demo plane is unlabelled in references 02 and 06 and gains a label under rule 11, and reference
09's `7,842 / 128K / 14.6K / 22.1K` become the repository's real record — 12 decisions, 5
evidence chips, 2 lessons, 14 integration tests, as of 22 Aug 2026. Two orders of magnitude
smaller, and the correct outcome: the drawer labelled DECISIONS opens onto twelve decisions a
person actually wrote.

### Shipped (R1 — the kit, no reference scene yet)

- `kit/glow.ts` — the glow rule as a module rather than a comment, so violating it has to be
  deliberate. `Measurement = number | null`, and null returns darkness rather than a default.
- `kit/Plate.tsx` (K1), `kit/Chip.tsx` (K2), `kit/Conduit.tsx` (K3), `kit/Core.tsx` (K4).
- `kit/stations.ts` — the ten camera stations in one coordinate space. This file is why the
  result is one world rather than ten scenes.
- `kit/CameraRig.tsx` — the only thing permitted to move the camera, which is what makes a cut
  unwritable rather than merely discouraged.
- `kit/LabelLayer.tsx`, `kit/InstrumentPanel.tsx`, `kit/kit.css` — every word in the references
  as real HTML, projected in one pass.
- `bench.html` + `src/bench.tsx` — dev-only, above reference 05's density.

### Verification record

- Experience typecheck: **0 errors** under `exactOptionalPropertyTypes`.
- `npm run verify`: **exit 0**, all gates green — copy-check 17 markup + 7 machine artifacts,
  link-check 177 references, contrast 25/25, confidential-parity 6, machine-parity 21,
  fastlane 15. No shipped surface regressed.
- **The glow rule proven by injection, not asserted.** 16/16 assertions pass. Then the classic
  defect was injected — `measurement ?? 0` in `glow()` and `durationMs ?? 40` in
  `speedFromLatency()` — and **5 of the 16 failed**, including "null measurement emits nothing"
  and "null duration draws no packet". Reverted uncommitted; 16/16 restored. The check is real.
- **The bench proven not to ship.** `npm run build:experience`, then grepped the whole of
  `dist/` for its title: not found. Vite's build input is `index.html` alone, so a root-level
  HTML file is served in dev and is not a build input.

### Two defects found in my own kit, before anyone else saw it

- `Conduit` oriented beads with `lookAt()` after writing the curve tangent into `Object3D.up`.
  `lookAt` derives orientation *from* `up`, so the look direction and the up vector were
  parallel and the result degenerate — beads would flip or collapse exactly where the curve
  bends most, which is where the eye is. Replaced with `setFromUnitVectors`.
- The same loop allocated a `Vector3` per bead per frame. At the bead counts references 02, 05
  and 06 show, that is thousands of short-lived objects a second and a GC pause visible as a
  dropped frame — which, in a world where motion is a measurement, is the renderer lying about
  latency it did not have.

### Not done, and not counted as done

**No reference scene exists yet.** R1 is the kit and the bench only; references 01–10 are R2–R5.
The 60fps claim is **not** made: the bench renders and typechecks, but no frame-time measurement
was taken on a mid-range device, and the P4 mid-range measurement remains outstanding — this
phase does not close it. `Housing` (K6), `Drawer` (K7), `Globe` (K8) and `Field` (K10) are
specified in the decomposition and not built. The membrane (K9) already ships and was not
touched. The "I operate." gradient in reference 01 is flagged as a register casualty with a
recommendation recorded, awaiting an owner ruling.


---

## R2 — Reference 01 (ENTER), reconstructed from the kit · 22 August 2026

**Scheme: reference-reconstruction roadmap** (`docs/REFERENCE_DECOMPOSITION.md` §4). The first
reference scene, built entirely from the R1 kit. Owner-directed: stop expanding the planning
layer, build 01-ENTER against the approved image, continue incrementally.

### Shipped

- `kit/CityField.tsx` (K5) — instanced terrain with a deterministic layout, plus a ground plane.
- `scenes/enter.ts` — the scene as data: seven stack tiers and five capability satellites, so
  the geometry and the annotation layer read one list and cannot drift apart.
- `scenes/EnterScene.tsx` — the 3D half. Composed only of `Plate`, `Core`, `Conduit`,
  `CityField`, `LabelProjector`. No geometry in it that another reference could not reuse.
- `scenes/EnterOverlay.tsx` + `scenes/enter.css` — the interface half, every word real HTML.
- `content/copy.ts` gains an `enter` block; A4 still holds, so it reaches `copy.json` and the
  copy gate scans it.
- `styles.css` gains the rest of the static surface's register and type scale.

### Three defects found by rendering it, not by reading it

1. **`LabelLayer` could not work as written.** It returned DOM but needed `useFrame`, so it was
   mounted inside the Canvas and R3F handed the `<svg>` to the three.js reconciler:
   "Svg is not part of the THREE namespace", and the entire scene rendered as nothing. DOM and
   scene graph are two reconcilers and one component cannot be in both. Split into
   `LabelProjector` (in-canvas, writes screen positions) and `LabelOverlay` (DOM), sharing one
   mutable projection object.
2. **The experience surface was missing half its design tokens.** `--text-display` was undefined
   here, so reference 01's hero — the largest type in the entire design set — rendered at the
   browser's default heading size. Anything styled against an undefined token fell back
   silently, which is the worst failure mode a token can have.
3. **The plate window mask streaked.** Built from box `uv`, which is 0..1 per face, so on a
   21 x 0.5 slab a square cell stretched into a band down the sides. Rebuilt from local
   position, which also gives cells a constant world size across plates of any footprint.

### The glow rule leaked, and the leak was measured

Rendering the scene with every measurement removed (`?dead=1`) showed a faint scatter of cells
still emitting. The cause was a constant term — `(0.32 + 1.15 * uGlow)` — so at `uGlow = 0`, the
honest value for a layer nothing has measured, six percent of cells still lit at 0.32. An idle
plate was quietly claiming a trickle of activity it did not have.

Scaling purely by `uGlow` fixed it. **Measured over the subject region: pixels above threshold
went 0.86% to 0.34% unmeasured, against 13.79% measured — a 40x separation between a system that
is working and one that is not.** The residual 0.34% is structural rim light, which is
consistent with the precedent already shipped in `World.tsx`: structure is visible at rest,
activity is earned.

### A locked-content violation I introduced, caught, and then gated

The hero was line-broken as **"I design, / I build, / and I operate"** — which matches the
reference's rhythm and is **not** the locked claim. It silently added two pronouns to
`SITE.claim`, wording that blueprint §1 locks and whose change requires an amendment. Reference
fidelity lost; the locked sentence now reads verbatim down the lines.

P9 recorded that locked hero content has **no automated guard**. R2 walked straight into that
gap, so the gap is now closed: `copy-check` asserts that the experience hero's display lines,
rejoined, are exactly the locked claim — against the **built** `copy.json`, not source.
**Proven by injection:** restoring the defective lines produced
`copy-check: FAILED — the experience hero is not the locked claim`, printed both strings, and
exited 1. Reverted; passes. The gate was added, never loosened.

### Post-processing is off, and that is a finding rather than a preference

`@react-three/postprocessing` 3.0.5 / `postprocessing` 6.39.4 / three 0.185.1 / R3F 9.7.0 are
all inside each other's declared peer ranges — checked, not assumed — and the composer still
renders this scene roughly **four times darker** than no composer at all: mean 5.9 against 23.1
over the subject region. Neither `frameBufferType={HalfFloatType}` nor `flat` (NoToneMapping)
moved the number by a single unit, ruling out the two usual causes.

Rather than light a scene around a bug I do not understand, the glow the reference needs comes
from geometry I control: additive halos on cores, emissive cells on plates. That is also cheaper
— no extra render targets — which the mid-range 60fps budget cares about more than it cares
about mip-blurred bloom. `?bloom=1` still mounts the composer so the defect stays reproducible.
**Recorded as unresolved, not as fixed.**

### Verification record

- Experience typecheck **0 errors** under `exactOptionalPropertyTypes`.
- `npm run verify` **exit 0** — copy-check (now including the locked-claim assertion),
  link-check 177, contrast 25/25, confidential-parity 6, machine-parity 21, fastlane 15.
  `format:check` clean.
- **The bench still does not ship.** Built, then grepped all of `dist/` for its title: absent.
- The scene was verified **by looking at it**, seven captures at 1680x1050 through
  `playwright-core`, each compared against `design-references/01-enter`. Framing, satellite
  placement and cell density were each corrected against measured evidence rather than adjusted
  by feel.

### Reference fidelity: what matches and what does not

Matching: the stepped seven-tier ziggurat, the plasma apex with vertical shafts, the left
annotation column with hairline leader rules, the right-hand capability satellites on tethered
conduits, the dark city receding into fog, the three-tier typographic hierarchy, the metrics
row over a hairline, the bottom-centre trace panel, and the empty left third the type occupies.

**Not yet matching, stated plainly:** the satellite labels overlap the geometry in places; the
base plate runs past the right edge; the city is dimmer than the reference's; and there is no
bloom, so emissive detail does not bleed the way the reference's does. None of these are
blocking and all are tuning rather than structure.

### Truth reconciliation applied to this frame

The reference's `REQUESTS/MIN 2,487 · AVG LATENCY 32ms · UPTIME 99.99% · ERROR RATE 0.02%` is
gone. Uptime and error rate are forbidden outright by rule 7; the other two are inventions. The
four metrics are now things this page genuinely measures about the visitor's own session — edge
round trip, events this session, tenant reference, tenant expiry — and each says *not measured*
or *not provisioned* when it has none. The reference prints an IP address; this prints the real
edge PoP, or nothing when the edge named none. The reference has **no demo label anywhere**;
rule 11 requires one, so it takes the eyebrow slot above the hero — the most prominent position
in the frame.

### Not done, and not counted as done

References 02–10 are unbuilt. The scene is **not yet wired to the live control plane** — it runs
on synthetic measurements in the dev bench, which is labelled as such, and `App.tsx` is
untouched, so the shipped `/live` surface is exactly as P9 left it. Wiring it in replaces
composition shipped in P4/P5/P9 and is its own step. No frame-time measurement was taken on a
mid-range device; the P4 mid-range measurement remains outstanding.


---

## R3 — Reference 02 (SYSTEMS), and a syntax failure worth recording · 22 August 2026

**Scheme: reference-reconstruction roadmap.** Station 02 built from the R1 kit, plus the kit
additions it forced. Also records a build failure caused by my own tooling habit.

### Shipped

- `scenes/systems.ts` — the estate as data: four islands, the shared core, the dissection index.
- `scenes/SystemsScene.tsx` — 3D, composed only of `Plate`, `ChipField`, `Core`, `Conduit`,
  `CityField`, `LabelProjector`. No geometry unique to this station.
- `scenes/SystemsOverlay.tsx` + `scenes/systems.css` — hero, dissection index, island register,
  estate overview.
- `content/copy.ts` gains a `systems` block, so the copy gate scans it.
- Kit additions, all reusable: `Plate` gained `shape: 'disc'`; `LabelLayer` gained gutter-aware
  placement; projected labels gained a legibility shadow.

### The failure that stopped the run

`npm run check` exited 2 with `TS1005` and `TS1109` in `SystemsOverlay.tsx`. Cause: a scripted
in-place patch left unbalanced JSX — it closed the register column early and emitted an extra
closing tag. **The lesson is about method, not about JSX.** Structural edits to nested markup
were being applied with text substitution, which cannot see nesting; the same habit produced two
earlier defects this session, both times by putting a backtick inside a GLSL template literal
and silently terminating the string. Structural edits now go through a real editor pass.

### Four islands, not three, and the content is real

The reference shows three platforms. There are four nodes, because §2.7 says the system the
visitor was inside resolves into one node of four and is the smallest — so the demo plane is the
fourth and is labelled a demo (rule 11). Titles are verbatim from
`apps/static/src/content/systems/`. The reference's "HOSPITALITY OPERATIONS" is a misrendering of
"hospital … operations" and rule 7 forbids naming the hospital regardless.

**Each card carries the system's disclosed limitation, with its date qualifier, on the index** —
rule 3, and the P9 precedent of disclosing before a visitor has committed to reading anything.
The reference's "12 Services Online" is an invention; that slot reads *not measured*.

### Six visual defects found by rendering, and what fixed them

1. **The engineering core was square.** The reference's core is concentric machined discs.
   `Plate` gained `shape: 'disc'`; reference 06's control ring will reuse it.
2. **Chips rendered as black holes** in every island. They used `meshStandardMaterial` in a world
   that has no key light (§3.7), so a 0.1 ambient multiplied them to black. Now unlit, like the
   plates and the city, plus a structure floor so an unmeasured chip reads as present rather
   than as a hole — most visible on the pre-launch island, which correctly has no traffic.
3. **Labels overprinted the hero and the register.** Fixed in the kit, not per-scene:
   `LabelProjection` now carries reserved gutters, and a label flips away from one or hides
   rather than being drawn over body text. Anchor positions had been hand-nudged twice to dodge
   this and broke on every camera change.
4. **That gutter rule then regressed station 01** — its architecture column is *supposed* to sit
   in the band left of the stack, and a left gutter flipped all of it onto the geometry. Caught
   by re-rendering ENTER. Station 01 now declares no left gutter.
5. **The estate overview fell below the fold.** It was last in the column with `margin-top:auto`,
   which fails as soon as the cards exceed the viewport. Now `position: sticky; bottom: 0`, so it
   holds at any height and any number of nodes.
6. **Three labels clustered at the horizon.** The first attempt separated them by *height*, which
   made it worse — distant objects compress toward the horizon under this camera, so height moved
   two labels into the band the core label already owned. Separation comes from world placement;
   label height only trims each to sit near its own island.

### Verification record

- Typecheck **0 errors**; `npm run verify` **exit 0** — copy-check including the locked-claim
  assertion, link-check 177, contrast 25/25, confidential-parity 6, machine-parity 21,
  fastlane 15. `format:check` clean.
- **Station 01 re-verified after every shared-kit change.** The glow rule still separates a
  working system from an idle one by **14.6x** measured lit pixels over the subject region
  (40.8% against 2.8%).
- The bench remains absent from `dist/`.

### Not done, and not counted as done

The fourth register card is partially behind the sticky overview at scroll-top; it clears on
scroll. Stations 03–10 are unbuilt. Neither station is wired to the live control plane — both run
on labelled synthetic measurements in the dev bench, and `App.tsx` is untouched, so the shipped
`/live` surface is still exactly as P9 left it. No mid-range frame-time measurement has been
taken; the P4 measurement remains outstanding.


---

## 03 / DISSECTION · 22 August 2026

Third station of the ten-section reconstruction, built from the shared kit.

### Shipped

- `kit/Sparkline.tsx` — Canvas 2D trend line. Six of the ten references use one; an empty
  series draws nothing rather than a flat line at zero, because an absent measurement and a
  still system must not look alike.
- `scenes/dissection.ts` — seven architecture layers, the tenant volumes, the trace stages.
- `scenes/DissectionScene.tsx` — exploded frost slabs, tapered drop arrows, service-mesh core,
  three tenant shells under the isolation boundary.
- `scenes/DissectionOverlay.tsx` + `dissection.css` — hero, live health panel, metadata sidebar,
  seven-stage request trace.
- `Plate` gained `lift` and `opacity`, driving the reference's top-to-bottom glass gradient.

### What is dissected, and why it is not what the reference dissects

The reference dissects a named production platform. This dissects the **demo plane**. Station 02
establishes the true claim that all four nodes run one stack, so the architecture is shared — but
only the demo plane's internals can be opened live, and rule 7 forbids opening the hospital one
at all. Dissecting a system we cannot show the inside of would make this frame a diagram.

### Truth reconciliation

The reference's health panel (availability 99.99%, error rate 0.02%, latency 35ms, throughput
2.48K req/s) and quick stats (26 services, 3 databases, 7 event streams, 12.4K active users,
99.90% uptime) are all forbidden or invented. Replaced with things this page measures about its
own session, and with repository counts that are countable at build time. `KUBERNETES` corrected
to Docker Compose; `AMS AP-SOUTH-1` to the real measured PoP or nothing; the `v3.7.4` row removed
entirely rather than filled.

**The trace strip is the sharpest case.** The reference prints a confident millisecond figure
against all seven hops. This system times the span, not each hop inside it — so a stage shows a
duration only where one was really recorded, the rest show an em-dash, and a filled node versus a
hollow ring makes the difference visible without reading a number.

### Visual corrections, each found by rendering

1. Stack overflowed the frame and slabs spanned it edge to edge — footprints cut by ~35%, camera
   pulled back and shifted so the label column gets its band.
2. All seven layer labels flipped onto the slabs. A left gutter was declared for this station and
   should not have been: like station 01, its label column belongs in the band left of the stack.
3. Tiles read as a merged blob — spacing up, size down.
4. **`frost` was declared per layer and never passed through**, so all seven slabs rendered
   identically and the stack read as seven sheets rather than a section through one object.
5. **A glow-rule failure, caught by measurement.** The frost edge terms were unconditional, so a
   layer nothing had touched lit its glass as brightly as a busy one — measured separation
   between a working stack and a dead one was **2.3x**. Tied to glow with a structural floor, the
   same shape the PCB rim already used: now **32.4x**.

### Verification

- Typecheck **0 errors**; `npm run verify` **exit 0** (copy-check incl. locked-claim assertion,
  link-check 177, contrast 25/25, confidential-parity 6, machine-parity 21, fastlane 15);
  `format:check` clean.
- Stations 01 and 02 re-rendered after every shared-kit change and unregressed; 01's glow-rule
  separation still **14.6x**.

### Not done

The isolation label's second line still grazes a slab edge. Stations 04–10 unbuilt. No station is
wired to the live control plane yet — all three run on labelled synthetic measurements in the dev
bench, `App.tsx` untouched, shipped `/live` still as P9 left it. Mid-range frame-time measurement
still outstanding.


---

## 04–10 · The remaining seven stations, in one continuous run · 22 August 2026

Owner-directed: finish stations 04 through 10 without stopping between them. All seven are
camera stations inside the world stations 01–03 already established — one coordinate space, one
kit, one interface language.

### Shared systems added

- `kit/Housing.tsx` (K6) — machined enclosure. Datastores (04), lab core (05), control ring (06),
  archive cabinet (09).
- `kit/Field.tsx` (K10) — GPU point field, all motion in the vertex shader. 05's GPU field and
  shader surface, 08's haze.
- `kit/Globe.tsx` (K8) — earth as a wireframe graticule.
- `kit/Sparkline.tsx` — Canvas 2D trend line, used by six references.
- `Plate` gained `shape: 'disc'`, `lift`, `opacity`.
- `scenes/StationChrome.tsx` — the top rail, extracted after it had been copied verbatim three
  times. That duplication is exactly how ten camera stations quietly become ten websites.
- `scenes/overlays.tsx` — the interface halves of 04–10 in one module, for the same reason.

### The globe has no textures, and that is a truth decision

The decomposition budgeted albedo, night-lights and normal maps for reference 06's earth. They
were not built. The reference's globe is covered in glowing city lights across continents this
project has no presence in — a map of a global footprint that does not exist. Rendering it fully
lit would be a claim; lighting only the two real regions on a photographic earth would look
broken. So the globe is a graticule, the two real places are marked and explicitly **unlit
because unmeasured**, and the one genuinely measured reading — the visitor's own edge round trip
— is the only lit marker on it. A control room showing one true reading and admitting the rest
is a better object than one showing six invented ones. It also ships no image assets.

### 07 has no portrait, and says so

There is no headshot in this repository; `/about` already carries an OWNER-INPUT marker for one.
A placeholder volume was tried at the subject's position and removed — at that camera it read as
a black blob, which is worse than an absence. The frame is composed as a recently-vacated desk
instead, which is what §4 asks for anyway, and the overlay states plainly that no owned
photograph exists yet.

### Visual corrections, all found by rendering

- **04** camera was at ground level inside the scene; twice reframed. Its floor read as a few
  enormous pale rectangles — `windows` is cells per world unit, so thinning it out did the
  opposite of what was wanted. Density up, brightness down.
- **05, 07, 09** all shipped over-bright floors for the same reason and were cut back.
- **06** globe filled the frame; radius cut and camera pulled back. The platform row floated in
  void until a deck was put under it — a control room needs a floor.
- **09** camera was inside the cabinet; drawers were nearly as large as the housing.
- **08, 10** read correctly first time.

### The copy gate caught me

`copy-check` failed on `dist/live/copy.json`: the word **placeholder**, which rule 9 bans in
built output. It was in station 08's own copy, in a sentence saying the empty cube is *not* one.
The gate was right and was not touched — a gate that reads intent is not a gate. Reworded.

### Verification

- Typecheck **0 errors** under `exactOptionalPropertyTypes`.
- `npm run verify` **exit 0** — copy-check incl. the locked-claim assertion, link-check 177,
  contrast 25/25, confidential-parity 6, machine-parity 21, fastlane 15. `format:check` clean.
- **All ten stations rendered and inspected**; every one reports a live WebGL context and
  projecting labels. Stations 01–03 re-verified unregressed after every shared-kit change.
- Bench still absent from `dist/`. All seven new copy blocks confirmed reaching `copy.json`,
  where the gate scans them.

### Not done

No station is wired to the live control plane — all ten run on labelled synthetic measurements in
the dev bench, `App.tsx` is untouched, and the shipped `/live` surface is still exactly as P9 left
it. That wiring, and the camera flights between stations, are the remaining work. No mid-range
frame-time measurement has been taken; the P4 measurement is still outstanding. Reference 11
(SYSTEM MAP) remains deliberately out of scope.

---

## Audit — the asset pipeline's defects, and the state of the deployed origin · 30 September 2026

**Scheme: dossier §13 roadmap.** Not a phase. An owner-requested read of the whole repository
against the deployed origin, and the repairs that read justified. No locked item was touched.

### The finding that matters most: nothing since 23 August is deployed

`origin/main` is at **065f51e**, HEAD is at **f27b961**. The commit that puts the ten-station
world on the static surface has never been pushed, and the asset pipeline that makes it
shippable is not even committed. A fetch of the origin confirms it rather than infers it:
`https://kishanthorat.com/` returns 200 with **zero** occurrences of `visual-world` and zero
`.vw` elements. The visual world is absent from the live site because it was never sent.

This is the CI-proves-the-artifact / only-a-fetch-proves-it-is-reachable rule arriving from the
other side. The artifact was correct for five weeks. Nobody had checked that it was reachable.

### The control plane is down, and the surface is honest about it

`https://kishanthorat.com/health`, `/health/ready` and `/v1/tenants` all return **530 with
Cloudflare error 1033** — the tunnel has no connection. The VM or `cloudflared` is not running.
Every demonstration the dossier is about is therefore unavailable to a visitor today.

Rule 12 holds under the failure, which is the one good thing here: the built `copy.json`
carries "The control plane did not answer. Nothing was provisioned." and "Its telemetry is
unreachable right now, so this page is replaying a real recording and saying so." The surface
degrades and says so. It does not manufacture a tenant. Nothing was changed here.

### Four real defects in the uncommitted asset pipeline, each proven by execution

1. **The pipeline could not run at all.** `optimize-visual-world.mjs` still read
   `apps/static/public/visual-world` as its masters directory after the masters had moved to
   `visual-world-masters/`. It was reading the directory it now writes. Run: `no PNG masters
   found — nothing to optimise`, exit 1. Fixed to read `visual-world-masters/`; re-running now
   encodes all ten and reproduces the manifest **byte-identically** (`md5 a09b4479…` before and
   after), which is the only evidence worth having that an encoder is deterministic.

2. **A manual copy sat in the middle of an automated pipeline.** The script wrote to
   `build/visual-world`, the site read `apps/static/public/visual-world/`, and a human was
   expected to connect them. That is how the plates ended up produced but untracked. There is
   one output directory now — the served one — and the R2 uploader reads the same directory, so
   a plate served locally and a plate in the bucket are the same bytes by construction.

3. **Content-hashed output had no pruning.** Re-encoding writes a new filename and left the old
   one in a directory Astro copies verbatim, so superseded artwork would deploy forever. Proven:
   injected `01-enter.deadbeef.avif`, re-ran, `Pruned: 1 orphaned file(s)`, 21 files → 20.

4. **`build/` was added to `.gitignore` with a comment describing a copy step that no longer
   exists.** Corrected to describe what the directory actually holds — benchmark measurements,
   not deliverables.

### A silent failure the CSP was holding ready for the next person

`emit-headers.mjs` hard-coded `img-src 'self' data:`. The visual world reads its origin from
`PUBLIC_VISUAL_WORLD_BASE`, whose entire purpose is to move the ten plates to an R2 custom
domain. Setting it would have moved every plate to an origin the policy forbids — and a
`background-image` refused by CSP **fails silently**: no broken image, no console error visible
in the page, no layout change. Every station degrades to the graphite ground, which looks
deliberate, on a build that passes all seven gates. That is the third time the visual world has
had a failure of exactly this shape.

`img-src` is now derived from the same variable the build reads. Proven both ways:
unset — the shipping configuration — the policy is **byte-identical** (`img-src 'self' data:`);
set to `https://assets.kishanthorat.com/visual-world` it becomes
`img-src 'self' data: https://assets.kishanthorat.com`, origin only, no path, no wildcard. A
value that is neither absolute http(s) nor root-relative exits 1 rather than guessing.

### Smaller corrections

- `plateExists()`'s surviving `LOCAL_BASE` constant was dead after the manifest rewrite, and the
  comment above it still described the deleted `existsSync` behaviour. Removed, and the reason
  the predicate is deliberately *not* a filesystem check is now recorded where it is made.
- The header comment claiming `apps/static/public/visual-world/` is EMPTY was five weeks stale.
- `USING_CDN` was exported and never imported.
- `package.json`'s description had its em dash rewritten as a `\u2014` escape by a tool.
- `index.astro` imported `Button` and `EvidenceChip` and used neither, left by the P9 rebuild.

### The dependency audit is red, and it is the gate that will stop the push

`npm audit --omit=dev --audit-level=high` **exits 1**: 1 critical, 4 high, 3 moderate in the
production tree — `astro <=7.2.7` (critical), `fast-uri`, `js-yaml`, `sharp`, `svgo` (high),
`fastify`, `ip-address`, `devalue` (moderate). `fastify`, `fast-uri` and `ip-address` are in the
**control plane** — the surface this project invites people to attack — and two of them are SSRF
and X-Forwarded-* spoofing. CI's first step fails before anything else runs.

This was **not** fixed here. The standing contract requires that a dependency change delete
`node_modules` and the lockfile, install fresh, and verify `npm ci` reproduces **on Linux**, and
that lesson was learned twice in this repository. Patching it incrementally to go green is the
exact move the log already records as a mistake. It is an owner decision, logged, not taken.

### Verified

`npm run verify` **exit 0** — typecheck 0 errors, build clean, copy-check 26 markup + 7 machine
artifacts, link-check **310** internal references across 26 files, html-validate clean,
contrast **25/25**, confidential-parity 6, machine-parity 21, fastlane 15. `format:check` clean.
Asset pipeline re-run end to end, deterministic, with pruning proven by injection. Plates
confirmed loading **in a real browser against the built output**, not in source: all ten
stations reach `data-ready="true"`, the eager station paints from `data-avif`, and the lazy nine
load on intersection.

### Not done, and not counted as done

Nothing is committed and nothing is pushed — the origin is still five weeks behind and that is
the owner's call to make. The dependency audit is red. The control plane is offline. Reference
06's plate ships a fully lit photographic earth on the static surface, which is the same claim
about a global footprint that `ThinkScene`/`Globe` explicitly refused to render on honesty
grounds — the two surfaces disagree about the same fact and only one of them was argued. The
mid-range device frame measurement carried from P4 remains outstanding. Source maps (5.4MB) are
served from `/live/assets/` with no recorded decision either way.


---

## S1 — Stage A: unblocking the ship · 30 September 2026

**Scheme: a repair stage, not a dossier phase.** Owner-directed, following the audit entry
above: take the decisions that entry logged rather than escalated, and get the world live.

This entry **supersedes** the audit entry's "Not done" paragraph on the dependency audit. That
paragraph recorded the audit as an owner decision, not taken. The owner has since directed it
to be taken properly. The audit entry is not edited — this is the correction.

### The dependency audit, fixed the way principle 1 requires

`npm audit --omit=dev --audit-level=high` exited 1: **1 critical, 4 high, 3 moderate** in the
production tree. CI would have failed at its first step before any gate ran.

**No version range in any `package.json` changed.** Every caret already permitted the fixed
version — the lockfile was simply pinned to stale resolutions, which is worth recording because
it means the declared dependencies were never wrong, only the resolution was. `node_modules`
and `package-lock.json` were deleted, installed fresh, and `npm ci` verified to reproduce the
tree **byte-identically** (`diff` clean). Nothing was patched incrementally and `npm audit fix`
was never run. Result: **0 vulnerabilities**.

| package | was | now | why it mattered |
|---|---|---|---|
| astro | 7.1.6 | 7.3.5 | critical |
| fast-uri | 3.1.4 | 3.1.8 | high — SSRF, host confusion. **Control plane.** |
| js-yaml | 4.3.1 | 4.3.2 | high |
| sharp | 0.35.3 | 0.35.4 | high |
| svgo | 4.0.2 | 4.1.0 | high |
| fastify | 5.11.3 | 5.12.5 | `X-Forwarded-*` spoofing. **Control plane.** |
| ip-address | 10.5.0 | 10.7.2 | SSRF. **Control plane.** |
| devalue | 5.9.0 | 5.9.4 | — |
| ioredis | 5.11.1 | 6.0.0 | major, within the declared `^6.0.0` |

Docker was not available for a local Linux container, so the Linux reproduction is CI's own
`npm ci` step, which MAINTENANCE §8 accepts and which this push exercises.

### A real concurrency defect the rebuild surfaced, which was never about dependencies

Six integration tests failed in the purge path after the rebuild. The error named its artifact
exactly, so it was read rather than guessed at:

```
XX000  tuple concurrently updated
where: SQL statement "ALTER ROLE demo_definer NOLOGIN BYPASSRLS"
       at bootstrapRoles (db/migrate.ts)
```

`migrate()` was idempotent **by content** and had never been safe **by concurrency**. Node's
test runner schedules files in parallel; each calls `ensureSchema()`; two sessions then update
the same `pg_authid` row, which Postgres refuses. The suite had been getting away with it on
timing.

**This is not a test-only defect.** Two API replicas starting together do precisely the same
thing, and the production entrypoint runs `migrate` on boot. The suite found a real one.

`migrate()` now holds a session-scoped `pg_advisory_lock` for its whole run — the primitive
`worker/lock.ts` already uses and ADR-0004 already chose, so the pattern a reader finds here is
the pattern that already ran. Deliberately **blocking**, and deliberately the opposite of the
sweep's `pg_try_advisory_lock`: a sweep already running need not run twice, but a caller that
*skipped* migration would carry on against a schema it has not verified, which is the one thing
a migration runner exists to prevent. Released in the same `finally` that ends the connection,
and Postgres drops session advisory locks when a connection closes, so a crashed migrator
leaves nothing to reap.

Proven by reproduction, not by re-running until green — `run-tests.mjs` exists specifically to
stop that. The exact pair of files that raced (`tenant-lifecycle-purge`,
`demo-rate-limit-and-receipt`) failed reproducibly before, and passed **23/23 three consecutive
times** after. Full suite **121/121, twice**.

### Verified

`npm run verify` exit 0 · `npm run api:verify` exit 0, 121/121 · `format:check` clean ·
`npm audit --omit=dev --audit-level=high` exit 0, 0 vulnerabilities · `npm ci` reproduces the
lockfile byte-identically and the audit stays clean after it.

### Not done at this point

Nothing is pushed yet. The control plane is still offline (Cloudflare 1033) and that is a
VM/`cloudflared` problem outside this repository — nothing here hides it. Stage B, the
reconstruction of the ten stations against `design-references/`, has not started.


---

## S2 — Stage B/C: the ten stations rebuilt against the references · 30 September 2026

**Scheme: a repair stage, not a dossier phase.** Owner-directed and continuous with S1. The
plates stop being wallpaper and become the frame; the text layer of each reference is rebuilt
as real HTML on top of it. Nothing in the Truth Constitution was touched, one gate was added,
and one gate was rewritten after it was proven worthless.

### The architecture, and the one idea it rests on

A station is a **fixed-ratio stage** locked to the plate's own 3:2, with `container-type:
inline-size`. Inside it, `--u` is **one reference pixel** — `calc(100cqw / 2528)` — so a
measurement taken off a 2528×1685 reference goes into the CSS as arithmetic rather than as
taste: a 48px heading becomes `calc(48 * var(--u))`, a callout 31% across the frame becomes
`left: 31%`.

The consequence is the point. The previous treatment cropped each plate to `cover` behind a
fluid column: at 1440 the "API Gateway" label sat beside the tower, and at 1100 the tower had
been cropped away and the label pointed at empty sky. Because the stage holds the plate's
ratio, a percentage is now a fixed point on the artwork, and a callout keeps naming the thing
it names at every width the stage survives at.

Below **1024px the composition is abandoned, not shrunk** — 1024/2528 is 40%, which puts the
reference's 28px body copy under 11px. Each station carries a second, stacked composition in
its own slot, and only one is in the accessibility tree at a time.

Shared kit: `Stage`, `Callout`, `Panel`, `Chip`, `StatRow`, `TraceRail`. Ten stations, one set
of primitives — the duplication that turns ten camera stations into ten websites was recorded
as the standing risk during the R-series, and it was avoided by building the kit first.

### The plates now run at full strength, and legibility moved

Plates were held at 0.55 opacity behind a full-frame left-to-right scrim, which is exactly why
the world read as wallpaper. They now run at 0.92–0.95, and legibility is bought **locally**:
`--plate-scrim` at 92% of the graphite ground, under each block of sustained reading only. The
plate stays bright everywhere the eye is not reading.

`contrast-check` was extended rather than trusted. It read only `tokens.css` and would have
passed a redesign that moved most of the site's text onto a surface it had never measured; it
now reads `stations.css` too and asserts nine new pairings against `--plate-scrim-solid`, the
colour the scrim composites to over `--bg` — the darkest case, so the floor. **25 to 34 enforced
pairings.** Proven by injection: a bad scrim value produced 10 FAILs and exit 1; reverting
returned 34/34.

### A generated human being was about to ship, twice

**This is the most serious thing found in this stage, and it was found by rendering.**

Reference 07 is composed around a photorealistic person. The 04–10 entry records that this was
already ruled on in the other medium: a placeholder figure was tried at the subject's position
in `ThinkScene` and removed, and the frame composed as "a recently-vacated desk instead". The
**plates were generated from the references afterwards and quietly reintroduced what that
ruling removed.** `07-think.png` contains a fully-rendered face in focus. `08-build.png`
contains a second figure at the window.

On a personal portfolio a photorealistic person in the artwork reads as a photograph of the
subject. There is no owned photograph — `/about` still carries the OWNER-INPUT marker asking
for one — so these would have published a fabricated image of a real person. No honesty rule
needs quoting to rule that out.

Worse, the first version of station 07's copy said "the desk is empty on purpose" while the
plate behind it showed a man at that desk. A published claim the artifact contradicts, on the
same screen.

Both plates now carry a **composed crop** in the pipeline, applied before the width ladder so
no uncropped rung of either figure exists anywhere in the output: 07 becomes the monitor, the
architecture sketches and the empty desk; 08 becomes the city, the cube and the desk. Both
checked by rendering, both exactly 3:2. The station says plainly what was done and why.

The 04 plate carries a small abstract avatar inside a laptop UI. It reads as generic interface
chrome rather than as a portrait and is left — recorded here rather than left unmentioned.

### Reference 06's globe, resolved consistently across both surfaces

The 3D scene refused to render a lit earth because "the reference's globe is covered in glowing
city lights across continents this project has no presence in". The static plate is a finished
render and cannot be un-lit without looking broken, so the two surfaces would have disagreed
about the same fact through a channel no gate watches.

The same ruling is applied in the medium available: the claim is **withdrawn in text, on the
artwork, where the artwork makes it**. A panel on the globe states that the lit continents are
illustration, that this system runs in one region on one virtual machine, and that the only
measured point on the map is the reader's own round trip. The narrow composition carries the
same sentence.

### What the invented figures became

Every number baked into the references was ruled on by the decomposition's §3 table. The
compositions survive exactly; the contents are repository facts.

- `REQUESTS/MIN 2,487`, `UPTIME 99.99%`, `ERROR RATE 0.02%` become the **round trip measured in
  the reader's own browser**, **the real control-plane state including "no answer"**, a
  CI-asserted demonstration count, and an architectural isolation-layer count.
- `128 SERVICES`, `23 REGIONS`, `2.4M EVENTS`, `12 SERVICES ONLINE` are **cut**, with station 02
  stating that no service, region or tenant count is published, and why.
- `7,842 cases`, `128K artifacts`, `14.6K decisions` become the real counts, in a panel designed
  for two digits exactly as §3 instructed: **3 systems, 12 decisions, 5 evidence chips, 2
  lessons, 14 integration tests.**
- `98.7% evidence quality`, `99.98% confidence`, `flow health` are **cut**, and station 09 says
  so on the frame: "No such metric exists, so there is nothing to print."
- `KUBERNETES`, `AMS AP-SOUTH-1`, `v3.7.4` are replaced by what this system actually runs on,
  and the panel states that the region is not published.
- The reference's centre label "ENGINEERING CORE — shared foundations powering all systems" is a
  claim about shared infrastructure and is **false**: these three systems run separately, for
  separate organisations. Replaced with what is actually shared — one operator and one set of
  patterns.
- Per-hop trace timings become **one measured total**, because no per-hop timing is measured
  anywhere a reader could check. Station 04 says that on the frame.

One measurement feeds every instrument. `scripts/liveness.ts` fetches `/health` once and writes
the result to `<html data-liveness>`; the rail pill, station 01's strip, its trace and station
06's readouts all read that one attribute. Four readouts of one fact cannot disagree.

### Four budget defects, each found by measurement and each with a named cause

1. **LCP 3.4s against a 1.8s budget**, carried in from the previous stage. The plate was a CSS
   background promoted by a deferred module that first probed AVIF support with a data: URI.
   It is now a `<picture>` with a 768/1280/1920/master ladder and `fetchpriority="high"` in raw
   HTML. The whole JavaScript loading path was deleted.
2. **Performance 0.97 to 0.87** when stations 02–10 arrived. Nine offscreen stations were being
   laid out before first paint. `content-visibility: auto` on deferred stages only; safe
   without `contain-intrinsic-size` because those boxes already declare their height via
   `aspect-ratio` and `min-height`, which was verified rather than argued.
3. **CLS 0.026 to 0.178**, more than three times the budget, from the new status pill reflowing
   the header when the measurement landed. Reserving its width in `ch` **did not fix it** and
   the shift survived untouched: `ch` is the advance width of the current face, so a `ch`
   reservation is re-measured when the font swaps. `em` fixed the pill.
4. The remaining **0.176 was the JetBrains Mono swap itself**, re-measuring every eyebrow, stat
   label, chip and nav item at once. That face is deliberately not preloaded, because preloading
   it cost LCP, so it always swaps late. It is now `font-display: optional` — it cannot swap
   mid-page, so the shift cannot happen. The cost is stated in the stylesheet: a first-time
   visitor on a slow connection reads labels in their platform's own monospace.

Final, three runs each against the built output: **performance 0.96, CLS 0.000 across zero
layout-shift entries, accessibility 1, SEO 1** — measured against a plain uncompressed local
server, which scores below lhci's own.

`best-practices` is **0.96, down from 1**, and the cause is stated rather than smoothed over:
the liveness probe fetches `/health`, which 404s on a static test server and 530s on the real
origin today, and a failed request is logged by the browser at the network level where no
`catch` can reach it. A page that measures a real system logs an error when that system is
down. It clears the 0.95 threshold and it is the honest behaviour, but it is thin margin and is
recorded as such.

### The station gate, and the first version of it that was worthless

Two things no gate watched: the station-to-plate mapping, and the locked hero content that P9
explicitly recorded as unguarded.

**The first version of the mapping check was proven useless by injection.** It compared the
plate a station renders against the plate it declares — two readings of one fact — so pointing
station 05 at plate 04 changed both sides together and the gate exited 0. It now asserts an
independent invariant: a station of index `05` must carry a plate whose stem begins `05-`,
which is a fact about the design system that a config edit cannot satisfy on both sides.
Re-injected: exit 1, naming the station.

**The locked-content check failed the same way.** Asking whether each chip appeared anywhere in
the homepage passed when a chip was dropped from the desktop hero, because the narrow
composition still carried it — which is exactly the P9 failure it was written for. It is now
scoped to both chip lists separately, and fails loudly if either list disappears. Re-injected:
exit 1, naming the chip and the composition.

The copy gate caught the author again, as it did in the 04–10 run: the word **placeholder**, in
station 10's own copy, in a sentence saying the unknown next problem is not one. The gate was
right and was not touched. Reworded.

### Verified

`npm run verify` **exit 0** — typecheck 0 errors, copy-check 26 markup and 7 machine artifacts,
link-check **313** references, html-validate, contrast **34/34**, confidential-parity 6,
machine-parity 21, fastlane 15, station-check 10 mappings plus the locked claim and 4 locked
chips. `format:check` clean. `npm run api:verify` **121/121**.

All ten stations rendered in a real browser at **1440, 834 and 390** and compared against their
reference frames; **zero horizontal overflow at all three**, thirty screenshots under
`build/verify/`. CLS measured directly from `layout-shift` entries at 412x823, DPR 1.75,
1.6Mbps, 4x CPU: **0.0000 across zero entries**.

`sourcemap: 'hidden'` on the live surface — 5.4MB of maps were being served in production with
no recorded decision. They are still emitted for local debugging; only the comment telling
browsers to fetch them is gone.

### A local flake, recorded rather than hidden

Six purge tests failed mid-stage and then passed 121/121 on a recreated database, three times.
The cause was **test-data pollution in an hour-old local dev database**: fifteen
expired-but-unpurged tenants left by earlier failed runs, competing for the sweep's batch and
its advisory lock. CI provisions a fresh Postgres per run and is unaffected — it passed 121/121
on Linux. Recorded because "it passed when I ran it again" is not a diagnosis, and the next
person to see this deserves the cause.

### Not done, and not counted as done

- **The control plane is still offline** (Cloudflare 1033). Every liveness readout on the site
  therefore shows its degraded state, correctly and by design. Nothing was faked to hide it, and
  no station shows a number from a previous visit.
- **`/about`, `/engineering`, `/systems`, `/cv` and `/experience` are untouched.** This stage
  rebuilt the homepage's ten stations. Those pages keep the P9 treatment and are still linked,
  correct and gated; they are not reference reconstructions.
- **72 "as of Jul 2026" qualifiers are unchanged.** They describe the three client systems and
  none of the underlying numbers were re-checked in this stage, so refreshing the dates would
  have been asserting a currency nobody verified. They are listed for the owner instead.
- **No camera-flight transition between stations.** The existing parallax is kept and respects
  `prefers-reduced-motion`; a scroll-driven camera would cost JavaScript that the static
  surface's 15KB budget is deliberately not spending.
- **The mid-range device frame measurement**, carried since P4, remains outstanding.
- Reference 11 (SYSTEM MAP) remains out of scope.

---

## S3 — The world is returned to the home page · 30 September 2026

**Scheme: a correction stage.** Owner-directed, and a correction of scope rather than of code
quality: the ten-station world was commissioned for the home page and was built into the site
instead. Everything outside `/` is restored to exactly what it was before the world existed.

### What was over-applied, and how

The baseline is **45038a6**, established from the history rather than assumed: `065f51e` is the
very next commit, and `45038a6` contains no station, visual-world, scene or design-reference
file. It is unambiguously the last pre-world commit.

Comparing the full tree from that baseline to `512c103` gives a narrower fault than expected.
**No non-home page file was ever modified.** `/about`, `/engineering`, `/systems`, `/cv`,
`/experience`, the three case studies and `/404` were restyled entirely by proxy, through three
separate leaks in files every page shares:

| leak | mechanism | effect |
|---|---|---|
| markup | `BaseLayout` replaced `Header` with `StationNav` | every route wore the station rail |
| stylesheet | `BaseLayout` imported `stations.css` | the world's tokens loaded site-wide |
| the import alone | `BaseLayout` imported `StationNav` | **26 scoped rules** entered the shared sheet |
| script | `BaseLayout` ran `initVisualWorld` + `initLiveness` | a parallax driver with no plates, and a liveness probe, on the CV |

The third is the one worth recording. Importing a component into a layout is enough to put its
CSS into the bundle every page downloads, **whether or not the component is ever rendered**. A
boolean prop would have hidden the rail and still shipped its stylesheet — home-only in
appearance and site-wide in bytes. It was found by grepping the built CSS, not by reasoning.

`/live/` was a different and larger case: commit `065f51e` replaced the surface wholesale with a
station world (46 new files — `kit/`, `scenes/`, `world/`, a bench harness).

### What was restored

- **`apps/experience/` in full** to baseline. The 46 world files are deleted and the six
  modified ones reverted. `/live/` is the P9 lattice surface again: the 3D scene, the document
  column, the demonstration deep-links (`/live/isolation`, `/payments`, `/fraud`, `/ai`,
  `/limits`), and the honest REPLAY state.
- **`BaseLayout`** to baseline, differing now by exactly one line.
- **`fonts.css` and both font preloads** to baseline. These were changed for the world's LCP
  and CLS, so they were not independent fixes and had no business applying site-wide. Removing
  them cost nothing: with the rail home-only, the home page measures **performance 0.96,
  CLS 0.000** on restored `font-display: swap` with both faces preloaded. The workarounds were
  only ever needed because the world was everywhere.
- **`copy-check.mjs` and `render-verify.mjs`** to baseline. Both had been adapted to the world —
  `copy-check` read `enter.claimLines` from the station copy shape, and `render-verify` sampled
  a screen region chosen for the station composition.

### The nav is a slot, not a flag

`BaseLayout` now renders `<slot name="nav"><Header /></slot>`. A page that hands it nothing gets
the site it always had; `/` hands it `StationNav`. There is deliberately no `world` boolean: a
flag is something a future page can set by accident, and a slot is something a page has to pass
content to. It also means the layout never names the world's components, which is what stops the
CSS leak at its root.

`stations.css` and the world's two scripts moved into `index.astro`, so Astro bundles them into
the home page alone.

### A guard that did not exist, and is the point of this stage

Every gate in this repository asks whether what shipped is TRUE. Not one asked **where** it
shipped, which is why the whole site could wear a design meant for one page for five weeks with
CI green throughout.

`station-check` gained a third section. It walks every built HTML page that is not `/` and fails
on any trace of the world — the rail, the plate layer, the stage shell, a plate URL — **and on
the world's tokens appearing in any stylesheet that page links.** Scoping a design's assertions
to the route that owns it is not loosening: the world is still fully asserted on `/`, and is now
additionally asserted to be absent from the other sixteen pages, which is strictly more coverage
than before.

Proven by injecting both real mechanisms:

- rail back into the shared layout → **exit 1**, naming `404.html`, `about/`, `cv/` and the
  shared stylesheet;
- `stations.css` imported in shared frontmatter, with no visible rail anywhere → **exit 1** on
  `--plate-scrim`, `--plate-edge` and `station-nav`. A markup-only check would have called that
  clean.

### A guard that had to follow the risk

Restoring `copy-check` to baseline removed its locked-claim parity block, which asserted that the
experience hero's display lines rejoined to blueprint §1's sentence. That check existed because
reference 01's hero was once line-broken as "I design, / I build, / and I operate", quietly
adding two pronouns to locked wording.

The experience surface no longer splits anything — **but the splitting did not disappear, it
moved to the home hero**, which renders the claim as four spans. `station-check`'s existing check
did not cover it: station 01 also carries the whole sentence in a visually-hidden paragraph, so
the old assertion passed even when the visible lines said something else.

The guard now strips the visible `<h1 id="claim">` to text and requires it to BE the locked
sentence. Injected with the exact historical failure — **exit 1**, printing locked and rendered
side by side.

### Kept from the redesign period, deliberately

Everything below is independent of the visual design and stays:

- the rebuilt lockfile and the dependency bumps (**0 vulnerabilities**);
- the `pg_advisory_lock` in `migrate()`, which fixed a real race two API replicas would hit;
- the Dockerfile `mkdir -p` that stopped the image build depending on npm hoisting;
- `emit-headers` deriving `img-src` from `PUBLIC_VISUAL_WORLD_BASE`;
- `contrast-check` reading `stations.css` as well as `tokens.css` — **34 pairings**;
- the plate pipeline, the responsive width ladder, and the **crops that removed the generated
  people from plates 07 and 08**;
- `sourcemap: 'hidden'` on the live surface, re-applied onto the restored config;
- every Truth Constitution content decision on the home page.

### Verified

`npm run verify` **exit 0** — 9 gates. `npm run api:verify` **121/121**. `format:check` clean.
`npm audit --omit=dev --audit-level=high` **exit 0**.

The baseline was built in a temporary git worktree at `45038a6` and served beside the current
build. Nine non-home routes were rendered in a real browser at **1440, 834 and 390** against
both, and compared **pixel by pixel**: 27 pairs, **0.0000% differing pixels**, identical document
heights, zero horizontal overflow, zero page errors, `.vw` 0, `.station-nav` 0, `.site-header` 1
on every one. Screenshots under `build/verify/` as `CUR-*` and `BASE-*`.

Home keeps its world: 10 stages, zero horizontal overflow at all three widths, and the station
rail on **one row at 390px**, which is what it was rebuilt to do.

`/live/` was driven in a browser: a live WebGL context, zero `.vw`, zero rail, and the honest
degraded copy — "The control plane did not answer. Nothing was provisioned." It is not
pretending, and the control plane is genuinely down.

### A local flake, re-confirmed rather than re-diagnosed

Six purge tests failed once more and passed **121/121** on a recreated database. `services/`
was not touched by this stage — confirmed at zero changed files — so the cause is the one
already recorded in S2: stale expired-but-unpurged tenants accumulating in a long-lived local
dev database and competing for the sweep's batch and advisory lock. CI provisions a fresh
Postgres per run.

### Still open

- **The control plane is offline** (Cloudflare 1033). A VM/`cloudflared` problem outside this
  repository. Both surfaces say so honestly and neither invents a reading.
- **No headshot**; the OWNER-INPUT marker on `/about` stands, and the generated people remain
  cropped out of the plates rather than published.
- **Demo-tenant screenshots**, **hospital telemetry permissions**, and the **mid-range device
  frame measurement** carried since P4 all remain outstanding.
- **72 "as of Jul 2026" qualifiers** remain unrefreshed, for the reason given in S2: none of the
  underlying numbers were re-checked.

---

## S4 — The 3D world restored to /live/, and the two surfaces separated properly · 30 September 2026

**Scheme: a correction of a correction.** S3 was asked to stop the image world leaking off the
home page and did that correctly — but it also restored `/live/` to the pre-world lattice
surface and deleted 46 files of the owner's 3D world from the working tree. That was destroying
work, not scoping it. This entry restores it and fixes the structure properly.

### Backups first

Before touching anything, two annotated tags were created and pushed:

| tag | commit | what it protects |
|---|---|---|
| `backup-3d-world-065f51e` | `065f51e` | the ten-station 3D world — ThinkScene, Globe, the kit, every station scene |
| `backup-baseline-45038a6` | `45038a6` | the pre-world design of every static page |

Neither existed. The 3D world had been recoverable only from commit history, which is true but is
not the same as being labelled. They are never to be deleted or moved.

### The intended structure, now built

1. **`/`** — the fast lane. The ten-station world as generated plate IMAGES. No 3D, no WebGL, and
   **zero external JavaScript files**.
2. **A primary button on `/`** — "Enter the live system" — into the world.
3. **`/live/`** — the owner's ten-station 3D world from `065f51e`, in full.
4. **Everything else** — the baseline design from `45038a6`.

### What was restored, and what differs from 065f51e

`git checkout 065f51e -- apps/experience` brought back all 46 deleted files. Diffing the result
against `065f51e` afterwards leaves **exactly one difference**, and it is intentional:

- `vite.config.ts`: `sourcemap: 'hidden'` instead of `true`. A deployment-weight fix with no
  bearing on the 3D world — 5.4MB of maps were being served to anyone who asked. The maps are
  still emitted for local debugging; only the comment telling browsers to fetch one is gone.
  Verified in the rebuilt bundles: **0 `sourceMappingURL` comments**.

Two shared scripts also had to come back to their `065f51e` versions, decided by reading the
diffs rather than assumed:

- **`copy-check.mjs`** — its locked-claim parity block reads `enter.claimLines` and
  `enter.claimTail` from the experience surface's `copy.json`. The restored `copy.ts` carries
  both again, and the `/live/` hero genuinely does split the locked sentence across display
  lines, so the check has a real subject again. Restored.
- **`render-verify.mjs`** — its scene-sampling clip was chosen for the station composition.
  Restored, then one block retargeted (below).

### Two surfaces, and the gate that now keeps them apart

`station-check` gained the distinction the site actually has. `/live/` is **explicitly scoped
out** of the "no world here" scan, because it is not a static page — it is the experience app,
and it is *supposed* to be a world. Today that exclusion changes nothing: the 3D world renders
client-side, so its shells contain none of the markers and would have passed by accident.
Passing by accident is not being correct, and if any scene ever server-rendered a matching class
name the gate would have failed a legitimate design.

Two new assertions cover `/live/` on its own terms instead, and both were proven by injection:

- **No static page may reference `/live/assets/`.** One `<script>` or one preload hint would move
  the entire 380KB gzipped 3D bundle onto a page whose budget assumed it was absent — and nothing
  else would notice, because the page would still be true, still accessible, still pass every
  other gate, and simply be slow. Injected a `modulepreload` into the shared layout → **exit 1**
  naming `404.html`, `about/` and `cv/`.
- **`/live/` must actually be shipping the bundle**, so a gate that keeps the weight off the
  static pages cannot quietly pass while the world stops being built at all.
- **The home page must link to `/live/`.** The world is one click off home, and that click is the
  whole structure. If the button is lost in a future redesign the world becomes unreachable to
  anyone who does not know the URL and *nothing would fail* — the site would just get quieter.
  Injected by removing every `/live/` href from the home page and its config → **exit 1**.

### A gate whose subject had moved

`render-verify` failed after the restore, waiting 30s for `[data-live-panel]` — the estate panel
the home page carried before the ten-station world replaced its composition. The panel is gone;
what it asserted is not. The home page still measures a real control plane, still offers the
route into the world, and still has to be honest when that plane does not answer.

Those three assertions were retargeted to the station world's instruments (`data-liveness`,
`data-live-cta`, `data-live-value`) — the same retargeting this file already performed once when
the scene's composition changed, recorded there in the same terms: a gate pointed at markup that
no longer exists is not strict, it is broken.

One of the three came back **stronger**. The old check counted visible `[data-metric]` elements
and passed at zero. The new one reads the round-trip slots' text and requires **no digit** in
any of them, which catches a slot rendering a stale value, a cached one, or a zero standing in
for an answer — not merely one that failed to hide itself. Its own first version was too literal
(it demanded exactly `—` and failed on the true string `"— ms"`), which is recorded because the
fix made it both looser about punctuation and stricter about the thing it exists to catch.

**`render-verify` 35/35.**

### The routes in and out

- Home's primary hero CTA is now **"Enter the live system →"**, taking the slot reference 01
  spends on "ENTER THE SYSTEM". That slot was going to a static index while the genuinely
  unusual thing — a running multi-tenant system a visitor can attack — sat behind a link most of
  the way down the page. A line beneath states what it is before a visitor commits a click, and
  the wording says "live system" rather than the reference's bare "the system" because the
  destination is a demonstration and rule 11 requires it be labelled one. The destination labels
  itself **DEMO PLANE** in its first screen.
- The shared `Header` gained a sixth item, **Live**. Until now a visitor who landed on `/about`
  or a case study had no route to the world at all. It is last, after the five blueprint §2
  items, and is a plain nav item rather than a highlighted CTA, because the nav should not
  oversell a page that calls itself a demonstration.
- `/live/` already had its way back at `065f51e` — `Back to the main site` in the document and
  the `KT.` wordmark in every station overlay. Verified present, **2 links to `/`**, unchanged.

### Measured, not asserted

Real transfer cost, same machine, same browser:

| | requests | transfer | JavaScript | images | LCP (local) |
|---|---|---|---|---|---|
| **`/`** | 10 | 636 KB raw / 520 KB gz | **0 KB external** | 411 KB | 268 ms |
| **`/live/`** | 10 | 1361 KB raw / 381 KB gz | 1304 KB / **367 KB gz** | 0 KB | 136 ms |

The separation is exactly the intended one: home is images and no JavaScript bundle; the world is
the JavaScript bundle and no images. Home's weight is plate artwork, already compressed, fetched
by the browser's own `srcset` choice.

**Home Lighthouse, three runs: performance 0.96 / 0.95 / 0.96, LCP ~2.63s, CLS 0.000,
accessibility 1, SEO 1.** `best-practices` is 0.96 for the reason recorded in S2: the liveness
probe logs a network error while the control plane is down, which is the honest behaviour.

**`/live/` Lighthouse: 0.56, against `065f51e`'s 0.57** — identical within run variance, so the
restore introduced no regression. It is reported as information only: `/live/` is deliberately
absent from `lighthouserc.json`, with the reasoning recorded there since P8 — scoring a WebGL
world as a static document measures the wrong contract, and its real gate is `render-verify`
against a real GPU. That was true at `065f51e` and is unchanged here.

### Verified

`npm run verify` **exit 0** (9 gates) · `npm run api:verify` **121/121** · `format:check` clean ·
`npm audit --omit=dev --audit-level=high` **exit 0** · `verify:render` **35/35**.

Both reference commits were built in temporary git worktrees and served alongside the current
build:

- **`/live/` vs `065f51e`** at 1440/834/390: **0.058% / 0.002% / 0.000%** differing pixels. The
  residue is animated-scene variance, not a difference — `065f51e` compared against *itself*
  across two loads gives **0.029%**, the same order. WebGL context alive and not lost at every
  width, canvas non-blank, zero horizontal overflow, and the only console errors are the control
  plane's 404s, present identically in both.
- **Nine static routes vs `45038a6`** at three widths: document heights **identical everywhere**,
  `.vw` 0, `.station-nav` 0, `.site-header` 1, overflow 0. The only pixel difference is the new
  `Live` nav item, and it is provably confined to it: the differing bounding box is
  **y 17–27**, a ten-pixel band, on every page. At 390px the diff is **0.0000%**, because the nav
  collapses behind the hamburger.
- **The full journey**, 11 steps, all passing: home loads → no 3D bundle on home → CTA →
  `/live/` → live WebGL canvas → DEMO PLANE label → route back → home with 10 stations → old
  header on other pages → header links to `/live/` → header link reaches the world.

### A note on CI coverage

Every gate in `npm run verify`, including `gate:stations`, runs in CI. **`verify:render` does
not, and that is by design** — Phase 3 decision 9: it drives an already-installed Edge or Chrome
with a real GPU and downloads no browser, which is precisely why a GitHub runner cannot run it
meaningfully. That was true at `065f51e` and is unchanged. It is stated here rather than left to
be discovered, because "35/35 locally" and "covered in CI" are different claims.

### Still open

- **The control plane is offline** — Cloudflare 1033, the tunnel has no connection. The VM or
  `cloudflared` needs restarting; it is outside this repository. Both surfaces degrade honestly:
  `/live/` shows its REPLAY badge and says "The control plane did not answer. Nothing was
  provisioned.", and home's readouts hold the unmeasured dash. Neither invents a number.
- **No headshot**; the OWNER-INPUT marker stands and the generated people remain cropped out of
  plates 07 and 08 rather than published.
- **Demo-tenant screenshots**, **hospital telemetry permissions**, and the **mid-range device
  frame measurement** carried since P4 remain outstanding.
- **72 "as of Jul 2026" qualifiers** remain unrefreshed — none of the underlying numbers were
  re-checked in this stage.

### S4 addendum — three layout defects, the real origin numbers, and a near-miss · 30 September 2026

**Three layout defects appeared only once the CTA and the status pill were both on the page.**
All three were measured in a browser, not eyeballed, and all three are fixed:

- The rail clipped **"10 / END"** at 1440 — the last station, the one that closes the arc, was
  the one that fell off. The index needed 967px and was being given 923px because the status
  pill is `flex: none` and took its width first. The pill's "CONTROL PLANE" label now appears
  only at 1600 and above, reclaiming the 94px needed. No state is lost: the dot keeps its colour
  and the value still reads "live" or "no answer" in words.
- Three controls in a 25%-wide column put every label on two lines. The primary CTA now takes
  its own row with the two quiet links beneath, which is also the right reading order.
- The taller column then overlapped the readout by **33px at 1440**. The readout moved to 79%,
  giving 32px of clearance at 1440, 28px at 1280, 23px at 1100.

**The real cost of each surface, measured on the live origin as a browser receives it:**

| | requests | over the wire | JavaScript | images | LCP |
|---|---|---|---|---|---|
| **`/`** | 9 | **12 KB** HTML brotli (85 KB raw) + 411 KB plates | **none** | 411 KB | 508 ms |
| **`/live/`** | 10 | **368 KB** brotli JavaScript (1.3 MB raw) | 368 KB br | none | 1292 ms |

The separation is the whole point of the structure: the fast lane ships no JavaScript file at
all and its weight is plate artwork the browser picks by `srcset`; the world ships React, Three
and the station scenes and no images. A visitor who never clicks the button never pays for the
3D world.

**A defect on `/live/` that was NOT changed, and why.** At 1440 the "ENTER THE SYSTEM" control
overlaps the edge-round-trip stat strip beneath it. It is present identically at `065f51e` — the
pixel diff against that commit is 0.058%, which is the animated-scene noise floor — so it is
not a regression introduced here. The brief for this stage was to restore the owner's 3D world
as built and to list every difference from it; silently restyling that surface would have been
a difference nobody asked for. It is recorded here for the owner to rule on rather than fixed
on assumption.

**A near-miss worth recording, because it was self-inflicted.** Both reference commits were
built in temporary git worktrees with `node_modules` linked in by a Windows directory junction
to avoid a slow copy. `git worktree remove --force` followed those junctions and deleted through
them: 46 files of `apps/experience` and 241 of `apps/static` vanished from the working tree, and
`node_modules` was emptied.

Nothing was lost. Everything deleted was tracked, the index still held it, `git checkout -- .`
restored all 287 files, `npm ci` rebuilt `node_modules` and reproduced the lockfile exactly. But
the restore reverted every *unstaged* edit in progress — six of them had to be redone from
notes. Two lessons, both cheap:

1. **Never junction `node_modules` into a worktree that will be force-removed.** Copy it, or
   build the reference with its own install.
2. **Commit before running destructive tooling.** The staged work survived intact; only the
   unstaged work needed redoing. The backup tags created at the start of this stage were never
   needed — but they were the reason the risk was acceptable at all, which is the argument for
   making them before touching anything rather than after.

---

## S5 — A production-grade sweep: five real defects, found by measurement · 30 September 2026

**Scheme: a quality stage.** Owner-directed and deliberately broad — "recheck all, there are many
bugs". Every route was driven in a real browser at 1440, 834 and 390 and checked for overflow,
clipped text, heading structure, metadata, link integrity, tap-target size, focus behaviour,
console errors and failed requests. Five real defects came out of it. Everything else that was
checked and found correct is listed too, so the next sweep does not repeat the work.

### 1. The home heading's text was welded together

Each display line of the hero is a block `<span>` and adjacent tags carry no whitespace, so the
`<h1>`'s own text content read:

```
I design,build,and operateproduction systems.
```

Anything that takes an element's text rather than its rendered layout got that — search
crawlers, text extraction, browser reading mode, and screen readers whose accessible-name
computation does not insert a space at a block boundary. A `visually-hidden` paragraph repeating
the sentence had been papering over it, which meant the page stated its most important claim
twice and a screen reader announced it twice: the heading, then the same words again as body
text.

An explicit space between the lines fixes the cause. The spans are blocks so nothing moves, and
the duplicate paragraph is gone with it. The heading now matches the locked claim character for
character, which `station-check` already asserts.

### 2. The 404 self-canonicalised — open in dossier §15 since Phase 8

`wrangler.jsonc` sets `not_found_handling: "404-page"`, so **one file is served at an unbounded
number of addresses**. It was emitting `rel=canonical href="https://kishanthorat.com/404/"`,
telling a crawler the error page is a real destination with a preferred URL, and it carried no
`robots` directive at all.

The page now carries `noindex` and no canonical. What kept this alive is that `machine-parity`
required a canonical on **every** page, so the defect was load-bearing for a gate.

The gate was made more precise rather than looser. Every page that is not the 404 is checked
exactly as before; the 404 gains **two assertions it never had** — that it must not declare a
canonical, and that it must carry a robots noindex. `/dev/components/` and the `/live/*` station
pages are noindex too but keep their canonicals, because each is a single genuine destination a
deep link resolves to. The rule is stated where the data model puts it.

`/404.html` scores 0.63 on Lighthouse's `is-crawlable` **because** it is noindex, which is the
correct state for an error page. It is deliberately not in the Lighthouse CI URL list, so this
is information rather than a failure.

### 3. Seven undersized tap targets (WCAG 2.2 AA, SC 2.5.8)

Standalone controls sitting on a ~19px line box, against a 24×24 CSS-pixel minimum:

| control | was | where |
|---|---|---|
| site header nav links | 57×17 | every page, every width |
| header "CV" link | 20×31 | every page |
| station rail links | 16×27 | home, ≤720px where only the number shows |
| station rail "CV" | 16×19 | home |
| footer contact links | 227×19 | every page |
| CV page contact links | 227×19 | `/cv` — the links a recruiter taps |
| `.entry-go`, `.cross-link`, 404 recovery link | 18–22px tall | systems, engineering, 404 |

Every one is grown with padding and the padding undone with an equal negative margin, so the hit
area clears 24px and **nothing moves** — header 57px and footer 127px measured identically before
and after on every page.

Two links remain under 24px and are **exempt**: "source on GitHub" and "The CV"/"a PDF" sit
inside sentences, which SC 2.5.8 explicitly excepts. Stated rather than silently "fixed".

### 4. A regression I introduced, and caught in the same sweep

Giving each station link a 24px minimum made the rail's content wider than its box — correct for
a horizontal scroller — but the browser still grew the **document's** `scrollWidth` by 17px at
390, so the whole page could be dragged sideways. `overflow-x: auto` clipped the paint and not
the propagation.

Found by elimination in a real browser: `min-width: 0`, `max-width: 100%`, `overflow: hidden` on
the parent and disabling scroll-snap all left it at 407px. `contain: paint` returned it to 390.
The rail still scrolls, all ten stations stay reachable, and the minimum target is now exactly
24px at 390 — verified, not assumed.

### 5. Both skip links looked correct and did nothing

`<main id="main">` on the static pages and `<main id="document">` on the live surface were both
missing `tabindex="-1"`. A browser scrolls to a bare anchor target but leaves keyboard focus
where it was, so pressing Enter on "Skip to main content" moved focus to **BODY** and the next
Tab returned the reader to the top of the page — back into the navigation they had just asked to
bypass.

Measured before: `after Enter, focus moved to: BODY`. After: `main`, and `document tabindex=-1`
on `/live/`. On the live surface this is the one control that has to work, because its whole
accessibility story is that the document is the authoritative version and you can jump straight
past the scene to reach it.

`[tabindex='-1']:focus { outline: none }` is added to both stylesheets, scoped to negative
tabindex only, so the jump target shows no ring while every real control keeps its own.

### Checked and already correct

Recorded so the next sweep can skip them: 16 JSON-LD blocks parse and carry `@context`/`@type`;
every `og:image` resolves to a generated file; the sitemap lists 9 URLs and excludes every
noindex route; all internal links resolve and all three external links return 200; every
`/live/` station and demonstration deep link returns 200; `/cv.pdf`, `/api/profile.json`,
`/llms.txt`, `/robots.txt`, `/sitemap-index.xml` and `/favicon.svg` all return 200 with the
right content type; `prefers-reduced-motion: reduce` stops the plate transform while
`no-preference` leaves it active; focus rings are present on the first eight tab stops of every
page tested; and the mobile nav toggle flips `aria-expanded` and reveals all seven links.

### Verified

`npm run verify` **exit 0** (9 gates) · `npm run api:verify` **121/121** · `format:check` clean ·
`npm audit --omit=dev --audit-level=high` **exit 0** · `verify:render` **35/35** ·
`html-validate` clean across all 26 built pages.

**axe via Lighthouse on all ten static routes: accessibility 1.0 on every one.** SEO 1.0
everywhere but the 404, for the reason above. Home: performance 0.96, LCP 2631ms, CLS 0.000,
accessibility 1, SEO 1. `/about`: accessibility 1, SEO 1, best-practices 1.

Home's `best-practices` is 0.96 rather than 1 for the reason already recorded in S2: the liveness
probe logs a network error while the control plane is down, which is the honest behaviour.

### A measurement that failed once, and why it was not a code defect

`render-verify`'s adaptive-quality governor check failed at **p95 19.50ms against a 19ms
budget** while twelve Docker containers were running. With the machine unloaded the same check
measures **17.10ms** and passes 35/35. The changes in this stage were a `tabIndex` attribute and
a focus-outline rule; neither can move GPU frame timing. Recorded rather than silently re-run,
because "it passed the second time" is not a diagnosis.

### Still open

Unchanged by this stage: the control plane is offline (Cloudflare 1033 — the VM or `cloudflared`
needs restarting), there is no headshot, the demo-tenant screenshots and hospital telemetry
permissions are outstanding, the mid-range device frame measurement carried since P4 has not been
taken, and 72 "as of Jul 2026" qualifiers remain unrefreshed because none of the underlying
numbers were re-checked.

---

## S6 — The stations rebuilt as composed interfaces · 1 October 2026

The owner's verdict on S2's result was that it did not look professional, and the
diagnosis was correct and specific: `design-references/README.md` says the ten plates
are **visual specifications**, not background images, and the implementation was using
each one as a near-full-bleed background with a headline and two or three panels over
it. Reference 09 alone specifies a donut, two gauges, a six-stage timeline, a flow
diagram, a three-branch decision tree with five criteria, a live feed, a ranked list, a
trace inspector and a six-metric stat bar. Almost none of it was built. That gap was
the defect.

This stage builds the component kit the references actually call for and composes all
ten stations out of it, shipping in increments rather than as one commit.

### The kit

`Sparkline`, `Donut`, `Gauge`, `MetricCard`, `RankedList`, `Feed`, `StageTimeline`,
`FlowDiagram`, `DecisionTree`, `Inspector`, `StatusBar`, `Legend`, `DissectionIndex`,
`Note` — alongside the existing `Stage`, `Panel`, `Callout`, `Chip`, `StatRow`,
`TraceRail`.

Two rules shaped almost every one of them.

**The empty state is the important state.** This site measures one thing live and
counts a handful at build time. The references put a trend line in every card. The
component therefore treats "no series" as a first-class rendering — a dashed baseline
at the vertical middle with a stated label, occupying exactly the box a populated
series would — rather than as a failure path. Omitting the chart is what produced the
empty frames this stage exists to fix.

**A thing that appears twice must be different the second time.** The six-part
dissection index was written out identically on stations 02 and 03. Two identical
lists on consecutive frames read as a copy-paste. It is now one component with one
piece of state: 02 shows the structure with nothing marked, 03 marks the part that
frame is showing. The active row is `--structure`, because "where you are" is not one
of the five operational registers and must not borrow one.

### What each station gained

- **02** — the disclosed limitation of each system, printed verbatim on the frame that
  promises them; the shared patterns as a stage rail; the estate as a real ring.
- **03** — the four architecture decisions with what each cost, which the lede had been
  promising and never showing; the sidebar reference 03 specifies.
- **05** — all four fields of every lesson. It published `whatHappened` and nothing
  else; `cost`, `ruleChanged` and `why` were sitting unused in the content.
- **06** — the bottom status rail, which is where honesty principle 12 is discharged and
  which was simply missing; the event stream in its designed empty state.
- **07** — the set's one serif, a system stack rather than a webfont; the five
  principles with their statements; "what I got wrong" in short form; the career
  timeline from the experience collection; and the portrait slot, built, marked and
  left empty.
- **09** — built in S2's late passes; unchanged here beyond the shared kit extraction.
- **10** — all ten stations named on the map (its own comment claimed ten and listed
  seven), and the four routes out.

### Decisions taken, and recorded because they were judgement calls

**No `degraded` state on the status bar.** The measurement resolves to two outcomes.
A third word styled for a state the system cannot produce would render identically
whether or not the backend existed, which is the definition of decoration here.

**No orbit diagram on 07, no second request trace on 03.** Reference 07 draws
concentric rings and reference 03 draws a trace ribbon with per-hop timings. The rings
would be bound to nothing and the timings do not exist; station 04 owns the one trace
this site can honestly draw. Components of equal weight carrying true statements took
both slots.

**The portrait slot is empty and the composition is arranged to hold that way.** No
owned photograph exists. A generated face on a personal site reads as a photograph of
its subject. The frame's weight is carried by the serif column and the panels beneath
it, so when a real photograph arrives it drops into the box and nothing else moves.

### Three defects found by building, not by reading

**The unit-without-a-reading.** Three places rendered "— ms" with nothing measured.
`StatRow` was inverted: `data-live-value` sat on the `<dd>` with the unit as a child,
and the liveness script fills a bound node with `textContent`, which wipes every child
— so the one case that had a unit to show lost it the moment a reading landed, and the
case with nothing to qualify kept it. Proved in both directions before and after.

**The current role rendered as finished.** Its `to` field is the string `"Present"`,
not an absent value, so a truthiness test marked it `done`.

**Station 04's Browser callout overlapped the lede,** and had all along. Giving
callouts a legibility scrim is what made it visible.

### The contrast failures the gate cannot see

The owner reported faint body copy over the plates. The gate said everything passed,
because it compares token against token and this is token against artwork.

A probe renders each station, makes the glyphs transparent while leaving every
background in place, samples the brightest pixel in each text block's box and computes
the ratio against that worst case. Before: callouts at 2.69–3.63, station 04's lede at
2.20, station 06's eyebrow at 3.84, panel notes at 3.11 and 3.37, the quiet chip at
4.38. After: nothing under 4.5, worst callout 5.67.

The fixes are each the smaller of the two available. Callouts get a masked
`backdrop-filter` rather than a scrim box — the component's own note was right that
sixty boxes would bury the plate, and the first attempt, which skipped the mask, looked
exactly like the rectangle the note warned about. Notes move from `--text-faint` to
`--text-muted` rather than the panel scrim going opaque, because the honest caveat
should not be the hardest line on the frame to read. Chips go opaque because a chip is
too small for 8% of a plate showing through to be worth anything.

**The probe disagreed with itself three times before it was trustworthy.** Hiding an
element removes its own scrim; clearing `color` leaves a coloured `<em>`, an underline
and a 1px row divider inside the sampled box. Each of those produced a confident,
wrong number. The readings above are from the version that survived all three.

### /live/

Four measured layout defects. The ENTER control overlapped the readings strip by 64px
at 1440x900 and 132px at 1280x800 — two absolutely positioned siblings cannot be made
not to collide by adjusting offsets, so they are one column in flow now and clearance
is +70/+27/+23/+24/+24px across five widths. The station rail wrapped onto the DEMO
PLANE badge below 1300px; it never wraps now. The readings did not share a baseline.
The trace panel's duration fallback repeated its own label.

The reported orphaned "MRS" string was **not found**: not in the source, not in the DOM
at 1440, 1920, 834 or 390 across nine scroll positions each, and not in a visual sweep
of the bottom-right quadrant over the full page. No fix was invented for it.

### Non-home routes

`/engineering` ran every list as one column at a reading measure inside a 1120px
container, so the right half was empty on any desktop. That emptiness is most of what
made these routes read as a plainer, older site beside the home stations. Two columns
above 1040px — the composition widens, the line length does not. No world markup,
tokens, scripts or fonts were introduced; `station-check` stays green.

### Verified

`npm run verify` **exit 0** · `format:check` clean · `verify:render` **35/35** ·
contrast probe clean across all ten stations · zero horizontal overflow at 390/834/1440
· **zero JS files** on the home page · 20.2KB gz of HTML plus 13.3KB gz of CSS against
a 90KB budget.

### Still open

The control plane is still offline, so every live reading on this site currently shows
its unmeasured state — which is the state the rebuild was designed around and is the
reason the empty states got the attention they did. The portrait remains an
OWNER-INPUT. Stations 01, 08 and 09 keep the compositions S2 gave them; 04's plate does
most of its own work and gained only the callout move.

---

## S7 — The owner restored to stations 07 and 08 · 3 October 2026

**A recorded ruling reversed, on the owner's instruction.** Plates 07 and 08
were cropped (S2) to remove the figure in them, on the assumption that it was a
generated stranger who would read as a photograph of the subject. The owner has
stated that the figure is him and asked for it to be shown. A picture of the
subject that the subject has approved as his own likeness is not a fabricated
picture of a real person, so the reason for the crop no longer holds. Both
plates now ship whole; the crop mechanism stays in the pipeline, empty.

The "No portrait" panels on 07 (there were two, a duplicate) and their
OWNER-INPUT marker are removed. `/about`'s own photograph request is untouched.

Both frames were recomposed against grid measurements of the full plates, with
every panel kept below the owner's shoulders on 07 and clear of him on 08. On a
phone the plate sat dimmed behind text, so the narrow composition of each now
opens with the same image as a real, captioned picture cropped to him.

---

## S8 — Motion on the home page · 3 October 2026

**On the owner's direction, and recorded because it touches a dossier ruling.**
§16.3 rejects "parallax, scroll-jacking, typewriter effects, particle
backgrounds" and §10 says motion is measurement. The home page already shipped a
layered scroll parallax (S2), and the owner asked for the motion and depth to be
taken much further. The owner's instruction is followed for the static image
world; the rest of §16.3 still holds and was applied: **no particles, no
scroll-jacking, no typewriter text**, and no animation library (CSS plus one
~3KB inline module). Every animation is decoration over a page that is complete
without it, except one, which is a measurement:

- **The trace pulse is motion-is-measurement.** When the liveness probe gets an
  answer, one point of light crosses the trace rail in the measured round trip
  ×25 (linear, once per measurement, never looped), and the caption states the
  factor. It never runs when the plane did not answer.

What shipped:

- **Arrival.** A station that starts off screen is assembled as it arrives, in
  reading order: headline line by line, labels sliding out from their dots,
  panels rising. Only `opacity` and the individual `translate`/`scale`
  properties move, so the `transform` that pins each label to the artwork is
  never replaced. Station 01 powers on in pure CSS from first paint (labels
  firing down the pointer column, then readout and trace); its headline, lede
  and CTA are not animated.
- **Light.** A one-time sweep across each plate on arrival; a lamp that follows
  a real pointer; panel edges that catch it; a sheen across the calls to action
  on hover. Haze and grid move against the pointer at their own depths.
- **Cuts between stations.** A veil of the page ground dims a station as it
  leaves the centre of the screen and lifts as the next arrives (wide
  composition only).
- **The labels now ride with the artwork.** The plate's scroll drift had been
  moving the artwork up to 9px under labels that stayed put; the overlay now
  takes the same drift, so labels are on their pointers at every scroll
  position, not only when a station is centred.
- **A layout-cost fix found on the way.** The parallax loop read the plate
  layer's box every frame, which forces layout inside `content-visibility:
  auto` stations; it now reads the section's own box.
- The "scroll to explore" cue is removed, as asked.

### Verified

- Every one of 208 overlay elements settles at **0.00px** from its pre-change
  position, with motion and with reduced motion; label/plate drift mismatch 0.
- Reduced motion, by execution: nothing held, nothing moved, light layers not
  rendered. JavaScript off: nothing held. Scroll-through at 1600, 1280, 834 and
  390: nothing left hidden. End-key jump: the last station arrives. Keyboard:
  31 focus stops inside stations, none invisible.
- Contrast with the lamp centred behind each of 218 text blocks: worst
  **4.69:1** (Inspector labels moved from faint to muted to get there);
  settled sweep of 259 blocks: worst 4.72:1.
- Lighthouse, home, served gzip-compressed as CI serves it: mobile **0.99**
  (LCP 2105–2180ms against 2106ms before), desktop **1.0**, CLS 0, TBT 0.
- Home still loads **no JS files**: three inline modules, ~3.7KB gz total.
- `verify` 0, render harness 35/35. /live/ untouched.

### Addendum — the production audit, and an owner-approved exception

The CI run for the motion commit failed the dependency audit on an advisory
published 18 Sep 2026 and first seen by CI on 3 Oct: GHSA-ch52-4w7c-c8xp in
`http-cache-semantics` (≤4.2.0), pulled in by `astro`. No patched version exists
(4.2.0 is the latest) and astro 7.3.5, the latest, still requires it — so no
upgrade can clear it. npm's only offered fix was astro 2.10.9.

It is not reachable here. The flaw is a shared cache serving one user's zeroed
`Set-Cookie` response to another on a client `max-stale` request. Astro uses the
package in one place, to compute the time-to-live of a remote image fetched at
build time — one process, no users, no client cache directives — and only for
remote domains allowed in astro.config, of which there are none. Astro does not
run in the deployed site at all.

The owner was asked and approved a narrow exception rather than leaving CI red.
`npm run audit:prod` (scripts/audit-check.mjs) keeps `npm audit --omit=dev
--audit-level=high` strictness and accepts this one advisory only while every
condition re-verifies on each run. Proved by injection, each reverted: remote
images enabled → fail; review date passed → fail; another dependent → fail;
exceptions list emptied → fail (plain audit strictness); a patched version
published (simulated) → fail with "upgrade instead". Review by 31 Dec 2026.

## S9 — The home page on every screen size · 3 October 2026

The owner asked for the page to look right on every phone, tablet, laptop and
desktop. Measured first, at real device widths, before changing anything.

**What the measurement found.** Phones (320–430), landscape phones and tablets
(768–1024) were already sound: no sideways scroll, nothing clipped at the
edge, smallest text 10.6px, no control under 24px. The fault was laptops. At
1280–1536px — the widths most 13–15" laptops run at — 66–78% of the text
inside the station frames rendered under 9px, some at 4px, because each frame
is composed in reference pixels of a 2528px-wide image and scales with the
screen.

**Laptops, 1025–1599px: the scene, then its detail.** Each station keeps its
scene exactly as composed — artwork, headline, every label pinned to the art,
the stat strips — with readable minimum sizes on what stays on the art. Its
panels step out into a six-track grid directly beneath, at the size they were
designed at; each station's panels are given a share of the row (third, half,
two-thirds, full, two rows deep) so its rows line up. Where larger labels met a
neighbour, each case was measured and given the room it needed (01 readout and
trace become two full-width instrument strips; 02 core label; 03 slab labels;
04 lede and call to action; 08 tag inside its drawn box). The narrow end,
1025–1179px (iPads in landscape), sets labels a pixel smaller and never below
10px.

**1600px and up is the owner's approved composition and is unchanged**: 206 of
208 overlay boxes match the earlier baseline to 0.1px; the other two are the
trace-caption fix below.

**Ultrawide (wider than 2:1).** A frame's height follows the screen's width,
so on 21:9 and 32:9 monitors a station was 1.6–2.4 screens tall. Past 2:1 the
frame is capped at twice the screen's height — what a 16:9 monitor shows — and
centred, its artwork fading at the sides; the header and footer take the same
measure. 16:9 and 16:10 screens are not affected.

**Tablets and landscape phones.** The system cards sit three across when each
can keep a 14rem measure; prose keeps a 62ch measure; a phone on its side no
longer spends a quarter of its height on top padding.

**Defects found on the way, and fixed:**

- *Safari before 18 lost every backdrop blur.* Astro minified CSS with
  Lightning CSS but passed it no browser targets, and with none it drops every
  vendor prefix: `-webkit-backdrop-filter` was written in four places and
  shipped in none. `vite.build.cssTarget` now states Vite's own baseline
  (Safari/iOS 16.4 and peers); the prefix ships, and overlay positions are
  unchanged to 0.00px.
- *The chapter rail sat on labels.* On the right edge its ticks drew across
  station 01's and 04's right-hand labels, and each link's ~100px box (tick,
  number, invisible name) caught the pointer over them and opened a station
  name on top. It now lives in the frames' left margin, each link is its 32×26
  tick zone, and the number and name appear beside it only on hover or focus.
  Measured: no station or footer text under it at 1280 or 1920.
- *The trace caption sat on the stops.* `.pnl__body p` outranked the
  caption's own margin at every width; child-qualified.
- *Laptop-width label halos were thinner than the labels.* The halo and the
  lede shadow are sized in frame units; with the labels held above frame size
  the pointer lamp could light the art between glyphs. Sized to the text in
  that range.

**Not changed, and put to the owner.** At 1600–1919px the full composition's
panel text is small (55–72% under 10px); the laptop layout would fix it but
would change the owner's own view of the page, which is theirs to decide.

### Verified

- **Device matrix**, 22 viewports from 320×568 to 3440×1440 including
  landscape phones and iPads both ways: sideways overflow 0, text clipped at a
  screen edge 0, header fits at every size; phones and tablets smallest text
  10.6px and no control under 24px. Four standalone links in wide panels are
  17–21px tall and pass WCAG 2.2 SC 2.5.8 under its spacing exception (no
  other target within 24px). Both checks proven by injection (an unbroken
  headline; a squeezed button), reverted.
- **Text on text**, 12 widths 1025–3440: 0 from 1060px up. At 1025, two line
  boxes touch at a corner with no glyph contact; the proof drawers' tilted
  label boxes overlap as rectangles, not as text (checked by eye).
- **Text past a panel edge**, nine widths 1025–1920: 0. The old probe looked
  for a class that no longer exists and could not fail; rebuilt, and proven by
  injecting a squeezed panel.
- **Contrast with the pointer lamp behind every text block on the art**:
  worst 5.07:1 at 1025, 4.90 at 1280, 4.83 at 1440, 4.62 at 1600, 4.50 at
  1920. The 1920 case ("Isolation layers") measures 4.50 in the previous
  build too, so it predates this work. That previous build, measured the same
  way, scores **1.75:1** at 1920 and 2.29 at 1600 on station 01's right-hand
  labels — the chapter rail shipped in 6f5ea23 sitting on them — which is the
  rail defect above, now fixed.
- At 1600px: 206 of 208 overlay boxes at their earlier positions, and all 208
  unchanged by the CSS-target change.
- Motion suite all 0 (reduced motion, JavaScript off, scroll-through at 1600,
  1280, 834 and 390, End-key jump, keyboard focus).
- `verify` 0, render 35/35, `audit:prod` OK, Lighthouse home mobile
  0.99/1/0.96/1 and desktop (1350px, the laptop layout) 1/1/0.96/1, CLS 0.
  Home is ~44KB gzip HTML+CSS, no external JS. /live/ untouched.

### Addendum — the deploy has not followed since 7d6c865

Remote CI is green at step level for ba94126 (Build & truth gates 19/19,
Lighthouse enforcing 9/9). The deployed origin is not: a fetch of
`https://kishanthorat.com/` carries aa0ebad's markers (`vw__sweep`,
`vw__light`) and none from 6f5ea23 or later (`vw__grain`, `data-chapters`,
`data-band` all 0). Cloudflare's own check on GitHub reports **Workers Builds:
portfolio — failure** for 7d6c865 and 6f5ea23, and no build at all for
ba94126 forty minutes after its push. The first failing build added only an
audit script, its exceptions file and CI workflow changes — nothing
`npm run build` executes — and every one of these commits builds on GitHub's
runner, so the cause is on the Cloudflare side and its log is in a dashboard
this repository cannot read. OWNER-INPUT: open the failed build in the
Cloudflare dashboard (Workers → portfolio → Builds) and either retry it or
share its log.

### Addendum — the deploy followed (correction to the note above)

Fetched after 082dd61: `https://kishanthorat.com/` now serves the S9 build —
`index.T5cimHnz.css`, the same hash as the local artifact, with
`vw__grain` 10, `data-chapters` 2, `chapters__label` 10, `data-band="third"`
11, `enter__estate` 5, and `-webkit-backdrop-filter` in the served CSS. `/`,
`/api/profile.json`, `/llms.txt`, `/systems/`, `/live/`, `/cv/` and
`/sitemap-index.xml` return 200 with their content types. The two failed
Cloudflare builds (7d6c865, 6f5ea23) were not followed by further failures;
their logs remain in the Cloudflare dashboard and the cause is not known from
here. The OWNER-INPUT above is closed unless a later push fails to deploy.

## S10 — Offline said plainly, phones, and every page in one language · 3 October 2026

The owner asked three things: what the red "no answer" readings were and to
make them right; a better phone layout; and the other pages — Systems,
Experience, How I work, About, CV — brought into the home page's design.
/live/ was left alone, as asked.

**The red readings were true.** `https://kishanthorat.com/health` returns 530
with Cloudflare error 1033: the tunnel to the control plane has no
connection, so the VM or `cloudflared` is not running. The page measured that
correctly and said "no answer" in alarm red in seven places, which read as
the page being broken. Restarting the backend needs the owner's access
(OWNER-INPUT: start the VM / tunnel, or dispatch Deploy API). What changed is
how the same truth is said: one word, "offline", in the register's amber —
already this design's colour for "cannot reach the plane" (contrast gate
pairing) — a status sentence saying when it was checked, quiet dashes for
readings that could not be taken, and a trace caption that says nothing on
the panel is a measurement. An event-stream note that asserted the backend's
state at build time ("the plane is not answering") would have gone false the
moment it came back; it now says only what the page does.

**Phones.** Every station after the opening one shows its artwork as a framed
picture at full strength above its text, instead of a dim backdrop under a
reading scrim — the treatment 07 and 08 already had, and the one that read
best. Same plate file, no extra download. Phone headlines carry the wide
composition's gradient words.

**Every inner page.** A shared opening (PageHero), a glass material
(tokens.css), numbered section headers with ramp emphasis, and restyled
cards, pills and buttons; the systems lit in their home-page hues
(config/system-hue.ts); case studies with a sticky section index and the
other two systems at the end. No plate, stage or rail leaves `/` —
station-check passes with all 10 static pages free of the world. Every
sentence is unchanged.

**Defect fixed.** About's closing paragraph rendered "them.The CV" and "isa
PDF": Astro's HTML compression drops a line break before an inline link. A
scan of every built page found it there and in the noindex gallery; both
now carry explicit spaces.

**The CV PDF.** Proved untouched by rendering it from this build and from the
previous commit: byte-identical (sha256 dead3d27…). The committed cv.pdf
dates from ae7ba33 and renders differently, but its text is identical to
today's, so it was not regenerated. Note: `cv-pdf.mjs --check` also writes
the PDF; it was restored from git after the check.

### Verified

- Offline state captured on station 01 (desktop and phone), 04, 06 and the
  trace; all four home scripts still inline.
- Phones and tablets, home: 10 viewports 320×568–1024×1366, no overflow,
  no edge clipping, smallest text 10.6px, no control under 24px; motion
  suite 0.
- Inner pages: 9 routes × 6 viewports 320–1920, no overflow or edge
  clipping, no control under 24px (case studies' smallest text is the
  existing diagrams' 9.5px labels); nothing hidden under reduced motion,
  JavaScript off, or after scrolling.
- Lighthouse 1/1/1/1 mobile and desktop on all eight inner routes; home
  0.99/1/0.96/1 mobile, 1/1/0.96/1 desktop (unchanged).
- `verify` 0, render 35/35.

## S11 — The artwork on every page, by owner direction · 3 October 2026

**A change of scope, on the owner's instruction, recorded because it reverses
S3.** S3 returned the image world to `/` after it had leaked onto every route
through shared files — a leak, not a choice. On 3 Oct 2026 the owner chose
the opposite on purpose: "why dont you use those images in those other pages
also i mean the relative one and also best suited like for about you can use
my photo which is there already". The rule was moved to where the data now
puts it, not dropped: `config/page-art.ts` declares which plates each route
may show; `PlateImage` refuses to build an undeclared one; station-check fails
the build on any undeclared plate, any declared plate a page does not show,
any declared route with no page, and any plate reference it cannot read. The
stage, plate layer, rail, stations stylesheet and world scripts remain `/`
only.

| page | scene |
|---|---|
| /systems | 02 the three islands; each system's panel shows its own island |
| hospital / menu / electrical case studies | 03 architecture · 04 request path · 09 evidence archive; the closing cards show the other two islands |
| /experience | 06 the globe |
| /engineering | 07 the owner at his desk; 05 the lab over the two lessons |
| /about | 08 the owner over the city; a portrait from 07 in the side card |
| /cv | 01, screen only — the print rules and the PDF are untouched |
| /404 | 10 |

**The About headshot OWNER-INPUT is closed** by the owner's instruction to use
the existing picture of him; the copy gate now reports 12 markers.
`Headshot.astro` remains for a photograph if one is supplied.

**Gate defect found and fixed.** station-check §3's three element markers —
station rail, plate layer (`.vw`), stage shell — had their `\b` word
boundaries stored as literal backspace bytes (0x08), so each required a
backspace inside a class attribute and none had ever matched. Only the
plate-path marker had been working, which is why S3's leak was caught at all.
Proven both ways: with all three elements injected into one built page, the
gate at the previous commit reported nothing and the repaired gate reports
all three.

### Verified

- Gate, by injection, each reverted: stage shell, rail and plate layer on
  inner pages; an undeclared plate; an unreadable plate reference; a plate on
  an undeclared page; a declared plate missing; a declared route with no
  page — all eight fail. A page asking `PlateImage` for an undeclared plate
  fails the build ("plate "lab" is not declared for "/about"").
- Opening text against the actual pixels of each scene (glyphs removed, 98th
  percentile), 9 pages at 1440, 1100 and 390: worst 5.00:1. The probe fails
  when the scenes' fade is removed. It found the case studies' stack tags at
  2.4–3.2:1 over bright scene areas; they now sit in the text column on a
  solid backing.
- 9 routes × 10 viewports 320–2560: no overflow, clipping or small targets.
  Nothing hidden under reduced motion, JavaScript off or after scrolling (the
  one transparent element is the empty, aria-hidden light sweep).
- Motion: scene scale 1.07 → 1 over the opening, drift 7% at half a screen
  of scroll; under reduced motion, none of it.
- CV PDF rendered from this build: byte-identical to the previous render
  (sha256 dead3d27…).
- `verify` 0, render 35/35, home motion suite 0.
- Lighthouse, mobile and desktop: 1/1/1/1 on every inner page.

### Budget note, measured, open

The opening picture is now the largest paint on each inner page, so simulated
mobile LCP (local Lighthouse, gzip-served) rose from 1.50s to **1.66s** on
the hospital case study, Experience, How I work and the CV, and to **1.81s**
on the menu and electrical case studies and About, and **1.88s** on Systems
(1.81s with its island pictures removed) — against the §11 static budget of
1.8s. The same harness reads the home page, recorded as meeting that budget,
at 2.26s, so it is not the instrument the budget was set on; in Chrome under
DevTools slow-4G throttling with 4× CPU the same pages paint their largest
element in 0.85–1.02s. Tried and measured: a head preload of the opening
picture (worse, 1.88s — it competes with the font preloads; reverted);
deferring off-screen sections with `content-visibility` (no change, and a
0.009 CLS; reverted); the 768px file on phones and low priority for every
non-opening picture (kept). Systems at 1.88s and three pages at 1.81s are
flagged for the owner rather than declared met.

## S12 — Labels on the artwork, on phones · 3 October 2026

The owner asked whether the reference images could be used directly on
phones and in the inner pages' open space, and left the decision with me.
**Decided against, and the owner told why:** the references print invented
metrics as live readings ("SYSTEM ONLINE", "ALL SYSTEMS OPERATIONAL",
2,487 req/min, 99.99% uptime, 12.4K active tenants, per-system 99.96%),
dozens of misspellings ("API SATEWAY", "DATA LATER", "IMPRASTRUCTURE",
"06 / TWINK"), a non-working menu bar, text that is 2–3px tall at phone
width and invisible to search and screen readers, and weigh 5–7MB each.
Their own README: "They are not background images. They are visual
specifications." Rules 1, 4 and 12 of the constitution would each be broken.

What the owner wanted from them — the scene with its parts named on it — is
built from what is true instead: `Stage` pins on the clean plates in the
narrow composition, every name one the wide composition already prints.
Station 01 on a phone now opens on its labelled picture, as reference 01
does. Details and verification in commit `feat(home): labels pinned…`.

One defect found and fixed during the work: CSS view-timeline animation of
the pins left them all at opacity 0, because the card's `overflow: hidden`
makes it the timeline's scroll container and it never scrolls. The reveal
moved to stage-motion.ts, where every other arrival on the page lives.

## S13 — Experience as a timeline, and the home page under a slow network · 4 October 2026

**Experience.** At the owner's 1692px it was one narrow column with most of
the width empty. Now: a career line across the foot of the opening (the
three stages, oldest first, each a link); the roles as a timeline with the
period held in view beside each one and its bullets as tiles; "What
transferred" beside plate 10 with the three stages on its path (declared in
page-art.ts); numbered side projects; a way on. The earliest stage is
parsed out of `CV_EARLIER_CAREER`, and the build fails if that line changes
shape — it is never retyped. Every bullet unchanged; confidential-parity
still matches all six to /cv.

**"The home page is loading slow."** Measured before changing anything, on
throttled slow-4G and 3G, cold and warm, at the owner's screen and a phone,
against a local server reproducing the live origin's caching
(`build/verify/serve-cf.cjs`, `load-test.cjs`). Four causes, four fixes:

| cause | fix |
|---|---|
| every frame empty until its artwork arrived (5.9–8s on 3G at desktop size) | ~250-byte instant previews of each plate, inlined with the page; the frame shows its scene on first paint |
| the live origin sent `max-age=0, must-revalidate` for content-hashed files | year-long `immutable` for `_astro/`, `visual-world/`, `live/assets/`; a week for fonts; pages unchanged |
| a 1692px @1.5 screen picked the 2528px files | a source capped at the 1920 rung for screens up to 1920px |
| the arrival choreography ran ~3s after load, warm or cold | the same moves at about half the length |

Before → after, cold: opening artwork at 1692 on slow-4G 2.90s → 2.18s, on
3G 7.95s → 5.89s, and the frame is never empty; bytes 573KB → 425KB. Warm:
re-asked files 6–7 → 2; artwork 379ms → 192ms. Text paints at ~1.0s on
slow-4G in both. Two new gates, each proven by injection: station-check
fails a missing or stale preview; emit-headers fails if a file in an
immutable folder is not content-hashed.

The caching takes effect only once deployed; verified by fetching after the
push (addendum below).

### Addendum — the caching verified on the live origin

Fetched after 9cb3b50 deployed: `/_astro/*.css` and `/visual-world/*.avif`
now return `public, max-age=31536000, immutable`; fonts `public,
max-age=604800, stale-while-revalidate=2592000`; `/favicon.svg` a day; `/`
and `/experience/` still `public, max-age=0, must-revalidate`, as intended.
The home page carries all ten `data-preview` hooks; /experience/ serves the
career line. `/`, `/systems/`, `/about/`, `/cv/`, `/cv.pdf`, `/live/` and
`/api/profile.json` return 200. CI 28/28 at step level.

## S14 — The pointer and the favicon · 4 October 2026

**The pointer.** The owner found the pointer light unconvincing. It was one
54vmax disc of blue haze tracking the pointer one-to-one — a fog that lit
nothing in particular. Replaced by `scripts/pointer.ts` and
`components/Pointer.astro`, on every page: a trailing ring beside the
system cursor (never hidden), and on the art a lamp — a small bright pool,
the scene falling away around it, and the drafting grid lighting up in
violet near the pointer — all driven by one eased position. Mouse only, off
under reduced motion and forced colours, and the loop idles at 0 frames.

The light is the one thing on the page that moves behind text, so it was
held to the contrast floor with the light directly behind each of 795 text
blocks at four widths. The first strength failed (worst 3.71:1); the probe
separated the causes (an over-bright pool; lit grid lines behind small
labels — 3.98 with, 5.48 without), and the final light passes everywhere,
worst 4.56:1 against the old light's 4.50. The opening's reading labels
gained the callouts' glyph halo.

A device-matrix run once flagged "08 · Build" past the screen edge at 390px;
measured directly it sits inside its card at every device pixel ratio, and
three repeat runs were clean — a reading taken before that deferred section
had laid out, not a defect. Recorded rather than dropped.

**The favicon.** It was still green and set as font text. Now the header's
KT mark drawn as strokes — dark tile, brand-ramp ring — with ICO, Apple
touch and manifest icons rendered from it by `scripts/make-icons.mjs`, and
a `site.webmanifest`. /live/ uses /favicon.svg already and was not touched.

## S15 — /live/ as a working drawing; the ten-station world preserved · 4 October 2026

**Owner direction, approved after the deep audit and the visual research:**
the public /live/ becomes a live architectural drawing of the real system.
The audit and research are owner-held documents, not repository files.

**What /live/ is now.** Five sheets, one per demonstration — A-101
Isolation, A-102 Rate limits, A-103 Payments, A-104 Duplicate evidence,
A-105 AI routing — each a real page (`/live/<sheet>/`), and a title block
stating only what the system said: status, tenant, valid-until clock, edge
and measured round trip, transport, live channel and presence, the
revisions the database wrote. Paper ground, graphite ink, colour by meaning
only: cyan = the tenant boundary, vermilion = a refusal, green = LIVE,
violet = the KT mark. Media: DOM for every word and all evidence; SVG for
the plans, laid out in CSS pixels at their real width so lettering is the
same size on a phone. No WebGL and no animation library on this page.
Motion is five verbs — draft, ink, hatch, stamp, revise — each started by a
state the system reached: request sent → dashed line in flight; response →
the line inks to where it stopped; 403 → the wall inks cyan and is annotated
with the policy read live from `pg_policies`; audit row over the socket → a
revision cloud and a numbered row. Every number on a dimension line is
`performance.now()` around the real fetch. Each sheet reads plain words
first (you / the system received / what it did / result / why / proof),
then a collapsed "technical evidence" block with the exchanges, SQL, plan,
policy and digests. Home-page storytelling (systems, think, build, proof,
end) is gone from /live/.

**LIVE / PARTIAL / RECORDED, derived, never chosen.** LIVE = a tenant the
control plane provisioned and a socket that said hello. PARTIAL = a real
tenant with the channel down; revisions are then read from `/v1/audit` and
labelled so. RECORDED = the control plane did not answer; every sheet then
plays a real captured exchange at the interval it took, labelled with its
capture time, environment and a timing caveat, never attributed to the
visitor ("Recorded tenant", "The request", "none of them are yours"), and no
receipt is issued. The failure is stated in words with its status as
evidence ("the edge answered, the control plane behind it did not (HTTP
530)"), not as an alarm.

**The recorded set** (`apps/experience/src/live/recorded-exchanges.json`)
was captured by the new `scripts/capture-exchanges.mjs` from the
production-shaped stack (`infra/compose.yml` with the loopback override) at
2026-10-04T08:31Z, commit 090589d, API p8-local: isolation 403 with policy
and plan; limits 10 × 200 then 10 × 429 (Retry-After 60); payments one
activated, one replayed; fraud 201 then 409; AI data plane at 0 tokens and
model plane charged 266 tokens (model plane not configured — the server's
own answer says so). Keys redacted; the file was scanned for keys and
addresses before commit. Never hand-edited; validated on load.

**A defect found by building, in shared code.** `live/source.ts` sent its
`subscribe` messages on socket open. The gateway attaches its message
listener only after resolving the credential and registering presence, so
those frames arrived in the gap and were dropped silently: hello, then
nothing — not the world, not the visitor's own audit rows. Traced frame by
frame in a real browser against the production-shaped stack. Fixed on the
client by subscribing on `hello`, the gateway's own ready signal; the
backend is unchanged. After the fix the `record.read denied` row arrives
over the socket as REV 2 within the same second as the 403.

**Preservation.** Tag `live-ten-stations-090589d` marks the last commit with
the ten-station world as /live/. Nothing was deleted or moved: its entry is
now `src/archive.tsx` (the old `main.tsx`, unchanged below its header) with
its own shell `archive/index.html`, built alongside the drawing and served
at `/live/archive/` (unlisted, noindex), all fourteen of its pages under
`/live/archive/<slug>/`. One change made it runnable there: `LIVE_BASE` in
`router.ts`, so the world's own URL writes stay inside the archive.
`render/Scene.tsx`, `render/World.tsx` and `bench.tsx` were already
unreachable and remain in place. The nine retired narrative URLs
(`/live/systems/` and the rest) 301 to `/live/` through a generated
`dist/_redirects`; the five demonstration URLs remain real pages. Restoring
the world as /live/ is one line: point `index.html` at `src/archive.tsx`.

**Build changes.** Two Rollup inputs; per-sheet pages from the drawing shell
and per-station pages from the archive shell; a canonical per shell. The
`react` manual chunk matched any `node_modules/react*` prefix and now
matches only react, react-dom and scheduler. `emit-headers.mjs` also emits
`_redirects` (failing if a redirected path is a built page) and
`.assetsignore` with `*.map`: the hidden source maps (~6 MB) stay on disk
and are no longer uploaded. Both metafile names verified against the
installed wrangler. `.prettierignore` gains the archive shell, for the same
reason as the main shell.

**Dependencies.** `audit:prod` failed on main independently of this work: a
patched http-cache-semantics (4.3.0) was published, so the recorded
exception no longer held. Per §9.1 the lockfile was regenerated from
scratch inside a Linux container (node:24-bookworm-slim), `npm ci` was
verified there and on Windows (704 packages), and the exception was
removed. 49 version changes, all within existing ranges (wrangler 4.147.0,
vite 8.3.2, pg 8.23.1 among them). No new dependency.

### Verified

- `npm run verify` exits 0 on the fresh tree: typecheck, build, copy, links,
  HTML, contrast, confidential parity, machine parity, fast lane, stations.
  `format:check` clean; `audit:prod` clean with zero exceptions.
- The copy gate covers the new copy: injecting "seamless" into the drawing
  headline failed it (`dist\live\copy.json:329`); reverted uncommitted.
- API on the new lockfile: check, build, and the full suite against real
  Postgres and Redis — 121 tests, 21 suites, 0 failures.
- LIVE, end to end in a browser against the production-shaped stack at
  1440×900, 820×1180 and 390×844: all five demonstrations ran for real; the
  REV rows arrived over the socket; 0 px horizontal overflow. RECORDED at
  1440×900 and 320×700 with the API answering 530: all five sheets play.
- Reduced motion, executed: 0 of 19 marks animate, every line is drawn
  complete, the outcome is announced in the live region. The keyboard
  reaches the action; focus ring 2px solid.
- Routes on the built tree: `/live/systems/` and `/live/end` 301 to
  `/live/`; `/live/payments/` is its own page; `/live/archive/` and
  `/live/archive/systems/` render the preserved world with its canvas and
  no page errors.
- Weight: the public /live/ ships 101.9 KB JS gz (app 22.4, React 79.1,
  runtime 0.4) and 4.4 KB CSS gz, against 366 KB JS gz before. Under
  Lighthouse's mobile profile (1.6 Mbps, 150 ms RTT, 4× CPU) through gzip,
  three runs: FCP 624–660 ms, LCP 1364–1396 ms, CLS 0, 212 KB transferred
  including fonts. Measured locally, not on the origin.
- The console errors in a LIVE run are only the browser logging the real
  403/409/429 refusals, and the local 404 for `/cdn-cgi/trace`.

### Still open

- **The production control plane is down** (530 / 1033 since at least
  3 October). The only Google account on this machine has no permission on
  `engineering-portfolio-prod`, so it could not be inspected or restarted
  from here; /live/ shows RECORDED in production until it is restored.
  OWNER-INPUT: restore the project's billing/API access and the VM, then
  confirm `/health/ready` from outside.
- Frame and interaction timing on a named mid-range phone: not measured.
- `scripts/render-verify.mjs` drives the ten-station world at `/live/`; it
  has to point at `/live/archive/` to keep measuring it.

### Addendum — deployed and verified on the live origin

Fetched after da3b423 deployed: `/live/` serves `main-Dv03eQOg.js`, the same
hash as the local build; `/live/`, `/live/payments/`, `/live/archive/`,
`/live/archive/systems/`, `/live/copy.json` and `/` return 200;
`/live/systems/` returns 301 to `/live/`; the bundle's `.map` now returns 404;
assets carry `immutable`; `/live/` carries one CSP, the live policy. A browser
run on `https://kishanthorat.com` at 1440×900 and 390×844: the edge answers
(SIN, 76 ms measured), the control plane does not (530), so the page states
RECORDED and all five sheets play their recorded exchanges; 0 px horizontal
overflow. The only other console error is Cloudflare's injected analytics
beacon, which the existing CSP blocks — a pre-existing dashboard setting, not
changed here. Remote CI for da3b423 green at step level: Build & truth gates
19/19, Lighthouse 9/9, control-plane tests 18/18, container image 6/6.

## S16 — /live/ recorded by design, CI-verified, and three investigations · 5 October 2026

**Owner decision, final:** no VM. GCP credits are exhausted and no other
backend is to be created. The deployed /live/ is static, recorded by design,
and adds three investigations of real defects. This amends the dossier's
founding premise — "a visitor is provisioned as a real tenant inside a real
running system" — which cannot hold without a control plane; the LIVE path is
kept, unchanged, behind a flag, so a future backend restores it without a
rewrite.

**Recorded by design.** With `VITE_LIVE_BACKEND` unset (the deployed state)
the page reads the edge and loads the recorded set, nothing else: no
provisioning, no socket, no request to `/v1/*`, no retry control, no
live-channel row, no receipt. The opening reads "Recorded runs of a real
multi-tenant system" with one line of provenance — recorded from the real
system · re-verified by CI on every push · source. With the flag on against
the local stack the page still goes LIVE, the 403 arrives and REV 2 is pushed
by the database trigger. A static-host 404 from `/v1/*` is now described as
"no control plane answers at this address", not as a refusal.

**Set B — investigations**, on the same frame and title block as the five
demonstrations (untouched): B-201 (efbf654, bb4fd82), B-202 (3cf7754,
7b4cf85, historical, 17–18 Aug), B-203 (3ed473e, historical, 17 Aug). Each
reads symptom → evidence in inspection order → investigation → cause → fix →
protection → source, with a static sequence drawing. Every quoted line was
checked against the commit it cites; one citation was caught pointing at a
commit that already contained the fix and was corrected before commit. The
first E1 draft showed JSON frames the repository does not record; it now
quotes the order the commits record, in words.

**The protections are real, and each was proven by breaking it:**

| Case | Protection | Where it runs | Proof |
|---|---|---|---|
| B-201 | gateway queues frames that arrive before the subscriber exists (bb4fd82); test subscribes the instant the socket opens | API workflow | before the fix: "timed out waiting for the early world subscription. Received: ["hello","presence"]"; after: pass, suite 122/122 |
| B-202 | `gate:policy` — composes `_headers` as Cloudflare does (shared `scripts/lib/cloudflare-headers.mjs`) and re-applies both defects every run | CI | removing the `/live/*` unset: "receives 2 Content-Security-Policy headers" |
| B-203 | `gate:release` — the committed release script under `bash -s`, docker stubbed, exec reading stdin | CI | redirect removed: exit 0, no marker (run #3's shape) |

**Recording conformance.** A new CI job starts the real API on PostgreSQL 17
and Redis 7, captures the five demonstrations afresh, and compares them with
the committed recording by behaviour (statuses, outcomes, routes, the refusing
policy, replays, digest, audit rows) — never timings or ids. Proven locally:
altering the recorded fraud status and AI route failed it with both diffs
named; a built-in tampered copy must fail on every run. The fresh capture is a
CI artifact. **`verify:live`** (CI, runner's Chrome) proves the no-backend
behaviour in a browser: 47 checks; forcing the backend flag on fails it.

### Verified

- `npm run verify` exits 0 (13 gates, including `gate:policy` and
  `gate:release`); `format:check` clean; API suite 122/122 on real Postgres.
- `verify:live` 47/47; widths 320×700, 390×844, 820×1180, 1440×900 with 0 px
  overflow on `/live/` and `/live/b-201/`; reduced motion leaves nothing
  running; keyboard reaches the action with a visible ring.
- `render-verify` now measures the archived world at `/live/archive/`: 35/35.
- The homepage build is byte-identical (dist/index.html sha256 prefix
  d9a07cb220ae9d94 before and after); no file under `apps/static` or the five
  sheets changed.
- The html gate caught one defect during the work — a page title over 70
  characters on `/live/b-201/` — fixed by shortening the three titles.
- Public /live/ JS 24.3 KB gz (was 22.4 for the app chunk), CSS 4.8 KB gz.

### Still open

- No backend in production by decision; `/health`, `/v1/*` and `/r/*` still
  route to the unconnected tunnel (530) and were deliberately left as they are.
- The homepage liveness panel will keep reporting the control plane
  unreachable; the homepage is locked, so it is recorded, not changed.
- Product videos and the 12 case-study screenshot slots: not part of /live/.

### Addendum — CI, deployment and production verification

First CI run of the new jobs (178ed43, run 37233605783) failed twice, both
fixed in 762dd4c: the recording job set NODE_ENV=production at job level, so
`npm ci` skipped devDependencies and the API build had no types; and
`verify:live` raced a View Transition after a tab click, reproduced in the
Linux Playwright image (v1.63.0-noble) and fixed by waiting for the new
sheet. CI for 762dd4c (run 37234591929): Build & truth gates 22/22,
Lighthouse 9/9, recording conformance 14/14 — the committed recording matches
a fresh capture on GitHub's runners; artifact
`recording-conformance-37234591929` retained. API workflow for 178ed43 (run
37233605742): control-plane tests 18/18 steps (122 tests, including B-201),
container image 6/6. Deployed by Workers Builds: the origin serves
`main-CUR9PKVe.js`, the local hash; `verify:live` run against
https://kishanthorat.com passes 47/47 (RECORDED from the first load in
684 ms, zero requests to /v1/*); /live/b-201/, /b-202/, /b-203/,
/live/archive/ and /live/payments/ return 200; /live/systems/ 301s to /live/;
the served homepage is byte-identical to the build (d9a07cb220ae9d94); all 16
GitHub links the investigations cite return 200.
