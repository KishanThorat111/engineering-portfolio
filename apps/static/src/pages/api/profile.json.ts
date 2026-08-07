/**
 * /api/profile.json — the structured profile, blueprint §7.6.
 *
 * A static endpoint: the site builds to static output, so this runs at build
 * time and the result is a plain file on disk. No server, no runtime.
 */
import type { APIRoute } from 'astro';
import { buildProfile } from '../../lib/profile';

export const GET: APIRoute = async ({ site }) => {
  if (!site) {
    throw new Error(
      'profile.json: astro.config.mjs has no `site` configured, so absolute URLs cannot be ' +
        'emitted. The machine layer must state real URLs, not paths.',
    );
  }

  const profile = await buildProfile(site);

  return new Response(`${JSON.stringify(profile, null, 2)}\n`, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
};
