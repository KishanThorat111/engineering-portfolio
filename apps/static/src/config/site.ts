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
  /*
   * There is deliberately no phone number here.
   *
   * It lives in content/print-contact.json, which nothing under src/ imports,
   * so no page can render it and it never reaches the built HTML. The PDF
   * script injects it at print time instead. An earlier version hid it with a
   * print-only CSS class, which kept it out of sight but left it in the page
   * source for anything harvesting contact details. Do not add it back here.
   */
  linkedin: 'https://linkedin.com/in/kishanthorat',
  github: 'https://github.com/KishanThorat111',
  repo: 'https://github.com/KishanThorat111/engineering-portfolio',
  location: 'Belagavi, India',
  /** Blueprint §2, Home section 6. Traces to the CV's Additional Information line. */
  availability: 'Open to relocation — UK · available immediately',
  languages: ['English', 'Hindi', 'Kannada', 'Marathi'],
} as const;

/** Hero status chips — blueprint §2, Home section 1 (locked set). */
export const STATUS_CHIPS = [
  '3 platforms',
  '1 in hospital production',
  '1 live with billing',
  '1 pre-launch',
] as const;
