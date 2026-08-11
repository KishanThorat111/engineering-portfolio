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
