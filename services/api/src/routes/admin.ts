/**
 * Administrative trigger for the purge sweep.
 *
 * THIS IS NOT WHAT PROVES THE LIFECYCLE. The scheduled worker is
 * (src/worker/index.ts), and the requirement is explicit that a manually-called
 * endpoint must not be the proof. This exists for operating the thing: forcing
 * a sweep while debugging, or draining before a deploy, without waiting out an
 * interval.
 *
 * It runs the identical code path the scheduler runs — `runPurgeSweep` — so it
 * cannot drift into being a second, more permissive implementation of purge.
 * It is guarded by a token that production refuses to boot without, and it is
 * mounted on /internal, which Caddy does not expose through the tunnel.
 */
import type { FastifyPluginAsync } from 'fastify';
import { timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { runPurgeSweep } from '../worker/purge.js';
import { ApiError } from '../plugins/errors.js';

function tokenMatches(presented: string, expected: string): boolean {
  const a = Buffer.from(presented);
  const b = Buffer.from(expected);
  // Length is compared first because timingSafeEqual throws on a mismatch, and
  // the comparison itself must not leak length through timing.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.post('/internal/purge/run', async (request) => {
    const expected = env.ADMIN_TOKEN;
    if (!expected) {
      throw new ApiError(404, 'route.not_found', 'No such endpoint.');
    }
    const presented = request.headers['x-admin-token'];
    if (typeof presented !== 'string' || !tokenMatches(presented, expected)) {
      // Same body as an unknown route: an admin endpoint should not confirm it
      // exists to someone who cannot use it.
      throw new ApiError(404, 'route.not_found', 'No such endpoint.');
    }

    const result = await runPurgeSweep({ correlationId: request.correlationId, trigger: 'admin' });
    return {
      ...result,
      note: 'Administrative trigger. The scheduled worker runs this same sweep on its own timer.',
    };
  });
};
