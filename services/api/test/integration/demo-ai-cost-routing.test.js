/**
 * Demonstration 4 — SQL-first routing and A11's exhaustion state.
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { auth, provisionViaApi, resetRateLimits, startApi, stopApi } from '../helpers/harness.js';
import { withTenant } from '../../dist/db/pool.js';
import { consumeTokens, getBudget } from '../../dist/domain/budget.js';

function ask(app, apiKey, question) {
  return app.inject({
    method: 'POST',
    url: '/v1/demos/ai/ask',
    headers: auth(apiKey),
    payload: { question },
  });
}

describe('demonstration — SQL-first cost routing', () => {
  let app;
  let tenant;

  before(async () => {
    app = await startApi();
    await resetRateLimits();
    tenant = await provisionViaApi(app, 'ai');
  });

  after(async () => {
    await stopApi(app);
  });

  it('answers an operational question on the data plane at zero cost', async () => {
    const response = await ask(app, tenant.apiKey, 'how many records do I have?');
    assert.equal(response.statusCode, 200);
    const json = response.json();

    assert.equal(json.route, 'data-plane');
    assert.equal(json.tokensCharged, 0);
    assert.equal(json.modelPlane.attempted, false);
    assert.equal(json.intent.id, 'record-count');
    // The answer is computed from the tenant's real rows, not templated.
    assert.match(json.answer, /holds 8 record\(s\)/);
  });

  it('the data-plane answer tracks the real data', async () => {
    await app.inject({
      method: 'POST',
      url: '/v1/records',
      headers: auth(tenant.apiKey),
      payload: { title: 'one more' },
    });
    const response = await ask(app, tenant.apiKey, 'count the records');
    assert.match(response.json().answer, /holds 9 record\(s\)/);
  });

  it('names the exact SQL that answered, and the SQL is parameterised', async () => {
    const response = await ask(app, tenant.apiKey, 'how many records?');
    const intent = response.json().intent;
    assert.match(intent.sql, /FROM demo_record WHERE tenant_id = \$1/);
    assert.ok(!/\$\{/.test(intent.sql), 'no interpolation may appear in a router statement');
  });

  it('routes several distinct operational questions without a model', async () => {
    for (const question of [
      'when does this tenant expire?',
      'how many denied attempts are recorded?',
      'how many duplicates were rejected?',
      'how many activations are there?',
      'what is the latest record?',
    ]) {
      const response = await ask(app, tenant.apiKey, question);
      const json = response.json();
      assert.equal(json.route, 'data-plane', `"${question}" should not have escalated`);
      assert.equal(json.tokensCharged, 0);
    }
  });

  it('escalates a question SQL cannot answer, and charges the budget', async () => {
    const before = await app.inject({
      method: 'GET',
      url: '/v1/budget',
      headers: auth(tenant.apiKey),
    });
    const used = before.json().budget.tokensUsed;

    const response = await ask(app, tenant.apiKey, 'write a haiku about hospital logistics');
    const json = response.json();

    assert.equal(json.route, 'model-plane');
    assert.equal(json.intent, null);
    assert.ok(json.tokensCharged > 0, 'escalation must cost tokens');
    assert.equal(json.budget.tokensUsed, used + json.tokensCharged);
  });

  it('says plainly that no model answered rather than inventing one', async () => {
    // No provider is configured in the test environment. The honest outcome is
    // to report the absence — a fabricated reply among real numbers would make
    // every other number here suspect.
    const response = await ask(app, tenant.apiKey, 'compose a limerick about ward rotas');
    const json = response.json();
    assert.equal(json.modelPlane.available, false);
    assert.equal(json.modelPlane.reason, 'no model provider configured');
    assert.match(json.answer, /not configured/i);
    assert.match(json.answer, /reported absent rather than invented/i);
  });

  it('never generates SQL from the question', async () => {
    const response = await ask(app, tenant.apiKey, "'; DROP TABLE tenant; --");
    assert.equal(response.statusCode, 200);
    const json = response.json();
    // An unmatched question escalates. It never becomes a query.
    assert.equal(json.route, 'model-plane');
    assert.equal(json.intent, null);

    const check = await app.inject({
      method: 'GET',
      url: '/v1/records',
      headers: auth(tenant.apiKey),
    });
    assert.equal(check.statusCode, 200, 'the schema must be intact');
  });

  it('exhaustion is a designed STATE, not an error (A11)', async () => {
    const fresh = await provisionViaApi(app, 'ai-exhausted');
    await withTenant(fresh.orgId, async (tx) => {
      const budget = await getBudget(tx, fresh.orgId);
      await consumeTokens(tx, fresh.orgId, budget.tokensLimit + 1);
    });

    const response = await ask(app, fresh.apiKey, 'write something creative about logistics');
    // 200, not 500 and not 402. The system did what it was designed to do.
    assert.equal(response.statusCode, 200);
    const json = response.json();
    assert.equal(json.tokensCharged, 0);
    assert.equal(json.modelPlane.attempted, false);
    assert.match(json.modelPlane.reason, /per-tenant token budget is spent/);
    assert.ok(json.estimatedTokens > 0, 'it must name what it refused to spend');
    assert.match(json.costNote, /designed state, not an error/i);
  });

  it('the data plane still works when the model budget is spent', async () => {
    const fresh = await provisionViaApi(app, 'ai-exhausted-2');
    await withTenant(fresh.orgId, async (tx) => {
      const budget = await getBudget(tx, fresh.orgId);
      await consumeTokens(tx, fresh.orgId, budget.tokensLimit + 1);
    });

    const response = await ask(app, fresh.apiKey, 'how many records do I have?');
    assert.equal(response.json().route, 'data-plane');
    assert.equal(response.json().tokensCharged, 0);
  });

  it("cannot spend another tenant's budget", async () => {
    const other = await provisionViaApi(app, 'ai-other');
    await ask(app, tenant.apiKey, 'invent a story about a corridor');

    const budget = await app.inject({
      method: 'GET',
      url: '/v1/budget',
      headers: auth(other.apiKey),
    });
    assert.equal(budget.json().budget.tokensUsed, 0);
  });

  it('publishes the intent table so the mechanism is inspectable', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/v1/demos/ai/intents',
      headers: auth(tenant.apiKey),
    });
    const json = response.json();
    assert.ok(json.intents.length >= 6);
    assert.match(json.note, /does not generate SQL/i);
  });

  it('audits the route decision', async () => {
    const log = await app.inject({ method: 'GET', url: '/v1/audit', headers: auth(tenant.apiKey) });
    const events = log.json().events.filter((e) => e.action === 'demo.ai.ask');
    assert.ok(events.some((e) => e.detail.route === 'data-plane'));
    assert.ok(events.some((e) => e.detail.route === 'model-plane'));
  });
});
