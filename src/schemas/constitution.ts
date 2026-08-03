/**
 * The Truth Constitution, expressed as Zod schema primitives.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * This portfolio's differentiator is enforced honesty. A promise to be honest
 * is worth nothing to a skeptical reader; a build that *cannot compile* a
 * dishonest claim is worth something. Every constraint below encodes one rule
 * from the constitution in `CLAUDE.md`, and each carries the reason it exists,
 * because a reader of this repository is part of the audience — these comments
 * are published evidence, not developer notes.
 *
 * The gate ordering matters. These schemas fail at content-authoring time with
 * a message naming the field and the rule. `scripts/copy-check.mjs` is the
 * backstop that greps BUILT HTML, catching anything that reaches a page by a
 * route the schemas do not cover (hardcoded markup, component copy). Both read
 * the SAME banned-word list — `content/banned.json` — so the two layers can
 * never drift apart into disagreeing definitions of the same rule.
 */
import { z } from 'astro/zod';
import bannedList from '../../content/banned.json';

/* ------------------------------------------------------------------ *
 * Status vocabulary — blueprint §4.0 item 1 and §5
 * ------------------------------------------------------------------ */

/**
 * The complete set of statuses a system may hold. An enum rather than a free
 * string because Ruling 3 turns on statuses being exact: the Electrical
 * platform is PRE-LAUNCH and must never render as LIVE, and the hospital
 * platform's status is the single most consequential claim on the site. A typo
 * in a free-text status field would be invisible; here it fails the build.
 */
export const STATUSES = ['IN_PRODUCTION_HOSPITAL', 'LIVE', 'PRE_LAUNCH', 'CONFIDENTIAL'] as const;

export type Status = (typeof STATUSES)[number];

/**
 * Display labels and glyphs, fixed by blueprint §5. Held here rather than in
 * the badge component so that the human page and the Phase 7 machine layer
 * read one definition — constitution rule 10, which requires that the two
 * layers cannot disagree.
 */
export const STATUS_LABELS: Record<Status, { glyph: string; label: string; tone: string }> = {
  IN_PRODUCTION_HOSPITAL: { glyph: '●', label: 'IN PRODUCTION — HOSPITAL', tone: 'accent' },
  LIVE: { glyph: '●', label: 'LIVE', tone: 'accent' },
  PRE_LAUNCH: { glyph: '◐', label: 'PRE-LAUNCH', tone: 'warm' },
  CONFIDENTIAL: { glyph: '▪', label: 'CONFIDENTIAL', tone: 'muted' },
};

export const statusSchema = z.enum(STATUSES);

/* ------------------------------------------------------------------ *
 * Rule 1 — every published claim traces to the CV or a knowledge base
 * ------------------------------------------------------------------ */

/**
 * The only documents a claim may cite. An enum, not a string, because "traces
 * to a source" is only meaningful if the source is one that actually exists in
 * `/docs`. A free-text citation field would accept "internal notes" or a
 * remembered fact, which is precisely the failure this rule exists to prevent.
 */
export const SOURCE_DOCUMENTS = ['CV', 'KB:WTMS', 'KB:MENU', 'KB:ELES', 'BLUEPRINT'] as const;

/**
 * A citation. `ref` is required and non-empty so that "traces to the CV" means
 * a section a reviewer can open and check, not a gesture at a whole document.
 */
export const sourceSchema = z
  .object({
    document: z.enum(SOURCE_DOCUMENTS),
    ref: z.string().min(1, {
      error: 'Cite the exact section, e.g. "§15 item 1" — a bare document is not a citation.',
    }),
  })
  .strict();

/* ------------------------------------------------------------------ *
 * Rule 5 — banned words never ship
 * ------------------------------------------------------------------ */

/**
 * Flattened from `content/banned.json`, the same file the built-HTML copy gate
 * reads. Sharing the list is the point: two enforcement layers, one definition.
 */
const BANNED_TERMS: ReadonlyArray<{ category: string; term: string }> = Object.entries(bannedList)
  .filter(([category]) => !category.startsWith('$'))
  .flatMap(([category, terms]) => (terms as string[]).map((term) => ({ category, term })));

/** Spaces match any whitespace run so line wrapping cannot smuggle a term past. */
function termToRegex(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
  return new RegExp(`\\b${escaped}\\b`, 'i');
}

const BANNED_MATCHERS = BANNED_TERMS.map(({ category, term }) => ({
  category,
  term,
  pattern: termToRegex(term),
}));

function findBannedTerm(text: string): { category: string; term: string } | undefined {
  return BANNED_MATCHERS.find(({ pattern }) => pattern.test(text));
}

/* ------------------------------------------------------------------ *
 * Rule 2 — every number carries its date qualifier
 * ------------------------------------------------------------------ */

/**
 * A number that stands on its own, rather than one embedded in a technical
 * token. `AES-256-GCM` and `14-day` are names and product properties, not
 * measurements, so the surrounding hyphens exclude them; `21 tenant-isolation
 * test files` and `4 ADRs` are measurements and are caught. Getting this
 * boundary right is what keeps the rule enforceable instead of merely annoying
 * — a rule that fires on every version string gets switched off.
 */
const STANDALONE_NUMBER = /(?<![\w-])\d+(?:[.,]\d+)?(?![\w-])/;

/**
 * An absolute point in time: `Jul 2026` or `Q3 2026`. Blueprint §3.5 requires
 * absolute dates; a figure without one silently becomes a claim about today,
 * and this site's figures are point-in-time audit results that will age.
 */
const ABSOLUTE_DATE =
  /\b((Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|Q[1-4]\s+\d{4})\b/;

/**
 * Words that describe time relative to the reader's "now". They are banned in
 * qualifiers because a page is read long after it is written: "currently 256
 * tests" is false the moment the number changes, while "256 tests (Jul 2026)"
 * stays true forever. This is the difference between a claim that decays into
 * a lie and one that ages into a record.
 */
const RELATIVE_TIME =
  /\b(recently|lately|soon|currently|nowadays|these\s+days|right\s+now|at\s+present|at\s+the\s+moment|to\s+date)\b/i;

export function hasStandaloneNumber(text: string): boolean {
  return STANDALONE_NUMBER.test(text);
}

export function hasAbsoluteDate(text: string): boolean {
  return ABSOLUTE_DATE.test(text);
}

/* ------------------------------------------------------------------ *
 * Composed primitives
 * ------------------------------------------------------------------ */

/**
 * Any text that will be published. Enforces rule 5 (banned words) and rule 9
 * (no placeholder content) at the point of authoring, where the error can name
 * the offending field, rather than at the HTML-grep stage where it can only
 * name a line number in a built file.
 */
export function publishedText(options: { min?: number; max?: number } = {}) {
  const { min = 1, max } = options;
  let schema = z.string().min(min, {
    error: `Must be at least ${min} character(s) — empty content never ships (rule 9).`,
  });
  if (max !== undefined) {
    schema = schema.max(max, { error: `Must be at most ${max} characters.` });
  }
  return schema.superRefine((text, ctx) => {
    const hit = findBannedTerm(text);
    if (hit) {
      ctx.addIssue({
        code: 'custom',
        message: `Banned ${hit.category} word "${hit.term}" — see content/banned.json and blueprint Ruling 1 / §3.4.`,
      });
    }
  });
}

/**
 * Text making a factual claim. Adds rule 2: if it contains a measurement, the
 * date must travel with it in the same string. The alternative — a qualifier
 * stored somewhere else — is how a number and its date get separated during a
 * later edit, which is exactly how an honest figure becomes a stale claim.
 */
export function claimText(options: { min?: number; max?: number } = {}) {
  return publishedText(options).refine(
    (text) => !hasStandaloneNumber(text) || hasAbsoluteDate(text),
    {
      error:
        'This text contains a number but no absolute date (e.g. "Jul 2026" or "Q3 2026"). Rule 2: every number carries its date qualifier.',
    },
  );
}

/**
 * A date qualifier standing alone in its own field, e.g. `as of Jul 2026`.
 * Required to contain a real date and forbidden from leaning on relative time.
 */
export const dateQualifierSchema = publishedText()
  .refine(hasAbsoluteDate, {
    error:
      'A qualifier must contain an absolute date, e.g. "Jul 2026" or "Q3 2026" (blueprint §3.5).',
  })
  .refine((text) => !RELATIVE_TIME.test(text), {
    error:
      'A qualifier must not use relative time ("recently", "currently", …). Those decay into false claims (blueprint §3.5).',
  });

/**
 * A measurement, inseparable from its date and its citation.
 *
 * This is the shape that makes rule 2 structural rather than aspirational: a
 * bare number is not a representable value here. `value: "256 tests"` alone
 * does not typecheck, because `qualifier` and `source` are required siblings.
 * `.strict()` rejects unknown keys so that a misspelled `qualifer` fails loudly
 * instead of silently dropping the date.
 */
export const qualifiedMetricSchema = z
  .object({
    /** The measurement as it renders, e.g. "256 CI-gated tests". */
    value: publishedText(),
    /** When it was true, e.g. "Electrical, as of Jul 2026". */
    qualifier: dateQualifierSchema,
    /** Where a reviewer can verify it. */
    source: sourceSchema,
  })
  .strict();

/**
 * A disclosed limitation — rule 3, the constitution's most load-bearing rule.
 *
 * `addressedBy` is required because blueprint §4.0 item 8 asks for "addressed
 * by / planned" on every limitation. A limitation with no stated response
 * reads as an unowned defect; with one, it reads as engineering judgement. The
 * required `source` stops a limitation from being softened in the retelling:
 * it has to match what the knowledge base actually records.
 */
export const limitationSchema = z
  .object({
    limitation: claimText({ min: 12 }),
    addressedBy: publishedText({ min: 8 }),
    source: sourceSchema,
  })
  .strict();

export type QualifiedMetric = z.infer<typeof qualifiedMetricSchema>;
export type Limitation = z.infer<typeof limitationSchema>;
export type SourceRef = z.infer<typeof sourceSchema>;
