/**
 * Open Graph card images, generated at build — blueprint §7.6 and T17.
 *
 * HOW, AND WHY THIS WAY
 * ---------------------
 * Satori lays the card out and converts every glyph to a vector path using the
 * font bytes it is handed; sharp then rasterises pure geometry. That matters:
 * an SVG containing <text> would depend on whatever fonts happen to exist on
 * the machine doing the rasterising, so the card would look different on a
 * laptop and in CI. With glyphs already outlined there is no font lookup left
 * to go wrong, and the output is byte-identical run to run — verified.
 *
 * The site's own font is a variable woff2, which satori's parser rejects (it
 * fails on the variable-axis table, and woff2 outright). So the cards use the
 * static Inter faces from @fontsource/inter, which are the same typeface.
 *
 * Deviation worth knowing: the chips render in Inter rather than the mono face
 * the design system uses for status badges. At the size these are seen — a
 * thumbnail in a chat client — the distinction is invisible, and it saves
 * carrying another font package purely to render eight words.
 */
import type { APIRoute } from 'astro';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { allOgCards, type OgCard } from '../../lib/og-cards';
import { SITE } from '../../config/site';

const require = createRequire(import.meta.url);
const fontDir = join(dirname(require.resolve('@fontsource/inter/package.json')), 'files');
const regular = readFileSync(join(fontDir, 'inter-latin-400-normal.woff'));
const semibold = readFileSync(join(fontDir, 'inter-latin-600-normal.woff'));

/* Token palette — blueprint §5. The card is the site, at 1200×630. */
const BG = '#0B0E14';
const RAISED = '#12161F';
const BORDER = '#232936';
const TEXT = '#E8EAF0';
const MUTED = '#9AA3B2';
const ACCENT = '#4ADE80';

function card(entry: OgCard) {
  return {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        background: BG,
        border: `1px solid ${BORDER}`,
        padding: '64px 72px',
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: 14 },
            children: [
              {
                type: 'div',
                props: {
                  style: {
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: ACCENT,
                    display: 'flex',
                  },
                },
              },
              {
                type: 'div',
                props: {
                  style: { color: MUTED, fontSize: 24, letterSpacing: 2 },
                  children: SITE.name.toUpperCase(),
                },
              },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              color: TEXT,
              fontSize: entry.title.length > 46 ? 60 : 72,
              fontWeight: 600,
              lineHeight: 1.15,
              maxWidth: 980,
            },
            children: entry.title,
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexWrap: 'wrap', gap: 12 },
            children: entry.chips.slice(0, 4).map((chip) => ({
              type: 'div',
              props: {
                style: {
                  display: 'flex',
                  background: RAISED,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 999,
                  padding: '10px 22px',
                  color: MUTED,
                  fontSize: 24,
                },
                children: chip,
              },
            })),
          },
        },
      ],
    },
  };
}

export async function getStaticPaths() {
  const cards = await allOgCards();
  return cards.map((entry) => ({ params: { slug: entry.slug }, props: { entry } }));
}

export const GET: APIRoute = async ({ props }) => {
  const entry = props.entry as OgCard;

  const svg = await satori(card(entry) as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Inter', data: regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: semibold, weight: 600, style: 'normal' },
    ],
  });

  const png = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
