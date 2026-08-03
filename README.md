# kishanthorat.dev — engineering portfolio

Source for [kishanthorat.dev](https://kishanthorat.dev), an evidence-first engineering
portfolio. Every claim on the site traces to a source document, every number carries its
date qualifier, and every case study discloses at least one honest limitation. Those rules
are enforced by CI, not by intention — the build fails if banned marketing language ships.

This repository is part of the portfolio. The commit history, the CI configuration, and the
planning documents in `docs/` are meant to be read.

## Stack

- **Astro 5 + TypeScript (strict)** — static-first, zero client-side JavaScript by default
- **Hand-written CSS** with custom-property design tokens (`src/styles/tokens.css`)
- **Self-hosted, subset variable fonts** — Inter and JetBrains Mono
- **GitHub Actions CI** — typecheck, build, banned-words copy gate, internal link check,
  HTML validation, and Lighthouse (warn-only until launch hardening)
- **Cloudflare Pages** for hosting

## Run

```sh
npm ci          # install exact dependencies
npm run dev     # local dev server
npm run build   # production build to dist/
npm run verify  # run every CI gate locally: typecheck, build, copy gate, links, HTML
```

## Documents

- `docs/PORTFOLIO_IMPLEMENTATION_BLUEPRINT.md` — the implementation contract
- `docs/ENGINEERING_IDENTITY_REPORT.md` — the identity work behind it
- `docs/PHASE_LOG.md` — append-only record of each implementation phase
- `CLAUDE.md` — the standing contract for implementation sessions

## Licence

MIT — see [LICENSE](LICENSE).
