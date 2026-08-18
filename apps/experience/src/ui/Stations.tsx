/**
 * The four stations and the break-out (§2.5, §2.6).
 *
 * INVITE, NEVER INSTRUCT (§3.9). Each station states what is there and offers
 * one action. There are no tooltips, no onboarding, and no "click here" — a
 * visitor who chooses to attack owns the memory of being stopped.
 *
 * EVERY RESULT PANEL BELOW IS THE CONTROL PLANE'S OWN RESPONSE. Nothing is
 * summarised into a friendlier shape that could drift from what the server
 * said, and nothing is rendered before the call returns. When a call fails the
 * failure is shown verbatim — an error is a real outcome and pretending
 * otherwise would make every other panel suspect.
 */
import { useCallback, useState } from 'react';
import { COPY } from '../content/copy.ts';
import { useWorld } from '../state/store.ts';
import * as api from '../live/api.ts';
import { STATIONS, navigate, type Station } from '../router.ts';

/** A tiny deterministic image. Same bytes every time, so the hash collides. */
const EVIDENCE_BYTES = 'a2lzaGFuLXRob3JhdC1kZW1vLWV2aWRlbmNlLXBob3Rv';

function Result({ children, tone }: { children: React.ReactNode; tone?: 'boundary' }) {
  /*
   * `tone="boundary"` exists for one case and should stay that way. A refusal
   * was rendering cyan text on a green rail — green means live and working, so
   * the payoff of the whole surface was signalling two different things at
   * once. The isolation colour is locked to mean the boundary and nothing else,
   * so the refusal carries it on the rail as well as in the words.
   */
  return (
    <div
      className={`station-result${tone === 'boundary' ? ' station-result-boundary' : ''}`}
      role="status"
    >
      {children}
    </div>
  );
}

function Failure({ error }: { error: string }) {
  return (
    <div className="station-result station-result-error" role="status">
      <p>{error}</p>
    </div>
  );
}

function useAction<T>(run: () => Promise<T>) {
  const [state, setState] = useState<{ busy: boolean; value: T | null; error: string | null }>({
    busy: false,
    value: null,
    error: null,
  });
  const invoke = useCallback(async () => {
    setState((s) => ({ ...s, busy: true, error: null }));
    try {
      const value = await run();
      setState({ busy: false, value, error: null });
      return value;
    } catch (error) {
      // Shown to the visitor as-is. The control plane's error messages are
      // written for a person to read and are safe by construction (P1).
      setState({ busy: false, value: null, error: (error as Error).message });
      return null;
    }
  }, [run]);
  return { ...state, invoke };
}

/* ------------------------------------------------------------------ */

function IsolationStation({ apiKey }: { apiKey: string }) {
  const runBreakOut = useWorld((s) => s.runBreakOut);
  const [target, setTarget] = useState<string | null>(null);
  const [denial, setDenial] = useState<string | null>(null);
  const inspect = useAction(() =>
    target ? api.inspectIsolation(apiKey, target) : Promise.reject(new Error('No target yet.')),
  );

  /*
   * The target is ANOTHER REAL TENANT'S RECORD.
   *
   * It is obtained by provisioning a second tenant and reading its record id —
   * so the thing being attacked genuinely belongs to somebody else and the
   * refusal is a real cross-tenant refusal. Handing over a fabricated uuid
   * would produce a 403 that proved nothing.
   */
  const prepare = useAction(async () => {
    const other = await api.provision('the other tenant');
    const records = await api.listRecords(other.credential.apiKey);
    const id = records.records[0]?.id;
    if (!id) throw new Error('The other tenant had no records to attack.');
    setTarget(id);
    return id;
  });

  const attempt = useAction(async () => {
    const id = target ?? (await prepare.invoke());
    if (!id) throw new Error('No target.');
    try {
      await api.readRecord(apiKey, id);
      // Reaching here would mean isolation failed. Say so loudly rather than
      // rendering a success panel for a broken boundary.
      setDenial(null);
      throw new Error('The read SUCCEEDED. That is an isolation failure and should be reported.');
    } catch (error) {
      if (error instanceof api.ApiError && error.status === 403) {
        setDenial(error.message);
        // The locked choreography fires on the REAL 403, not before it.
        runBreakOut();
        return error.message;
      }
      throw error;
    }
  });

  const station = COPY.stations.isolation;

  return (
    /*
     * THE BOUNDARY IS THE PEAK, AND NOW LOOKS LIKE IT.
     *
     * §2.5 makes the break-out the dramatic peak of the whole surface, and it
     * was rendering as one of five identical bordered cards — visually
     * indistinguishable from fetching a receipt link. A visitor had no way to
     * tell which action was the point.
     *
     * The cyan is not decoration and not a new colour: the palette is locked so
     * that cyan means the isolation boundary and nothing else, so marking the
     * isolation station with it states exactly what the semantic already says.
     */
    <section className="station station-boundary" aria-labelledby="st-isolation">
      <p className="station-eyebrow">The boundary</p>
      <h3 id="st-isolation">{station.name}</h3>
      <p className="station-invitation">{station.invitation}</p>
      {target ? <p className="station-target">target record {target}</p> : null}

      <div className="station-actions">
        <button
          type="button"
          className="action-primary"
          onClick={() => void attempt.invoke()}
          disabled={attempt.busy}
        >
          {attempt.busy ? 'attempting…' : station.action}
        </button>
        {denial ? (
          <button type="button" onClick={() => void inspect.invoke()} disabled={inspect.busy}>
            {inspect.busy ? 'reading…' : station.inspect}
          </button>
        ) : null}
      </div>

      {attempt.error ? <Failure error={attempt.error} /> : null}
      {denial ? (
        <Result tone="boundary">
          <p className="denial">403 — {denial}</p>
        </Result>
      ) : null}

      {inspect.value ? (
        <Result>
          <p className="station-note">{station.inspectNote}</p>
          <dl className="inspect">
            <dt>Layer 1 — {inspect.value.layers.orgScope.name}</dt>
            <dd>refused: {String(inspect.value.layers.orgScope.refused)}</dd>
            <dt>Layer 2 — {inspect.value.layers.rowLevelSecurity.name}</dt>
            <dd>refused: {String(inspect.value.layers.rowLevelSecurity.refused)}</dd>
            <dt>The predicate, from pg_policies</dt>
            <dd>
              <code>{inspect.value.policy.policies[0]?.qual ?? '—'}</code>
            </dd>
            <dt>Your attempted query</dt>
            <dd>
              <code>{inspect.value.attempt.sql}</code>
            </dd>
            <dt>The branch that answered</dt>
            <dd>
              <code>
                {inspect.value.branch.file} — {inspect.value.branch.code}
              </code>
            </dd>
          </dl>
          {/* The honest disclosure the owner ratified: this demo is stronger
              than the platforms it demonstrates, and says so. */}
          <p className="station-disclosure">{inspect.value.disclosure.productionParity}</p>
          <p className="station-disclosure">{inspect.value.disclosure.statusCodeChoice}</p>
        </Result>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function PaymentsStation({ apiKey }: { apiKey: string }) {
  const [key] = useState(() => `evt_${Math.random().toString(36).slice(2, 10)}`);
  const [outcomes, setOutcomes] = useState<string[] | null>(null);
  const opened = useAction(() => api.openIdempotencyKey(apiKey, key));

  const fire = useAction(async () => {
    // Simultaneous, genuinely: two requests in flight at once, which is the
    // condition a read-then-write implementation fails under.
    const [a, b] = await Promise.all([
      api.verifyPayment(apiKey, key),
      api.verifyPayment(apiKey, key),
    ]);
    setOutcomes([a.outcome, b.outcome]);
    return [a, b] as const;
  });

  const station = COPY.stations.payments;

  return (
    <section className="station" aria-labelledby="st-payments">
      <h3 id="st-payments">{station.name}</h3>
      <p className="station-invitation">{station.invitation}</p>
      <p className="station-target">idempotency key {key}</p>

      <div className="station-actions">
        <button type="button" onClick={() => void fire.invoke()} disabled={fire.busy}>
          {fire.busy ? 'firing…' : station.action}
        </button>
        {outcomes ? (
          <button type="button" onClick={() => void opened.invoke()} disabled={opened.busy}>
            {opened.busy ? 'opening…' : station.openKey}
          </button>
        ) : null}
      </div>

      {fire.error ? <Failure error={fire.error} /> : null}
      {outcomes ? (
        <Result>
          <p>
            Two simultaneous deliveries:{' '}
            <strong>{outcomes.filter((o) => o === 'activated').length}</strong> activated,{' '}
            <strong>{outcomes.filter((o) => o === 'replayed').length}</strong> no-op.
          </p>
          <p className="station-note">{station.note}</p>
        </Result>
      ) : null}
      {opened.value ? (
        <Result>
          <dl className="inspect">
            <dt>Replays absorbed</dt>
            <dd>{opened.value.activation.replay_count}</dd>
            <dt>Decided by</dt>
            <dd>
              <code>{opened.value.mechanism.statement}</code>
            </dd>
            <dt>Redis</dt>
            <dd>{opened.value.mechanism.redisRole}</dd>
          </dl>
        </Result>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function FraudStation({ apiKey }: { apiKey: string }) {
  const submit = useAction(async () => {
    const first = await api.submitEvidence(apiKey, 'ward 3 clean', EVIDENCE_BYTES);
    const second = await api.submitEvidence(apiKey, 'a different job', EVIDENCE_BYTES);
    return { first, second };
  });
  const station = COPY.stations.fraud;

  return (
    <section className="station" aria-labelledby="st-fraud">
      <h3 id="st-fraud">{station.name}</h3>
      <p className="station-invitation">{station.invitation}</p>
      <div className="station-actions">
        <button type="button" onClick={() => void submit.invoke()} disabled={submit.busy}>
          {submit.busy ? 'submitting…' : station.action}
        </button>
      </div>
      {submit.error ? <Failure error={submit.error} /> : null}
      {submit.value ? (
        <Result>
          <dl className="inspect">
            <dt>First submission</dt>
            <dd>{submit.value.first.outcome}</dd>
            <dt>Second, identical</dt>
            <dd className="denial">{submit.value.second.outcome}</dd>
            <dt>SHA-256 of the bytes</dt>
            <dd>
              <code>{submit.value.first.digest}</code>
            </dd>
          </dl>
          <p className="station-note">{station.note}</p>
        </Result>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function AiStation({ apiKey }: { apiKey: string }) {
  const station = COPY.stations.ai;
  const operational = useAction(() => api.ask(apiKey, station.operational));
  const creative = useAction(() => api.ask(apiKey, station.creative));

  const render = (result: api.AskResult) => (
    <Result>
      <dl className="inspect">
        <dt>Route</dt>
        <dd>{result.route}</dd>
        <dt>Tokens charged</dt>
        <dd>{result.tokensCharged}</dd>
        {result.intent ? (
          <>
            <dt>Answered by</dt>
            <dd>
              <code>{result.intent.sql}</code>
            </dd>
          </>
        ) : null}
        <dt>Answer</dt>
        <dd>{result.answer}</dd>
        {result.budget ? (
          <>
            <dt>Budget</dt>
            <dd>
              {result.budget.tokensUsed} / {result.budget.tokensLimit} used
              {result.budget.exhausted ? ' — exhausted' : ''}
            </dd>
          </>
        ) : null}
      </dl>
      <p className="station-note">{result.costNote}</p>
    </Result>
  );

  return (
    <section className="station" aria-labelledby="st-ai">
      <h3 id="st-ai">{station.name}</h3>
      <p className="station-invitation">{station.invitation}</p>
      <div className="station-actions">
        <button type="button" onClick={() => void operational.invoke()} disabled={operational.busy}>
          {operational.busy ? 'asking…' : `Ask: ${station.operational}`}
        </button>
        <button type="button" onClick={() => void creative.invoke()} disabled={creative.busy}>
          {creative.busy ? 'asking…' : `Ask: ${station.creative}`}
        </button>
      </div>
      {operational.error ? <Failure error={operational.error} /> : null}
      {creative.error ? <Failure error={creative.error} /> : null}
      {operational.value ? render(operational.value) : null}
      {creative.value ? render(creative.value) : null}
      <p className="station-note">{station.note}</p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function LimitsStation({ apiKey }: { apiKey: string }) {
  const [codes, setCodes] = useState<number[] | null>(null);
  const run = useAction(async () => {
    const results: number[] = [];
    // Sequential and real: each one is a request the limiter actually counts.
    for (let i = 0; i < 20; i += 1) {
      try {
        await api.hammer(apiKey);
        results.push(200);
      } catch (error) {
        results.push(error instanceof api.ApiError ? error.status : 0);
      }
    }
    setCodes(results);
    return results;
  });
  const station = COPY.stations.limits;

  return (
    <section className="station" aria-labelledby="st-limits">
      <h3 id="st-limits">{station.name}</h3>
      <p className="station-invitation">{station.invitation}</p>
      <div className="station-actions">
        <button type="button" onClick={() => void run.invoke()} disabled={run.busy}>
          {run.busy ? 'sending…' : station.action}
        </button>
      </div>
      {run.error ? <Failure error={run.error} /> : null}
      {codes ? (
        <Result>
          <p className="codes">
            {codes.map((code, i) => (
              <span key={i} className={code === 429 ? 'code-shed' : 'code-ok'}>
                {code}
              </span>
            ))}
          </p>
          <p>
            {codes.filter((c) => c === 200).length} accepted,{' '}
            {codes.filter((c) => c === 429).length} shed.
          </p>
          <p className="station-note">{station.note}</p>
        </Result>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function TakeAway({ apiKey }: { apiKey: string }) {
  const receipt = useAction(() => api.issueReceipt(apiKey));
  return (
    <section className="station station-takeaway" aria-labelledby="st-takeaway">
      <h3 id="st-takeaway">{COPY.takeAway.heading}</h3>
      <p className="station-invitation">{COPY.takeAway.body}</p>
      <div className="station-actions">
        <button type="button" onClick={() => void receipt.invoke()} disabled={receipt.busy}>
          {receipt.busy ? 'signing…' : COPY.takeAway.action}
        </button>
      </div>
      {receipt.error ? <Failure error={receipt.error} /> : null}
      {receipt.value ? (
        <Result>
          <p>
            <a href={receipt.value.receiptUrl}>{receipt.value.receiptUrl}</a>
          </p>
          <p className="station-note">{receipt.value.note}</p>
          <p className="station-note">{receipt.value.emailDelivery.note}</p>
        </Result>
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ */

const LABELS: Record<Station, string> = {
  isolation: COPY.stations.isolation.name,
  payments: COPY.stations.payments.name,
  fraud: COPY.stations.fraud.name,
  ai: COPY.stations.ai.name,
  limits: COPY.stations.limits.name,
};

export function Stations({ apiKey }: { apiKey: string }) {
  const station = useWorld((s) => s.station);

  return (
    <section aria-labelledby="stations-heading" className="panel">
      <h2 id="stations-heading">{COPY.stations.heading}</h2>
      <p className="panel-note">{COPY.stations.lede}</p>

      {/*
        Real links, not buttons. §2.9 requires every station to be directly
        addressable and shareable, so these are hrefs a visitor can copy, open
        in a new tab, or send to someone — intercepted only to keep the take
        continuous.
      */}
      <nav className="station-nav" aria-label="Stations">
        <a
          href="/live/"
          aria-current={station === null ? 'page' : undefined}
          onClick={(event) => {
            if (event.metaKey || event.ctrlKey) return;
            event.preventDefault();
            navigate(null);
          }}
        >
          All
        </a>
        {STATIONS.map((id) => (
          <a
            key={id}
            href={`/live/${id}/`}
            aria-current={station === id ? 'page' : undefined}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey) return;
              event.preventDefault();
              navigate(id);
            }}
          >
            {LABELS[id]}
          </a>
        ))}
      </nav>

      <div className="stations">
        {(station === null || station === 'isolation') && <IsolationStation apiKey={apiKey} />}
        {(station === null || station === 'payments') && <PaymentsStation apiKey={apiKey} />}
        {(station === null || station === 'fraud') && <FraudStation apiKey={apiKey} />}
        {(station === null || station === 'ai') && <AiStation apiKey={apiKey} />}
        {(station === null || station === 'limits') && <LimitsStation apiKey={apiKey} />}
        {station === null && <TakeAway apiKey={apiKey} />}
      </div>
    </section>
  );
}
