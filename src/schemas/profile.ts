/**
 * The schema for /api/profile.json — blueprint §7.6.
 *
 * WHY THIS EXISTS SEPARATELY FROM THE BUILDER
 * -------------------------------------------
 * The builder in `src/lib/profile.ts` assembles the document from the same
 * collections and config modules the pages read. This schema is what proves
 * the result is well-formed, and it is checked twice: once at build, so a
 * malformed profile fails the build rather than shipping, and once in CI by
 * `scripts/profile-check.mjs` against the file that actually landed in dist.
 *
 * `limitations` is required and non-empty on every system, for the same reason
 * it is required on the human page. A machine reader that receives the claims
 * without the disclosures has been told a different story than a human reader,
 * which is precisely the divergence this whole layer exists to prevent.
 */
import { z } from 'astro/zod';
import { STATUSES } from './constitution';

export const profileSchema = z
  .object({
    /** Bumped only on a breaking change to this shape. */
    schemaVersion: z.literal(1),

    /** Where the machine layer's own source of truth lives, for a reader that wants to check. */
    generatedFrom: z.string().min(1),

    identity: z
      .object({
        name: z.string().min(1),
        role: z.string().min(1),
        headline: z.string().min(1),
        summary: z.string().min(1),
        location: z.string().min(1),
        availability: z.string().min(1),
        languages: z.array(z.string().min(1)).min(1),
      })
      .strict(),

    links: z
      .object({
        website: z.url(),
        cv: z.url(),
        cvPdf: z.url(),
        linkedin: z.url(),
        github: z.url(),
        email: z.string().min(1),
        repository: z.url(),
      })
      .strict(),

    /** The CV's own taxonomy, not a re-grouping of it. */
    skills: z
      .array(
        z
          .object({ category: z.string().min(1), items: z.array(z.string().min(1)).min(1) })
          .strict(),
      )
      .min(1),

    experience: z
      .array(
        z
          .object({
            role: z.string().min(1),
            organisation: z.string().min(1),
            from: z.string().min(1),
            to: z.string().min(1),
            /** True where the engagement is described only at CV level. */
            confidential: z.boolean(),
            highlights: z.array(z.string().min(1)).min(1),
          })
          .strict(),
      )
      .min(1),

    systems: z
      .array(
        z
          .object({
            name: z.string().min(1),
            status: z.enum(STATUSES),
            statusLabel: z.string().min(1),
            statusDetail: z.string().optional(),
            role: z.string().min(1),
            stack: z.array(z.string().min(1)).min(1),
            url: z.url(),
            summary: z.string().min(1),
            metrics: z
              .array(
                z
                  .object({
                    value: z.string().min(1),
                    caption: z.string().min(1),
                    qualifier: z.string().min(1),
                  })
                  .strict(),
              )
              .default([]),
            /** Never optional. See the note at the top of this file. */
            limitations: z
              .array(
                z
                  .object({ limitation: z.string().min(1), addressedBy: z.string().min(1) })
                  .strict(),
              )
              .min(1),
          })
          .strict(),
      )
      .min(1),

    /** The site's own honesty rules, stated for a reader that is not a person. */
    disclosure: z
      .object({
        qualifiedFigures: z.string().min(1),
        unpublishedFigures: z.string().min(1),
        confidentialWork: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type Profile = z.infer<typeof profileSchema>;
