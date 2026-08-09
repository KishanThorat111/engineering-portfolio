/**
 * Tenant provisioning and self-inspection.
 *
 * `POST /v1/tenants` is the only unauthenticated write in the service, because
 * it is how a visitor gets an identity in the first place. That makes it the
 * most exposed endpoint here, so it is bounded three ways: a strict per-IP
 * rate limit, a tiny fixed body schema, and a TTL that guarantees whatever it
 * creates deletes itself.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withTenant } from '../db/pool.js';
import { getTenant, provisionTenant } from '../domain/tenant.js';
import { countRecords } from '../domain/records.js';
import { getBudget } from '../domain/budget.js';
import { env } from '../config/env.js';
import { ApiError } from '../plugins/errors.js';

const provisionBody = z
  .object({
    // Cosmetic only — it labels the tenant in the visitor's own view. Bounded
    // and character-restricted because it is echoed back.
    label: z
      .string()
      .trim()
      .min(1)
      .max(48)
      .regex(/^[\w \-.']+$/u, 'label may contain letters, numbers, spaces, - . _ and apostrophes')
      .optional(),
  })
  .strict();

export const tenantRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    '/v1/tenants',
    {
      config: {
        rateLimit: {
          max: env.RATE_LIMIT_PROVISION_PER_HOUR,
          timeWindow: '1 hour',
        },
      },
    },
    async (request, reply) => {
      const parsed = provisionBody.safeParse(request.body ?? {});
      if (!parsed.success) {
        throw new ApiError(400, 'request.invalid', 'The provisioning request was not valid.');
      }

      const result = await provisionTenant({
        label: parsed.data.label ?? 'demo tenant',
        correlationId: request.correlationId,
        ip: request.ip,
      });

      /*
       * The API key is returned exactly once, here, and never again — only its
       * hash is stored, so there is no endpoint that could re-reveal it. Said
       * plainly in the payload rather than left for the visitor to discover.
       */
      return reply.status(201).send({
        tenant: {
          id: result.tenant.id,
          publicRef: result.tenant.public_ref,
          label: result.tenant.label,
          status: result.tenant.status,
          createdAt: result.tenant.created_at,
          expiresAt: result.tenant.expires_at,
          ttlSeconds: env.TENANT_TTL_SECONDS,
        },
        credential: {
          apiKey: result.apiKey,
          note: 'Shown once. Only a SHA-256 of this key is stored; it cannot be retrieved again.',
        },
        seededRecords: result.seededRecords,
        correlationId: result.correlationId,
        // Rule 11: the demo says it is a demo, in the payload, unprompted.
        disclosure: {
          plane: 'demo',
          statement:
            'This is the demo plane. It is physically separate from any production system and ' +
            'has no path to one. This tenant is destroyed on its TTL by a scheduled job.',
        },
      });
    },
  );

  app.get('/v1/tenants/me', async (request) => {
    const identity = await app.requireTenant(request);

    return withTenant(identity.orgId, async (tx) => {
      const tenant = await getTenant(tx, identity.orgId);
      if (!tenant) {
        // Reachable only if the row vanished between auth and this read.
        throw new ApiError(410, 'tenant.purged', 'This tenant no longer exists.');
      }
      const [records, budget] = await Promise.all([
        countRecords(tx, identity.orgId),
        getBudget(tx, identity.orgId),
      ]);

      const expiresIn = Math.max(
        0,
        Math.floor((new Date(tenant.expires_at).getTime() - Date.now()) / 1000),
      );

      return {
        tenant: {
          id: tenant.id,
          publicRef: tenant.public_ref,
          label: tenant.label,
          status: tenant.status,
          createdAt: tenant.created_at,
          expiresAt: tenant.expires_at,
          expiresInSeconds: expiresIn,
        },
        records,
        budget,
        isolation: {
          // Surfaced now because P2's inspector reads it rather than
          // hardcoding the story. Both layers, named, with the honest note.
          layers: [
            {
              name: 'server-derived org scope',
              mechanism: 'application',
              detail:
                'Every tenant-owned query carries tenant_id derived from the verified ' +
                'credential, never from client input. This is the pattern the production ' +
                'platforms run (ADR-0003).',
            },
            {
              name: 'PostgreSQL row-level security',
              mechanism: 'database',
              detail:
                'Policies on every tenant-owned table, FORCE enabled, enforced against a role ' +
                'without BYPASSRLS. The production platforms do not have this layer; the demo ' +
                'adds it.',
            },
          ],
        },
      };
    });
  });
};
