/**
 * Builds the machine-readable profile from the same sources the pages read.
 *
 * THE POINT OF THIS FILE
 * ----------------------
 * Constitution rule 10: the machine layer and the human pages generate from
 * one content source and cannot disagree. That is only true if this module
 * *reads* rather than *restates*. Every value below comes from a content
 * collection or a config module that a page also renders — the systems from
 * `systems`, the experience from `experience`, the skills and identity from
 * `src/config/cv.ts` and `src/config/site.ts`, the status labels from the same
 * map the badge component uses.
 *
 * If you find yourself about to type a fact in here, that is the bug. Import
 * it from wherever the page gets it, or move it somewhere both can read.
 *
 * Two things are deliberately absent: the phone number, which lives outside
 * `src/` precisely so nothing can publish it, and any figure the site does not
 * publish for humans. `disclosure.unpublishedFigures` says so in words a
 * machine reader can quote.
 */
import { getCollection } from 'astro:content';
import { STATUS_LABELS } from '../schemas/constitution';
import { profileSchema, type Profile } from '../schemas/profile';
import { SITE } from '../config/site';
import { CV_PROFILE, CV_ROLES, CV_SKILLS } from '../config/cv';

/** Absolute URL against the configured production origin (blueprint §7.4). */
function absolute(path: string, origin: URL): string {
  return new URL(path, origin).href;
}

export async function buildProfile(origin: URL): Promise<Profile> {
  const systems = (await getCollection('systems')).sort((a, b) => a.data.order - b.data.order);
  const experience = (await getCollection('experience')).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const profile = {
    schemaVersion: 1 as const,
    generatedFrom:
      'Generated at build from the same content collections and config modules that render the ' +
      'human pages. Machine and human layers cannot disagree by construction.',

    identity: {
      name: SITE.name,
      role: SITE.role,
      headline: SITE.claim,
      summary: CV_PROFILE,
      location: SITE.location,
      availability: SITE.availability,
      languages: [...SITE.languages],
    },

    links: {
      website: absolute('/', origin),
      cv: absolute('/cv', origin),
      cvPdf: absolute('/cv.pdf', origin),
      linkedin: SITE.linkedin,
      github: SITE.github,
      email: SITE.email,
      repository: SITE.repo,
    },

    /* The CV's taxonomy, split on its own separators rather than re-grouped. */
    skills: CV_SKILLS.map((skill) => ({
      category: skill.label,
      items: skill.value.split(',').map((item) => item.trim()),
    })),

    experience: experience.map((entry) => ({
      role: entry.data.role,
      organisation: entry.data.organisation,
      from: entry.data.from,
      to: entry.data.to,
      confidential: entry.data.confidential,
      highlights: [...entry.data.bullets],
    })),

    systems: systems.map((system) => ({
      name: system.data.title,
      status: system.data.status,
      /* The same label a human sees on the badge — not a second wording of it. */
      statusLabel: STATUS_LABELS[system.data.status].label,
      ...(system.data.statusDetail ? { statusDetail: system.data.statusDetail } : {}),
      role: system.data.role,
      stack: [...system.data.stack],
      url: absolute(`/systems/${system.id}`, origin),
      summary: system.data.summary,
      metrics: system.data.metrics.map((metric) => ({
        value: metric.value,
        caption: metric.caption,
        qualifier: metric.qualifier,
      })),
      limitations: system.data.limitations.map((item) => ({
        limitation: item.limitation,
        addressedBy: item.addressedBy,
      })),
    })),

    demonstration: {
      url: absolute('/live/', origin),
      catalogue: absolute('/v1/demonstrations', origin),
      plane: 'demo' as const,
      summary:
        'A real multi-tenant control plane, deliberately attackable, rendering its own ' +
        'telemetry. It provisions a real tenant, refuses cross-tenant reads with genuine ' +
        'PostgreSQL row-level security beneath server-derived scoping, and exposes five ' +
        'demonstrations that each write an auditable trace.',
      disclosure:
        'This is a demonstration plane, physically separate from any production system, with ' +
        'no path to one. Every tenant it creates is destroyed on a TTL by a scheduled job. It ' +
        'is not one of the three production platforms described above and must not be ' +
        'reported as one.',
      attackable: true as const,
    },

    disclosure: {
      qualifiedFigures:
        'Every figure on this site carries the date it was true. A number without its ' +
        'qualifier is a claim about today, and these are point-in-time audit results.',
      unpublishedFigures:
        'Unpublished figures are unpublished, not zero. There are no user counts, tenant ' +
        'counts, revenue figures, or uptime percentages here because none exist in a form ' +
        'that can be verified — not because they are bad.',
      confidentialWork:
        'One engagement is described only at the level of the published CV, and its client ' +
        'and platform are not named. That boundary is contractual, and it is enforced by a ' +
        'build gate rather than by intention.',
    },
  };

  /*
   * Validated here as well as in CI, so a malformed profile fails the build
   * instead of shipping and being caught afterwards.
   */
  return profileSchema.parse(profile);
}
