/**
 * Tenant-owned records — and the endpoint the P2 break-out will aim at.
 *
 * 403 HERE, 404 IN PRODUCTION, AND WHY BOTH ARE RIGHT
 * -----------------------------------------------------------------
 * The ELES isolation suite asserts that a second org gets a **404**, not a 403,
 * on another org's resource: production must not even confirm that the resource
 * exists. That is the stronger behaviour and it stays the right default for a
 * real system.
 *
 * This demo answers **403**, because dossier §2.5 locks it: the peak is the
 * visitor being *visibly stopped*, and a 404 is indistinguishable from a typo.
 * A demonstration nobody can see is not a demonstration.
 *
 * The two are not in conflict — they are the same trade-off resolved
 * differently for a system whose purpose is to be watched. What would be wrong
 * is letting the visitor infer that the hospital platform also answers 403, so
 * the denial payload says which is which, in the response itself, where the
 * inspector in P2 will read it rather than re-assert it.
 *
 * The enumeration cost of 403 is bounded by ids being uuids: confirming
 * existence is only a leak if the attacker can guess ids, and they cannot.
 */
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { withTenant } from '../db/pool.js';
import {
  countRecords,
  createRecord,
  getRecord,
  getRecordWithoutOrgPredicate,
  listRecords,
} from '../domain/records.js';
import { writeAudit } from '../domain/audit.js';
import { env } from '../config/env.js';
import { ApiError } from '../plugins/errors.js';

const uuid = z.string().uuid();

const createBody = z
  .object({
    title: z.string().trim().min(1).max(120),
    body: z.record(z.string(), z.unknown()).optional(),
  })
  .strict();

export const recordRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/records', async (request) => {
    const identity = await app.requireTenant(request);
    return withTenant(identity.orgId, async (tx) => ({
      records: await listRecords(tx, identity.orgId, 100),
    }));
  });

  app.get('/v1/records/:id', async (request) => {
    const identity = await app.requireTenant(request);
    const params = z.object({ id: uuid }).safeParse(request.params);
    if (!params.success) {
      throw new ApiError(400, 'request.invalid', 'Record id must be a UUID.');
    }
    const recordId = params.data.id;

    /*
     * THE THROW HAPPENS OUTSIDE THE TRANSACTION, AND THAT IS THE WHOLE POINT.
     *
     * The first version of this raised the 403 from inside `withTenant`. That
     * rolls the transaction back — including the audit row written moments
     * earlier — so every denied break-in attempt logged nothing at all. §2.5
     * ends with the visitor reading the audit entry for their own attempt, and
     * there would have been no entry to read.
     *
     * Nothing about the code looked wrong; the test that asserts the denial
     * reaches the attacker's own log is what caught it. Any future denial path
     * that writes audit must commit first and signal afterwards.
     */
    const outcome = await withTenant(identity.orgId, async (tx) => {
      const record = await getRecord(tx, identity.orgId, recordId);
      if (record) return { kind: 'found' as const, record };

      /*
       * Not ours. Before answering, establish WHICH layer refused — that
       * distinction is the content of the P2 inspector and it has to be
       * observed rather than assumed.
       *
       * This second read drops the tenant_id predicate (layer 1) and runs the
       * same query inside the same RLS-scoped transaction. If the row came
       * back, layer 1 would be working alone and layer 2 would not be
       * enforcing. It does not come back, so we can say the database refused it
       * independently — and record that we checked rather than asserting it.
       */
      const withoutScope = await getRecordWithoutOrgPredicate(tx, recordId);
      const rlsHeld = withoutScope === null;

      await writeAudit(tx, {
        orgId: identity.orgId,
        action: 'record.read',
        outcome: 'denied',
        actor: `tenant:${identity.publicRef}`,
        resourceType: 'demo_record',
        resourceId: recordId,
        correlationId: request.correlationId,
        ip: request.ip,
        durationMs: Math.round(performance.now() - request.startedAt),
        detail: {
          reason: 'cross-tenant read refused',
          orgScopeHeld: true,
          rlsHeld,
        },
      });

      return { kind: 'denied' as const, rlsHeld };
    });

    if (outcome.kind === 'found') return { record: outcome.record };

    throw new ApiError(403, 'isolation.denied', 'That record does not belong to your tenant.', {
      rlsHeld: outcome.rlsHeld,
    });
  });

  app.post('/v1/records', async (request, reply) => {
    const identity = await app.requireTenant(request);
    const parsed = createBody.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new ApiError(400, 'request.invalid', 'The record was not valid.');
    }

    // Same rule as the read path: commit the audit row, then signal. A throw
    // from inside the transaction would erase the record of the refusal.
    const outcome = await withTenant(identity.orgId, async (tx) => {
      // Bounded resource creation. Without a ceiling, a public write endpoint
      // is a disk-exhaustion primitive with extra steps.
      const existing = await countRecords(tx, identity.orgId);
      if (existing >= env.TENANT_MAX_RECORDS) {
        await writeAudit(tx, {
          orgId: identity.orgId,
          action: 'record.create',
          outcome: 'denied',
          actor: `tenant:${identity.publicRef}`,
          resourceType: 'demo_record',
          correlationId: request.correlationId,
          ip: request.ip,
          durationMs: Math.round(performance.now() - request.startedAt),
          detail: { reason: 'per-tenant record cap reached', cap: env.TENANT_MAX_RECORDS },
        });
        return { kind: 'capped' as const };
      }

      const record = await createRecord(
        tx,
        identity.orgId,
        parsed.data.title,
        parsed.data.body ?? {},
      );

      await writeAudit(tx, {
        orgId: identity.orgId,
        action: 'record.create',
        outcome: 'allowed',
        actor: `tenant:${identity.publicRef}`,
        resourceType: 'demo_record',
        resourceId: record.id,
        correlationId: request.correlationId,
        ip: request.ip,
        durationMs: Math.round(performance.now() - request.startedAt),
      });

      return { kind: 'created' as const, record };
    });

    if (outcome.kind === 'capped') {
      throw new ApiError(
        409,
        'quota.records_exhausted',
        `This tenant already holds its maximum of ${env.TENANT_MAX_RECORDS} records.`,
      );
    }

    return reply.status(201).send({ record: outcome.record });
  });
};
