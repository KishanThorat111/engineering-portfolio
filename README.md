# engineering-portfolio

Source for an evidence-first engineering portfolio, currently served at
[portfolio.kishanthorat.workers.dev](https://portfolio.kishanthorat.workers.dev).

Every claim on the site traces to a source document, every number carries its date
qualifier, and every case study discloses at least one honest limitation. Those rules are
enforced by CI, not by intention — the build fails if banned marketing language ships, if a
system has nothing to disclose, if a figure travels without its date, or if the
machine-readable profile and the human pages start telling different stories.

This repository is part of the portfolio. The commit history, the CI configuration, and the
planning documents in `docs/` are meant to be read.

## Layout

```
apps/static        the fast lane, SEO surface, machine layer, and fallback — Astro
apps/experience    the live experience surface — lands in Phase 4
services/api       the control plane — lands in Phase 1
scripts/           the truth gates, run against the composed dist/
content/           repository-wide constitutional data (the banned-word list)
docs/              the planning record, including the append-only phase log
dist/              the composed deployment artifact every surface builds into
```

`apps/experience` and `services/api` are empty on purpose and say why in their own READMEs.
The backend is built before the frontend, because the frontend renders real data and
building it against imagined data would produce a beautiful thing wired to nothing.

## Stack

- **Astro 7 + TypeScript (strict)** — static-first, zero client-side JavaScript by default
- **Hand-written CSS** with custom-property design tokens (`apps/static/src/styles/tokens.css`)
- **Self-hosted, subset variable fonts** — Inter and JetBrains Mono
- **Cloudflare Workers static assets** — deployment config is committed (`wrangler.jsonc`),
  not held in a dashboard
- **GitHub Actions CI** — ten checks, every one of which can fail the build: dependency
  audit, formatting, typecheck, build, banned words against built output, internal links,
  HTML validation, token contrast, confidential-content parity against the CV, and
  machine/human parity. Lighthouse is warn-only until launch hardening.

## Run

```sh
npm ci            # install exact dependencies for every workspace
npm run dev       # local dev server for the static surface
npm run build     # production build into ./dist
npm run verify    # every CI gate, locally, in CI's order
npm run cv:pdf    # regenerate the committed CV PDF (local only — needs Edge or Chrome)
```

## Documents

- `docs/MASTER_IMPLEMENTATION_DOSSIER.md` — the product and the architecture
- `docs/PHASE_LOG.md` — append-only record of each implementation phase
- `docs/PORTFOLIO_IMPLEMENTATION_BLUEPRINT.md` — the static surface's contract
- `docs/ENGINEERING_IDENTITY_REPORT.md` — the identity work behind it
- `CLAUDE.md` — the standing contract for implementation sessions

## Licence

MIT — see [LICENSE](LICENSE).
