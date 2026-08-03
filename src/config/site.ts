/**
 * Site-wide verified facts. Every value here traces to docs/CV_SOURCE.md —
 * this file is the single place contact identity lives, so a correction is one
 * edit, not a hunt.
 */
export const SITE = {
  name: 'Kishan Thorat',
  role: 'Software Engineer',
  /** Locked one-sentence claim — blueprint §1. Wording change requires an amendment. */
  claim: 'I design, build, and operate production systems.',
  /** Locked sub-line — blueprint §1. */
  subline:
    'Three multi-tenant SaaS platforms — one in daily use at a hospital, one live with ' +
    'subscription billing — engineered and operated end-to-end as sole engineer, alongside ' +
    'enterprise AI workflow automation for a UK client.',
  email: 'kishanthorat111@outlook.com',
  linkedin: 'https://linkedin.com/in/kishanthorat',
  github: 'https://github.com/KishanThorat111',
  repo: 'https://github.com/KishanThorat111/engineering-portfolio',
} as const;

/** Hero status chips — blueprint §2, Home section 1 (locked set). */
export const STATUS_CHIPS = [
  '3 platforms',
  '1 in hospital production',
  '1 live with billing',
  '1 pre-launch',
] as const;
