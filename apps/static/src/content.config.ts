/**
 * Content collections — loader wiring only.
 *
 * The schemas themselves, and the reasoning behind every constraint, live in
 * `src/schemas/content.ts` and `src/schemas/constitution.ts`. Keeping them out
 * of this file means the same schema objects validate both real collection
 * entries and the `/dev/components` preview fixtures, so the preview can never
 * drift from the rules the published content obeys.
 *
 * API note: Astro 7 loads collections through the content layer — every
 * collection declares a `loader`, this config must live at
 * `src/content.config.ts`, and `z` is Zod 4 re-exported by `astro/zod`. All
 * three facts were read from the installed package's own type definitions
 * rather than recalled from a previous major version; see the Phase 2 entry in
 * docs/PHASE_LOG.md.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import {
  decisionSchema,
  evidenceChipSchema,
  experienceSchema,
  lessonSchema,
  systemSchema,
} from './schemas/content';

/**
 * One loader shape for every collection: Markdown, frontmatter-first.
 *
 * The pattern matches every Markdown file in the directory, so a stray
 * README.md placed in a content directory would be parsed as an entry and fail
 * validation. Each directory's `.gitkeep` says so.
 */
const markdownIn = (directory: string) =>
  glob({ pattern: '**/*.md', base: `./src/content/${directory}` });

export const collections = {
  systems: defineCollection({ loader: markdownIn('systems'), schema: systemSchema }),
  experience: defineCollection({ loader: markdownIn('experience'), schema: experienceSchema }),
  decisions: defineCollection({ loader: markdownIn('decisions'), schema: decisionSchema }),
  lessons: defineCollection({ loader: markdownIn('lessons'), schema: lessonSchema }),
  evidenceChips: defineCollection({
    loader: markdownIn('evidence-chips'),
    schema: evidenceChipSchema,
  }),
};
