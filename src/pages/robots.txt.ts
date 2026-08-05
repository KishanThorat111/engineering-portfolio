/**
 * /robots.txt — generated, not static.
 *
 * WHY THIS MOVED OUT OF public/
 * -----------------------------
 * Every rule below is preserved verbatim from the static file it replaces.
 * The one thing that changed is the `Sitemap:` line, which used to hardcode a
 * hostname. That made the origin true in two places, and the second one would
 * have gone quietly stale the moment Phase 8 swaps the production domain —
 * pointing crawlers at a sitemap on a host that no longer serves the site.
 *
 * Generating it means the origin is stated in exactly one place
 * (astro.config.mjs), which is what makes the launch swap a one-line change.
 */
import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  if (!site) throw new Error('robots.txt: astro.config.mjs has no `site` configured.');

  const body = `# Crawlers of every kind are welcome, including AI agents — the machine layer
# is an audience this site serves deliberately (blueprint §7.6).
#
# AI crawlers are allowed explicitly rather than by omission. A site arguing
# that automated readers are an audience should not leave them guessing, and a
# blanket Allow that happens to include them is not the same as saying so.
#
# The /dev/ rule below must never be removed: that route is an internal
# component gallery, not part of the public site. It is excluded three ways —
# here, by a noindex on the page itself, and by a filter in the sitemap config.
User-agent: *
Allow: /
Disallow: /dev/

# Named explicitly so the intent is unambiguous to anyone reading this file.
User-agent: GPTBot
User-agent: OAI-SearchBot
User-agent: ChatGPT-User
User-agent: ClaudeBot
User-agent: Claude-User
User-agent: anthropic-ai
User-agent: PerplexityBot
User-agent: Google-Extended
User-agent: Applebot-Extended
User-agent: CCBot
Allow: /
Disallow: /dev/

# Structured facts for machine readers live here, and the guide beside it
# explains what this site does and does not claim.
# ${new URL('/api/profile.json', site).href}
# ${new URL('/llms.txt', site).href}

Sitemap: ${new URL('/sitemap-index.xml', site).href}
`;

  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
