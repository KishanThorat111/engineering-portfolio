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
}

export const PILLARS: readonly Pillar[] = [
  {
    title: 'Production operation, not just delivery',
    line: 'Systems with real users and real consequences, personally operated.',
  },
  {
    title: 'Multi-tenant security as a discipline',
    line: 'Server-derived organisation scoping, isolation regression suites, documented threat handling.',
  },
  {
    title: 'Cost-first AI engineering',
    line: 'SQL-first routing before any model call, token budgets, provider circuit breakers, injection defence.',
  },
  {
    title: 'Compliance as a design input',
    line: 'DPDP-aligned PII encryption, audit trails, accreditation reporting, GDPR and DPDP audit experience.',
  },
  {
    title: 'Engineering judgment, shown honestly',
    line: 'Decision records, an enforced charter, disclosed limitations, and lessons that changed the next system.',
  },
] as const;
