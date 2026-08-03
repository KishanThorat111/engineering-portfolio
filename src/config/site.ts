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
  /**
   * PRINT ONLY — deliberately absent from the rendered web page, present in
   * the downloadable PDF. Do not "fix" this by showing it on /cv.
   *
   * The rule is that the site and the PDF must state identical *claims*;
   * contact routing is not a claim. A recruiter who downloads the CV gets the
   * number they need, while a public web page does not display a personal
   * mobile to every passer-by and scraper. The split is implemented in
   * src/pages/cv.astro with a `print-only` class, and the PDF is captured
   * under print emulation, so it picks the number up automatically.
   */
  phone: '+91 95386 65107',
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
