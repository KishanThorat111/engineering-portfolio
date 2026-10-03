/**
 * THE SITE'S ICONS, RENDERED FROM ONE SOURCE.
 *
 * apps/static/public/favicon.svg is the mark: the header's KT tile — a dark
 * square, the brand ramp as its ring, the letters drawn as strokes rather
 * than set in a font (a font in a favicon renders in whatever the device has,
 * which is how the old one came out differently everywhere). Everything else
 * is rendered from it here, so the tab icon, the ICO for older browsers, the
 * iPhone home-screen icon and the install icons cannot drift apart.
 *
 *   favicon.ico            16 + 32 px, for browsers and tools that ask for it
 *   apple-touch-icon.png   180 px, full-bleed (iOS rounds the corners itself)
 *   icon-192.png, icon-512.png   for site.webmanifest
 *
 * Output is deterministic; re-running it on an unchanged SVG changes nothing.
 * usage: npm run assets:icons
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

const PUBLIC = resolve('apps/static/public');
const svg = readFileSync(join(PUBLIC, 'favicon.svg'));
const GROUND = { r: 12, g: 14, b: 24, alpha: 1 };

/** The tile with its own rounded corners and transparent outside them. */
const tile = (size) =>
  sharp(svg, { density: 72 * (size / 64) * 2 })
    .resize(size, size)
    .png();

/*
 * Full-bleed: the same mark on a square of the tile's own ground, for places
 * that round or mask the icon themselves (iOS, Android's adaptive icons).
 * The mark is drawn slightly inset so the platform's mask never cuts the ring.
 */
async function fullBleed(size) {
  const inner = Math.round(size * 0.86);
  const mark = await tile(inner).toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: GROUND } })
    .composite([{ input: mark, gravity: 'centre' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** An ICO is a small directory followed by the images; PNG entries are valid since Vista. */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const dir = Buffer.alloc(16 * images.length);
  let offset = 6 + dir.length;
  images.forEach(({ size, data }, i) => {
    const at = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, at);
    dir.writeUInt8(size >= 256 ? 0 : size, at + 1);
    dir.writeUInt8(0, at + 2);
    dir.writeUInt8(0, at + 3);
    dir.writeUInt16LE(1, at + 4);
    dir.writeUInt16LE(32, at + 6);
    dir.writeUInt32LE(data.length, at + 8);
    dir.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...images.map((im) => im.data)]);
}

const sizes = [16, 32];
const icoImages = [];
for (const size of sizes) icoImages.push({ size, data: await tile(size).toBuffer() });
writeFileSync(join(PUBLIC, 'favicon.ico'), ico(icoImages));
writeFileSync(join(PUBLIC, 'apple-touch-icon.png'), await fullBleed(180));
writeFileSync(join(PUBLIC, 'icon-192.png'), await fullBleed(192));
writeFileSync(join(PUBLIC, 'icon-512.png'), await fullBleed(512));
console.log('make-icons: favicon.ico (16, 32), apple-touch-icon.png, icon-192.png, icon-512.png');
