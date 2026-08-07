/**
 * The five value-proposition pillars — blueprint §1, transcribed.
 *
 * These live in config rather than a content collection because there is no
 * pillar schema in the ratified set (system, experience, decision, lesson,
 * evidence-chip). Holding them in one exported module still satisfies
 * constitution rule 10: the Home teaser, the /engineering page in Phase 6, and
 * the Phase 7 machine layer all read this array rather than three copies of
 * the same five sentences.
 *
 * Phase 6 adds a concrete evidence line to each on /engineering (blueprint
 * §4.5a); Home shows the one-line form only.
 */
export interface Pillar {
  title: string;
  line: string;
  /**
   * One concrete, traceable thing that makes the pillar more than a slogan
   * (blueprint §4.5a). Shown on /engineering only — Home carries the one-line
   * form. Every figure here carries its date, same rule as everywhere else.
   */
  evidence: string;
}

export const PILLARS: readonly Pillar[] = [
  {
    title: 'Production operation, not just delivery',
    line: 'Systems with real users and real consequences, personally operated.',
    evidence:
      'A hospital runs its housekeeping on a platform I deploy myself, where the pipeline searches the running container for a marker string that only exists in a fresh build — because a deploy that reports success while serving stale files is the failure nobody investigates.',
  },
  {
    title: 'Multi-tenant security as a discipline',
    line: 'Server-derived organisation scoping, isolation regression suites, documented threat handling.',
    evidence:
      'One tenant-isolation regression file per tenant-owned resource, each asserting that another organisation receives a not-found rather than a forbidden — because a forbidden response confirms the resource exists (Electrical platform, as of Jul 2026).',
  },
  {
    title: 'Cost-first AI engineering',
    line: 'SQL-first routing before any model call, token budgets, provider circuit breakers, injection defence.',
    evidence:
      'A classifier answers the common operational questions straight from the database at zero model cost, and only what it does not recognise reaches a model — under a per-organisation monthly token budget and a per-user daily cap (hospital platform, as of Jul 2026).',
  },
  {
    title: 'Compliance as a design input',
    line: 'DPDP-aligned PII encryption, audit trails, accreditation reporting, GDPR and DPDP audit experience.',
    evidence:
      'Identity and health fields encrypted before they reach a column, guest contact details anonymised on a clock, and a self-service personal-data export — designed in from the first migration rather than retrofitted across live hospital data.',
  },
  {
    title: 'Engineering judgment, shown honestly',
    line: 'Decision records, an enforced charter, disclosed limitations, and lessons that changed the next system.',
    evidence:
      'The flagship case study on this site opens its limitations section by stating that the platform has no automated test suite at all. That is the most useful sentence here, and it is the one most portfolios would delete.',
  },
] as const;
