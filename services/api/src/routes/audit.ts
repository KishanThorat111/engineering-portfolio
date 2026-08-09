/**
 * The tenant's own audit log, and its budget.
 *
 * A tenant reads its own audit history and nothing else — enforced twice, like
 * everything else here. This is the endpoint A14's signed permalink will render
 * from in P2, which is why it keeps working after the purge: the rows survive,
 * the data does not.
 */
import type { FastifyPluginAsync } from 'fastify';
import { withTenant } from '../db/pool.js';
import { listAudit } from '../domain/audit.js';
import { getBudget } from '../domain/budget.js';
import { ApiError } from '../plugins/errors.js';

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get('/v1/audit', async (request) => {
    const identity = await app.requireTenant(request);
    return withTenant(identity.orgId, async (tx) => ({
      events: await listAudit(tx, identity.orgId, 200),
      note:
        'Audit history survives the TTL purge on purpose: the tenant data is destroyed, the ' +
        'record of what happened to it is kept.',
    }));
  });

  app.get('/v1/budget', async (request) => {
    const identity = await app.requireTenant(request);
    return withTenant(identity.orgId, async (tx) => {
      const budget = await getBudget(tx, identity.orgId);
      if (!budget) throw new ApiError(404, 'budget.missing', 'No budget for this tenant.');
      return {
        budget,
        note:
          'Exhaustion is a state, not an error. The cost-routing demonstration that spends this ' +
          'budget arrives in P2.',
      };
    });
  });
};
