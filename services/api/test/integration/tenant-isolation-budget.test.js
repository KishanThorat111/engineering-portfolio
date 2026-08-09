/**
 * Tenant isolation — tenant_budget.
 *
 * A11's model. P2 spends this budget; P1 only has to guarantee that one tenant
 * cannot read, drain, or top up another's — because "spend someone else's
 * budget" would be the cheapest possible attack on a system that pays per token.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auth, provisionViaApi, resetRateLimits, startApi, stopApi } from '../helpers/harness.js';
import { withTenant } from '../../dist/db/pool.js';
import { consumeTokens, getBudget } from '../../dist/domain/budget.js';

describe('tenant isolation — tenant_budget', () => {
  let app;
  let alice;
  let bob;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    alice = await provisionViaApi(app, 'budget-alice');
    bob = await provisionViaApi(app, 'budget-bob');
  });

  after(async () => {
    await stopApi(app);
  });

  it('a tenant reads only its own budget', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/budget',
      headers: auth(alice.apiKey),
    });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().budget.tokensUsed, 0);

    const rows = await withTenant(alice.orgId, async (tx) => {
      const result = await tx.query('SELECT tenant_id FROM tenant_budget');
      return result.rows;
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0].tenant_id, alice.orgId);
  });

  it("a tenant cannot drain another tenant's budget", async () => {
    const result = await withTenant(alice.orgId, (tx) => consumeTokens(tx, bob.orgId, 999_999));
    assert.equal(result, null, 'the update must match no row under RLS');

    const bobBudget = await app.inject({
      method: 'GET',
      url: '/v1/budget',
      headers: auth(bob.apiKey),
    });
    assert.equal(bobBudget.json().budget.tokensUsed, 0);
    assert.equal(bobBudget.json().budget.exhausted, false);
  });

  it('exhaustion is a state, not an error (A11)', async () => {
    const view = await withTenant(alice.orgId, async (tx) => {
      const budget = await getBudget(tx, alice.orgId);
      return consumeTokens(tx, alice.orgId, budget.tokensLimit + 1_000);
    });

    // The call succeeds and reports exhaustion. It does not throw. That is the
    // whole of A11 at the data layer: P2 can render "the budget is spent" as a
    // designed outcome because the model represents it as one.
    assert.equal(view.exhausted, true);
    assert.ok(view.exhaustedAt !== null, 'exhaustion must be timestamped');
    assert.equal(view.tokensRemaining, 0);
    assert.equal(
      view.tokensUsed,
      view.tokensLimit,
      'usage is clamped to the limit rather than overshooting',
    );
  });

  it("one tenant's exhaustion does not affect another's", async () => {
    const bobBudget = await app.inject({
      method: 'GET',
      url: '/v1/budget',
      headers: auth(bob.apiKey),
    });
    assert.equal(bobBudget.json().budget.exhausted, false);
  });
});
