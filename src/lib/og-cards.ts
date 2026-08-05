/**
 * The registry of Open Graph cards — blueprint §7.6, "title + status chips on
 * token background".
 *
 * One module defines both what each card says and which slug it lives at, and
 * both the layout's `og:image` tag and the image endpoint read it. Deriving the
 * slug from the page's own path means a page cannot end up pointing at a card
 * that was never generated, and the endpoint cannot generate one nothing links
 * to.
 */
import { getCollection } from 'astro:content';
import { STATUS_LABELS } from '../schemas/constitution';
import { SITE, STATUS_CHIPS } from '../config/site';

export interface OgCard {
  slug: string;
  title: string;
  chips: string[];
}

/**
 * A page path becomes a card slug: `/` is `home`, `/systems/menu-platform` is
 * `systems-menu-platform`. Shared by the layout and the endpoint so the two
 * cannot disagree about where a card lives.
 */
export function ogSlugFor(pathname: string): string {
  const trimmed = pathname.replace(/^\/+|\/+$/g, '');
  return trimmed === '' ? 'home' : trimmed.replace(/\//g, '-');
}

/** Fixed pages. Case-study cards are derived from the collection below. */
const STATIC_CARDS: OgCard[] = [
  { slug: 'home', title: SITE.claim, chips: [...STATUS_CHIPS] },
  {
    slug: 'systems',
    title: 'Three platforms, built and operated end to end',
    chips: ['3 platforms', '1 in hospital production', '1 live with billing'],
  },
  {
    slug: 'experience',
    title: 'Where the work has been, and what it was',
    chips: ['Enterprise AI automation', 'Independent product engineering'],
  },
  {
    slug: 'engineering',
    title: 'Judgement is the part worth reading',
    chips: ['Decision records', 'Disclosed limitations', 'Two things I got wrong'],
  },
  {
    slug: 'about',
    title: 'I came to software from somewhere else',
    chips: ['Electrical engineering', 'Operations', 'Teaching'],
  },
  { slug: 'cv', title: `${SITE.name} — curriculum vitae`, chips: [SITE.availability] },
  { slug: '404', title: 'This page does not exist', chips: ['Back to the start'] },
];

export async function allOgCards(): Promise<OgCard[]> {
  const systems = (await getCollection('systems')).sort((a, b) => a.data.order - b.data.order);

  const systemCards: OgCard[] = systems.map((system) => {
    const label = STATUS_LABELS[system.data.status].label;
    return {
      slug: ogSlugFor(`/systems/${system.id}`),
      title: system.data.title,
      /* The status a machine and a human both see, from one definition. */
      chips: [
        system.data.statusDetail ? `${label} (${system.data.statusDetail})` : label,
        ...system.data.stack.slice(0, 2),
      ],
    };
  });

  return [...STATIC_CARDS, ...systemCards];
}
