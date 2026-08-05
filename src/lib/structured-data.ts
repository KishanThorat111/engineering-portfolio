/**
 * JSON-LD builders — blueprint §7.6.
 *
 * Every value here is read from the same modules the pages render, for the
 * same reason as the profile builder: structured data that says something the
 * page does not is worse than no structured data at all, because it is the
 * version a machine believes.
 *
 * In particular, `SoftwareApplication` states operating status honestly. The
 * pre-launch platform is described as pre-launch in its own words, not quietly
 * omitted and not implied to be running.
 */
import type { CollectionEntry } from 'astro:content';
import { STATUS_LABELS } from '../schemas/constitution';
import { SITE } from '../config/site';

const PERSON_ID = '#person';

/** The Person node, site-wide. Referenced by id elsewhere rather than repeated. */
export function personSchema(origin: URL) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': new URL(PERSON_ID, origin).href,
    name: SITE.name,
    jobTitle: SITE.role,
    description: SITE.claim,
    url: new URL('/', origin).href,
    email: `mailto:${SITE.email}`,
    address: { '@type': 'PostalAddress', addressLocality: SITE.location },
    knowsLanguage: [...SITE.languages],
    sameAs: [SITE.linkedin, SITE.github],
  };
}

/** ProfilePage, for /about and /cv. */
export function profilePageSchema(origin: URL, path: string, name: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    '@id': new URL(path, origin).href,
    url: new URL(path, origin).href,
    name,
    description,
    mainEntity: { '@id': new URL(PERSON_ID, origin).href },
  };
}

/**
 * SoftwareApplication per case study.
 *
 * `creativeWorkStatus` carries the real status label — the same string the
 * badge shows — so a machine reading this cannot conclude the pre-launch
 * platform is live. The disclosed limitations travel with it too: a consumer
 * that takes the description without them would have the same incomplete
 * picture the human pages refuse to give.
 */
export function softwareApplicationSchema(origin: URL, entry: CollectionEntry<'systems'>) {
  const system = entry.data;
  const label = STATUS_LABELS[system.status].label;

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    '@id': new URL(`/systems/${entry.id}`, origin).href,
    name: system.title,
    url: new URL(`/systems/${entry.id}`, origin).href,
    applicationCategory: 'BusinessApplication',
    description: system.summary,
    creativeWorkStatus: system.statusDetail ? `${label} (${system.statusDetail})` : label,
    author: { '@id': new URL(PERSON_ID, origin).href },
    /* Not a marketing field: these are the disclosed limitations, verbatim. */
    disambiguatingDescription: system.limitations
      .map((item) => `Known limitation: ${item.limitation}`)
      .join(' '),
  };
}
