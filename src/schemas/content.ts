/**
 * The five content entity schemas — the Truth Constitution as a type system.
 *
 * Every schema below is shaped so that the honest version of a claim is the
 * only version that compiles. These constraints are not validation in the
 * ordinary sense — there is no hostile stranger submitting input here. They
 * are guard rails against the author: written in a moment of discipline to
 * bind a later moment of haste. That is the entire idea. A schema outlives the
 * author's good intentions, which is why encoding a rule beats promising one.
 *
 * They live here, apart from `src/content.config.ts`, so that the collection
 * config wires loaders while these stay independently importable. The
 * `/dev/components` preview parses its limitation and metric fixtures through
 * `limitationSchema` and `qualifiedMetricSchema` directly, and renders the
 * real evidence-chip collection, so the gallery is checked against the same
 * rules the published content obeys rather than a copy of them.
 *
 * Shared primitives and the reasoning behind each rule: `./constitution.ts`.
 */
import { z } from 'astro/zod';
import {
  claimText,
  dateQualifierSchema,
  hasAbsoluteDate,
  hasStandaloneNumber,
  limitationSchema,
  publishedText,
  qualifiedMetricSchema,
  sourceSchema,
  statusSchema,
} from './constitution';

/**
 * A production system — the case-study collection (blueprint §4.0–§4.3).
 *
 * This is where the constitution bites hardest, because these are the pages a
 * CTO reads and the pages where exaggeration would be both most tempting and
 * most fatal.
 */
export const systemSchema = z
  .object({
    title: publishedText({ min: 3 }),

    /**
     * Ruling 3: the Electrical platform is PRE-LAUNCH and must never imply
     * otherwise. An enum makes "accidentally reads as live" a build failure
     * rather than a judgement call during a content edit.
     */
    status: statusSchema,

    /** e.g. "Q3 2026" beside a pre-launch badge — optional, but dated when present. */
    statusDetail: dateQualifierSchema.optional(),

    /**
     * The role line (blueprint §4.0 item 1). Required on every system because
     * the portfolio's central claim is operational ownership; a case study
     * that never states what the author actually did is decoration.
     */
    role: publishedText({ min: 10 }),

    /** Rendered as tags. Version numbers here are names, not measurements, so rule 2 does not apply. */
    stack: z.array(publishedText()).min(1, { error: 'A system states the stack it runs on.' }),

    /** The one-line problem shown on a SystemCard. */
    problem: claimText({ min: 12, max: 160 }),

    summary: claimText({ min: 40 }),

    /**
     * RULE 3, THE LOAD-BEARING CONSTRAINT: at least one disclosed limitation.
     *
     * The flagship hospital system has no automated test suite, and that fact
     * is published rather than hidden — it is the evidence that every other
     * claim on this site is unedited. `.min(1)` means a system page disclosing
     * nothing cannot be built at all. If this constraint ever feels
     * inconvenient, that is precisely the moment it is doing its job.
     */
    limitations: z.array(limitationSchema).min(1, {
      error:
        'Every system discloses at least one honest limitation (constitution rule 3). A case study with nothing to disclose is marketing, not engineering.',
    }),

    /** Measurements. Each carries its own date and citation by construction. */
    metrics: z.array(qualifiedMetricSchema).default([]),

    /**
     * The recruiter box (blueprint §4.0 item 9). Fixed at three so the three
     * case studies stay structurally identical — Phase 5 requires zero
     * template drift, and consistency across case studies is itself the signal
     * that they were written to a standard rather than to taste.
     */
    takeaways: z.array(claimText({ min: 8 })).length(3, {
      error: 'Exactly three takeaways — the three case studies must not drift apart.',
    }),

    source: sourceSchema,

    /** Display order on the /systems index. */
    order: z.number().int().nonnegative(),
  })
  .strict();

/**
 * Professional experience (blueprint §4.4).
 *
 * `confidential` exists because the OPS360 engagement is NDA-bound. Modelling
 * that constraint as data rather than prose lets the UI render it as a
 * deliberate professionalism signal, so the NDA stops reading as a gap.
 */
export const experienceSchema = z
  .object({
    role: publishedText({ min: 3 }),
    organisation: publishedText({ min: 2 }),

    /** Absolute start date — blueprint §3.5 bans relative dating. */
    from: dateQualifierSchema,

    /**
     * An absolute end date, or exactly "Present". That literal is permitted
     * because it is honest for an ongoing role, whereas prose like "recently"
     * or "currently" decays into a false claim as the page ages.
     */
    to: z.union([dateQualifierSchema, z.literal('Present')]),

    bullets: z
      .array(claimText({ min: 12 }))
      .min(1, { error: 'An experience entry states what was actually done.' }),

    /**
     * Rule 7: OPS360 content never exceeds CV wording. Flagging the entry
     * makes the constraint visible to the component, which renders the
     * "described at CV level" note.
     */
    confidential: z.boolean().default(false),

    note: publishedText().optional(),
    source: sourceSchema,
    order: z.number().int().nonnegative(),
  })
  .strict();

/**
 * Decision records (blueprint §4.5c).
 *
 * The three-part shape is not stylistic. A decision without its rejected
 * alternative and its accepted cost is a boast; DECISION / WHY / TRADE-OFF
 * forces the part that demonstrates judgement, which is the only part a senior
 * reader is actually assessing.
 */
export const decisionSchema = z
  .object({
    title: publishedText({ min: 6 }),
    decision: claimText({ min: 20 }),
    why: claimText({ min: 20 }),

    /** Required: a decision with no stated cost has not been examined. */
    tradeoff: claimText({ min: 20 }),

    /** Optional AGED row — how the decision looks with hindsight. */
    aged: claimText({ min: 20 }).optional(),

    /** Which system it belongs to, by collection id, when it is system-specific. */
    system: z.string().optional(),

    source: sourceSchema,
    order: z.number().int().nonnegative(),
  })
  .strict();

/**
 * Lessons (blueprint §4.5d) — the most credibility-dense content on the site.
 *
 * `cost` and `ruleChanged` are both required, because a "lesson" admitting no
 * cost and changing no subsequent behaviour is not a lesson; it is a humble
 * brag. Requiring both is what makes this section evidence rather than tone.
 */
export const lessonSchema = z
  .object({
    title: publishedText({ min: 10 }),
    cost: claimText({ min: 20 }),
    ruleChanged: claimText({ min: 20 }),

    /** Where the changed rule was applied — e.g. the Electrical readiness programme. */
    crossLink: z
      .object({ label: publishedText(), href: z.string().startsWith('/') })
      .strict()
      .optional(),

    source: sourceSchema,
    order: z.number().int().nonnegative(),
  })
  .strict();

/**
 * Evidence chips — the Home proof strip (blueprint §2).
 *
 * A chip is a single compressed fact, which is exactly the format where an
 * unqualified number does most damage: there is no surrounding prose to carry
 * the date. Hence the refinement below.
 */
export const evidenceChipSchema = z
  .object({
    /**
     * Deliberately `publishedText`, not `claimText`: a chip renders as a mono
     * fact beside a muted qualifier (blueprint §5), so its date lives in the
     * sibling `qualifier` field rather than inline. Rule 2 is enforced for
     * chips by the object-level refinement below, which sees both fields at
     * once. Using `claimText` here would demand the date twice and make the
     * blueprint's own chip wording unshippable.
     */
    fact: publishedText({ min: 8, max: 120 }),

    /** Shown in muted type beside the fact. */
    qualifier: dateQualifierSchema.optional(),

    source: sourceSchema,
    order: z.number().int().nonnegative(),
  })
  .strict()
  .refine(
    (chip) => !hasStandaloneNumber(chip.fact) || hasAbsoluteDate(chip.fact) || !!chip.qualifier,
    {
      error:
        'This chip states a number without a date. Give it a `qualifier` (e.g. "Electrical, as of Jul 2026") or put the date in the fact itself — constitution rule 2.',
      path: ['qualifier'],
    },
  );

export type SystemEntry = z.infer<typeof systemSchema>;
export type ExperienceEntry = z.infer<typeof experienceSchema>;
export type DecisionEntry = z.infer<typeof decisionSchema>;
export type LessonEntry = z.infer<typeof lessonSchema>;
export type EvidenceChipEntry = z.infer<typeof evidenceChipSchema>;
