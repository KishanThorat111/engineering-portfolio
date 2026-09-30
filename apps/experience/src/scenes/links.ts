/**
 * Identity and contact, mirrored from the static surface's `config/site.ts`.
 *
 * Values are copied from that file deliberately and must not drift: it is the
 * single place contact identity lives, and CV_SOURCE.md is what it traces to.
 * The phone number is absent here for the same reason it is absent there —
 * nothing under src/ may render it, so it cannot reach built output.
 *
 * ROLE IS "Software Engineer" AND NOTHING ELSE.
 * Truth Constitution rule 6: engineer, never founder. The copy gate enforces
 * the banned-word list against built output, and this is the one string on the
 * experience surface most likely to attract an upgrade.
 */
export const SITE_LINKS = {
  name: 'Kishan Thorat',
  role: 'Software Engineer',
  email: 'kishanthorat111@outlook.com',
  /** Traces to the CV's Additional Information line. */
  availability: 'Open to relocation — UK · available immediately',
  profiles: [
    { label: 'GitHub', href: 'https://github.com/KishanThorat111' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/kishanthorat' },
    { label: 'Source', href: 'https://github.com/KishanThorat111/engineering-portfolio' },
  ],
} as const;
