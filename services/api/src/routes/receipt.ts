/**
 * The take-away — A14 and §2.10.
 *
 * A signed permalink is the PRIMARY way a visitor leaves with their session.
 * Email is opt-in behind an explicit confirmation and is never the default;
 * the delivery half arrives with the interface in P5, and what exists here is
 * the thing that makes a link worth having — a URL that renders the whole
 * session to anyone holding it, including a colleague who never visits.
 *
 * The receipt keeps working after the tenant is purged. That is not an
 * oversight: §2.8 has the visitor watching their tenant expire, and the moment
 * they most want the record is the moment after it is gone. The data is
 * destroyed; the evidence is not.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withTenant } from '../db/pool.js';
import { listAudit } from '../domain/audit.js';
import { getTenant } from '../domain/tenant.js';
import { readTableSecurity } from '../domain/isolation.js';
import { issueReceiptToken, verifyReceiptToken } from '../domain/receipt.js';
import { ApiError } from '../plugins/errors.js';

/** §2.10: "A working curl command that reproduces the isolation failure." */
function reproductionCurl(baseUrl: string, publicRef: string): Record<string, string> {
  return {
    provisionYourOwn: `curl -sX POST ${baseUrl}/v1/tenants -H 'content-type: application/json' -d '{"label":"mine"}'`,
    listYourRecords: `curl -s ${baseUrl}/v1/records -H "authorization: Bearer $KEY"`,
    attemptTheBreakOut: `curl -si ${baseUrl}/v1/records/$OTHER_TENANTS_RECORD_ID -H "authorization: Bearer $KEY"`,
    openTheMembrane: `curl -s ${baseUrl}/v1/demos/isolation/inspect/$OTHER_TENANTS_RECORD_ID -H "authorization: Bearer $KEY"`,
    note:
      `Tenant ${publicRef} was yours. The break-out returns 403 with isolation.denied, and ` +
      `the inspect call returns the live policy predicate and the real query plan that ` +
      `produced it. Both are reproducible by anyone; neither needs this receipt.`,
  };
}

export const receiptRoutes: FastifyPluginAsync = async (app) => {
  /** Issue a permalink for the authenticated tenant. */
  app.post('/v1/receipt', async (request) => {
    const identity = await app.requireTenant(request);
    const token = issueReceiptToken(identity.orgId);
    if (!token) {
      throw new ApiError(
        503,
        'receipt.unavailable',
        'Receipt signing is not configured on this deployment.',
      );
    }
    const base = `${request.protocol}://${request.host}`;
    return {
      receiptUrl: `${base}/r/${token}`,
      note:
        'This link is the take-away. It keeps working after your tenant reaches its TTL and ' +
        'is purged — the data is destroyed, the record of what happened to it is not.',
      emailDelivery: {
        available: false,
        note:
          'Email is opt-in behind an explicit confirmation and is never the default path. ' +
          'The link is the primary carrier because it is verifiable by someone who never ' +
          'visits the site.',
      },
    };
  });

  /**
   * Render a receipt. No credential — the signed token IS the capability, and
   * it grants read access to one tenant's audit history and nothing else.
   */
  app.get('/r/:token', async (request) => {
    const params = z.object({ token: z.string().min(16).max(512) }).safeParse(request.params);
    if (!params.success) throw new ApiError(404, 'receipt.not_found', 'No such receipt.');

    const claims = verifyReceiptToken(params.data.token);
    if (!claims) {
      // Forged, malformed, and expired are one answer. The difference is only
      // useful to someone probing.
      throw new ApiError(404, 'receipt.not_found', 'No such receipt.');
    }

    const base = `${request.protocol}://${request.host}`;

    return withTenant(claims.orgId, async (tx) => {
      const tenant = await getTenant(tx, claims.orgId);
      if (!tenant) throw new ApiError(404, 'receipt.not_found', 'No such receipt.');

      const events = await listAudit(tx, claims.orgId, 200);
      const policy = await readTableSecurity(tx, 'demo_record');

      return {
        tenant: {
          publicRef: tenant.public_ref,
          status: tenant.status,
          createdAt: tenant.created_at,
          expiresAt: tenant.expires_at,
          purgedAt: tenant.purged_at,
        },
        session: {
          events,
          deniedCount: events.filter((e) => e.outcome === 'denied').length,
        },
        // §2.10: "the actual predicate that blocked them", carried in the
        // take-away rather than only visible while the tenant lived.
        predicateThatBlockedYou: {
          table: policy.table,
          rlsEnabled: policy.rlsEnabled,
          rlsForced: policy.rlsForced,
          policies: policy.policies,
          orgScope:
            'SELECT ... FROM demo_record WHERE tenant_id = $1 AND id = $2, where $1 is derived ' +
            'from the verified credential and never from client input.',
        },
        reproduce: reproductionCurl(base, tenant.public_ref),
        disclosure: {
          plane: 'demo',
          statement:
            'This is the demo plane, physically separate from any production system. The ' +
            'PostgreSQL row-level security shown here is stronger than the production ' +
            'KodSpot platforms, which run the org-scope layer with an isolation regression ' +
            'suite and no RLS.',
          retention:
            tenant.purged_at === null
              ? 'This tenant is still live and will be destroyed on its TTL by a scheduled job.'
              : `This tenant was purged at ${tenant.purged_at} by the scheduled job. Its data ` +
                'is gone; this record is what remains, on purpose.',
        },
      };
    });
  });
};
