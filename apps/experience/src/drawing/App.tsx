/**
 * /live/ — the working drawing.
 *
 * The page is a set of five sheets, one per demonstration, with a title block
 * that states only what the system has said: the edge that answered, the
 * tenant the control plane provisioned, the channel that connected, the
 * revisions the database wrote. Its order of reading is the brief's: you are
 * here; this is your environment; it is real; try this; it answered; here is
 * why; here is the proof.
 *
 * The lifecycle is the earlier surface's, unchanged in substance: read the
 * edge, resume or provision a tenant, open the live channel — and when the
 * control plane cannot be reached, say so plainly and switch to exchanges
 * recorded from real runs. Nothing here manufactures a tenant to keep a sheet
 * usable.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { COPY } from '../content/copy.ts';
import * as api from '../live/api.ts';
import { LiveSocketSource } from '../live/source.ts';
import { clearSession, loadSession, saveSession } from '../state/session.ts';
import { RECORDED } from './recorded.ts';
import { syncAudit } from './demos.ts';
import { useDrawing, useMode, type Mode, type Tenant } from './store.ts';
import { IsolationSheet } from './sheets/Isolation.tsx';
import { LimitsSheet } from './sheets/Limits.tsx';
import { PaymentsSheet } from './sheets/Payments.tsx';
import { FraudSheet } from './sheets/Fraud.tsx';
import { AiSheet } from './sheets/Ai.tsx';

const D = COPY.drawing;

export const SHEETS = ['isolation', 'limits', 'payments', 'fraud', 'ai'] as const;
export type SheetId = (typeof SHEETS)[number];

const sheetFromPath = (pathname = location.pathname): SheetId => {
  const slug = /\/live\/([a-z-]+)\/?$/.exec(pathname)?.[1];
  return (SHEETS as readonly string[]).includes(slug ?? '') ? (slug as SheetId) : 'isolation';
};
const pathFor = (id: SheetId) => (id === 'isolation' ? '/live/' : `/live/${id}/`);

function liveUrl(key: string): string {
  const runtime = (globalThis as { __LIVE_URL__?: string }).__LIVE_URL__;
  const configured = runtime ?? (import.meta.env['VITE_LIVE_URL'] as string | undefined);
  const base =
    configured ?? `${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/v1/live`;
  return `${base}${base.includes('?') ? '&' : '?'}key=${encodeURIComponent(key)}`;
}

/** What failed, in words — the status is evidence, not an alarm. */
function describeFailure(error: unknown): string {
  if (error instanceof api.ApiError) {
    if (error.status === 429)
      return 'the provisioning limit for this address was reached (HTTP 429)';
    if (error.status >= 500)
      return `the edge answered, the control plane behind it did not (HTTP ${error.status})`;
    return `the control plane refused provisioning (HTTP ${error.status})`;
  }
  return 'no answer from the control plane';
}

export function App() {
  const [sheet, setSheet] = useState<SheetId>(() => sheetFromPath());
  const [attempt, setAttempt] = useState(0);
  const mode = useMode();
  const tenant = useDrawing((s) => s.tenant);
  const announcement = useDrawing((s) => s.announcement);
  const sourceRef = useRef<LiveSocketSource | null>(null);

  /* --- sheets are real URLs ------------------------------------------- */
  useEffect(() => {
    const apply = () => setSheet(sheetFromPath());
    addEventListener('popstate', apply);
    return () => removeEventListener('popstate', apply);
  }, []);

  const go = useCallback((id: SheetId) => {
    const path = pathFor(id);
    if (location.pathname !== path) history.pushState({ sheet: id }, '', path);
    const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
    if (doc.startViewTransition && !calm)
      doc.startViewTransition(() => flushSync(() => setSheet(id)));
    else setSheet(id);
  }, []);

  /* --- the real lifecycle ---------------------------------------------- */
  useEffect(() => {
    let cancelled = false;
    const store = useDrawing.getState();

    const connect = (key: string) => {
      sourceRef.current?.stop();
      const source = new LiveSocketSource(
        liveUrl(key),
        {
          onEvent: (event) => {
            if (event.isSelf) {
              useDrawing.getState().addRevision({
                id: event.id,
                at: event.occurredAt,
                action: event.action,
                outcome: event.outcome,
                ms: event.durationMs,
                via: 'socket',
              });
            } else {
              useDrawing.getState().countOther();
            }
          },
          onState: (state) => {
            if (state.mode === 'live') useDrawing.getState().setChannel('live');
            useDrawing.getState().setPresence(state.presence);
          },
        },
        () => useDrawing.getState().setChannel('down'),
      );
      sourceRef.current = source;
      source.start();
    };

    const ready = (t: Tenant, how: 'provisioned' | 'resumed') => {
      store.setTenant(t, how);
      connect(t.apiKey);
      // The rows the database already wrote for this tenant, read once.
      void syncAudit(t.apiKey);
    };

    void (async () => {
      store.setTenant(null, 'pending');
      store.setChannel('waiting');
      store.clearRevisions();
      const edge = await api.readEdge();
      if (cancelled) return;
      store.setEdge(edge);

      const existing = loadSession();
      if (existing) {
        try {
          const self = await api.me(existing.apiKey);
          if (cancelled) return;
          ready(
            {
              publicRef: existing.publicRef,
              orgId: existing.orgId,
              apiKey: existing.apiKey,
              expiresAt: self.tenant.expiresAt,
              records: self.records,
            },
            'resumed',
          );
          return;
        } catch (error) {
          // Purged between visits, or the plane is down. Only the first is a
          // reason to forget the key.
          if (error instanceof api.ApiError && error.status < 500) clearSession();
        }
      }

      try {
        const p = await api.provision('visitor');
        if (cancelled) return;
        saveSession({
          apiKey: p.credential.apiKey,
          publicRef: p.tenant.publicRef,
          orgId: p.tenant.id,
          expiresAt: p.tenant.expiresAt,
          coldOpenPlayed: true,
        });
        ready(
          {
            publicRef: p.tenant.publicRef,
            orgId: p.tenant.id,
            apiKey: p.credential.apiKey,
            expiresAt: p.tenant.expiresAt,
            records: p.seededRecords,
          },
          'provisioned',
        );
      } catch (error) {
        if (!cancelled) store.setTenant(null, 'failed', describeFailure(error));
      }
    })();

    return () => {
      cancelled = true;
      sourceRef.current?.stop();
      sourceRef.current = null;
    };
  }, [attempt]);

  const recorded = mode === 'recorded';
  const s = D.sheets[sheet];
  const index = SHEETS.indexOf(sheet);

  return (
    <div className="dw" data-mode={mode}>
      <a className="skip" href="#sheet">
        {D.misc.skip}
      </a>
      <svg className="defs" aria-hidden="true" width="0" height="0">
        <defs>
          <pattern
            id="hatch"
            width="6"
            height="6"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line x1="0" y1="0" x2="0" y2="6" className="hatch-line" />
          </pattern>
        </defs>
      </svg>

      <header className="hd">
        <a className="hd__mark" href="/">
          <span className="hd__kt" aria-hidden="true">
            KT
          </span>
          <span>{D.values.engineerName}</span>
        </a>
        <span className="hd__where">{D.pageTitle}</span>
        <a className="hd__back" href="/">
          {COPY.actions.backToSite}
        </a>
      </header>

      <section className="intro" aria-labelledby="intro-title">
        <p className="eyebrow">
          {D.project} · {D.projectDetail}
        </p>
        <h1 id="intro-title">{recorded ? D.headlineRecorded : D.headline}</h1>
        <p className="lede">{recorded ? D.ledeRecorded : D.lede}</p>
        <SetOut mode={mode} onRetry={() => setAttempt((a) => a + 1)} />
      </section>

      <nav className="sheets" aria-label={D.sheetsLabel}>
        <ol>
          {SHEETS.map((id, i) => (
            <li key={id}>
              <a
                href={pathFor(id)}
                aria-current={id === sheet ? 'page' : undefined}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  go(id);
                }}
              >
                <span className="sheets__no">{D.sheets[id].number}</span>
                <span className="sheets__name">{D.sheets[id].name}</span>
                <span className="sheets__i" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <main className="frame" id="sheet" tabIndex={-1}>
        <div className="frame__field">
          <Strip mode={mode} tenant={tenant} />
          <header className="field-hd">
            <span className="field-hd__no">
              {s.number} · {D.sheet} {index + 1} {D.of} {SHEETS.length}
            </span>
            <h2 id="sheet-title">
              {s.name}
              <span className="field-hd__title">{s.title}</span>
            </h2>
          </header>
          {/* Every sheet stays mounted, so a result survives moving between sheets. */}
          <div hidden={sheet !== 'isolation'}>
            <IsolationSheet mode={mode} tenant={tenant} />
          </div>
          <div hidden={sheet !== 'limits'}>
            <LimitsSheet mode={mode} tenant={tenant} />
          </div>
          <div hidden={sheet !== 'payments'}>
            <PaymentsSheet mode={mode} tenant={tenant} />
          </div>
          <div hidden={sheet !== 'fraud'}>
            <FraudSheet mode={mode} tenant={tenant} />
          </div>
          <div hidden={sheet !== 'ai'}>
            <AiSheet mode={mode} tenant={tenant} />
          </div>
          {index < SHEETS.length - 1 ? (
            <p className="next">
              <a
                href={pathFor(SHEETS[index + 1]!)}
                onClick={(e) => {
                  e.preventDefault();
                  go(SHEETS[index + 1]!);
                  document.getElementById('sheet')?.focus();
                }}
              >
                {D.sheet} {D.sheets[SHEETS[index + 1]!].number} —{' '}
                {D.sheets[SHEETS[index + 1]!].name} →
              </a>
            </p>
          ) : null}
        </div>
        <TitleBlock mode={mode} tenant={tenant} sheetNo={s.number} sheetName={s.name} />
      </main>

      <footer className="foot">
        <p>{D.disclosure}</p>
        <p>
          <a href="/">{COPY.actions.backToSite}</a>
        </p>
      </footer>

      <div className="sr-only" aria-live="polite" role="status">
        {announcement}
      </div>
    </div>
  );
}

/* --- setting out: only real steps, each when it really happens ----------- */

function SetOut({ mode, onRetry }: { mode: Mode; onRetry: () => void }) {
  const edge = useDrawing((s) => s.edge);
  const tenantState = useDrawing((s) => s.tenantState);
  const failure = useDrawing((s) => s.tenantFailure);
  const channel = useDrawing((s) => s.channel);
  const O = D.setOut;
  const line = (state: 'done' | 'wait' | 'fail', label: string, value?: string) => (
    <li className={`so so--${state}`}>
      <span className="so__mark" aria-hidden="true" />
      <span className="so__label">{label}</span>
      {value ? <span className="so__value">{value}</span> : null}
    </li>
  );
  return (
    <div className="setout">
      <ol aria-label="Setting out">
        {edge
          ? line(
              'done',
              edge.pop ? O.edge : O.edgeUnknown,
              `${edge.pop ?? D.values.unknown} · ${edge.rttMs} ms`,
            )
          : line('wait', O.edge)}
        {tenantState === 'pending'
          ? line('wait', O.tenant)
          : tenantState === 'failed'
            ? line('fail', O.tenantFailed, failure ?? undefined)
            : line('done', tenantState === 'resumed' ? O.tenantResumed : O.tenant)}
        {tenantState === 'failed'
          ? null
          : channel === 'live'
            ? line('done', O.channel)
            : channel === 'down'
              ? line('fail', O.channelFailed)
              : line('wait', O.channel)}
      </ol>
      <p className={`status status--${mode}`}>
        <span className="status__dot" aria-hidden="true" />
        <span className="status__word">
          {D.values[mode === 'connecting' ? 'connecting' : mode]}
        </span>
        <span className="status__line">{D.statusLine[mode]}</span>
      </p>
      {mode === 'recorded' ? (
        <button type="button" className="act__secondary" onClick={onRetry}>
          {D.retryLive}
        </button>
      ) : null}
    </div>
  );
}

/* --- the title block ----------------------------------------------------- */

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(t);
  }, [active]);
  return now;
}

const utc = (iso: string) => `${new Date(iso).toISOString().slice(11, 19)} UTC`;

function remaining(expiresAt: string, now: number): string | null {
  const ms = Date.parse(expiresAt) - now;
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1_000);
  return `${m}:${String(s).padStart(2, '0')} left`;
}

function Strip({ mode, tenant }: { mode: Mode; tenant: Tenant | null }) {
  const now = useNow(Boolean(tenant));
  return (
    <dl className="strip">
      <div>
        <dt>{D.fields.status}</dt>
        <dd className={`status--${mode}`}>
          <span className="status__dot" aria-hidden="true" />
          {D.values[mode === 'connecting' ? 'connecting' : mode]}
        </dd>
      </div>
      <div>
        <dt>{D.fields.tenant}</dt>
        <dd className="mono">{tenant?.publicRef ?? (mode === 'recorded' ? D.values.none : '—')}</dd>
      </div>
      {tenant ? (
        <div>
          <dt>{D.fields.validUntil}</dt>
          <dd className="mono">{remaining(tenant.expiresAt, now) ?? D.values.expired}</dd>
        </div>
      ) : null}
    </dl>
  );
}

function TitleBlock({
  mode,
  tenant,
  sheetNo,
  sheetName,
}: {
  mode: Mode;
  tenant: Tenant | null;
  sheetNo: string;
  sheetName: string;
}) {
  const edge = useDrawing((s) => s.edge);
  const channel = useDrawing((s) => s.channel);
  const presence = useDrawing((s) => s.presence);
  const revisions = useDrawing((s) => s.revisions);
  const otherEvents = useDrawing((s) => s.otherEvents);
  const now = useNow(Boolean(tenant));
  const [receipt, setReceipt] = useState<{
    busy: boolean;
    url: string | null;
    error: string | null;
  }>({
    busy: false,
    url: null,
    error: null,
  });
  const F = D.fields;
  const V = D.values;
  const left = tenant ? remaining(tenant.expiresAt, now) : null;
  const recorded = mode === 'recorded';

  const takeReceipt = async () => {
    if (!tenant) return;
    setReceipt({ busy: true, url: null, error: null });
    try {
      const r = await api.issueReceipt(tenant.apiKey);
      setReceipt({ busy: false, url: r.receiptUrl, error: null });
    } catch (error) {
      setReceipt({ busy: false, url: null, error: (error as Error).message });
    }
  };

  return (
    <aside className="tb" aria-label={D.titleBlock}>
      <div className="tb__project">
        <span className="tb__kt" aria-hidden="true">
          KT
        </span>
        <div>
          <p className="tb__name">{D.project}</p>
          <p className="tb__detail">{D.projectDetail}</p>
        </div>
      </div>
      <dl className="tb__grid">
        <div className="tb__row">
          <dt>{D.sheet}</dt>
          <dd>
            {sheetNo} · {sheetName}
          </dd>
        </div>
        <div className={`tb__row status--${mode}`}>
          <dt>{F.status}</dt>
          <dd>
            <span className="status__dot" aria-hidden="true" />
            <strong>{V[mode === 'connecting' ? 'connecting' : mode]}</strong>
          </dd>
        </div>
        <div className="tb__row">
          <dt>{F.tenant}</dt>
          <dd className="mono">{tenant?.publicRef ?? (recorded ? V.recordedTenant : '—')}</dd>
        </div>
        {tenant ? (
          <div className="tb__row">
            <dt>{F.validUntil}</dt>
            <dd className="mono">
              {utc(tenant.expiresAt)}
              <span className="tb__sub">{left ?? V.expired}</span>
            </dd>
          </div>
        ) : null}
        <div className="tb__row">
          <dt>{F.edge}</dt>
          <dd className="mono">
            {edge ? (edge.pop ?? V.unknown) : '—'}
            {edge ? (
              <span className="tb__sub">
                {F.roundTrip}: {edge.rttMs} ms, measured
              </span>
            ) : null}
          </dd>
        </div>
        <div className="tb__row">
          <dt>{F.transport}</dt>
          <dd>{location.protocol === 'https:' ? V.https : V.plainHttp}</dd>
        </div>
        {!recorded ? (
          <div className="tb__row">
            <dt>{F.channel}</dt>
            <dd>
              {channel === 'live'
                ? V.channelLive
                : channel === 'down'
                  ? V.channelDown
                  : V.channelWaiting}
              {channel === 'live' && presence ? (
                <span className="tb__sub">
                  {F.visitors}: {presence.measured ? presence.connections : V.unknown}
                </span>
              ) : null}
            </dd>
          </div>
        ) : (
          <>
            <div className="tb__row">
              <dt>{D.recordedFrom}</dt>
              <dd className="mono">
                {RECORDED.capturedAt.slice(0, 10)} {utc(RECORDED.capturedAt)}
              </dd>
            </div>
            <div className="tb__row">
              <dt>{D.recordedEnv}</dt>
              <dd>{RECORDED.environment}</dd>
            </div>
            <div className="tb__row">
              <dt>{D.recordedTiming}</dt>
              <dd>{RECORDED.timingNote}</dd>
            </div>
          </>
        )}
        <div className="tb__row">
          <dt>{F.security}</dt>
          <dd>{V.security}</dd>
        </div>
        <div className="tb__row">
          <dt>{F.drawnBy}</dt>
          <dd>{V.drawnBy}</dd>
        </div>
        <div className="tb__row">
          <dt>{F.checkedBy}</dt>
          <dd>{V.checkedBy}</dd>
        </div>
        <div className="tb__row">
          <dt>{F.engineer}</dt>
          <dd>
            {V.engineerName}
            <span className="tb__sub">{COPY.claim}</span>
          </dd>
        </div>
      </dl>

      <section className="revs" aria-labelledby="revs-title">
        <h3 id="revs-title">
          {F.revisions}
          {recorded ? <span className="tb__sub"> · {D.revisionsRecorded}</span> : null}
          {mode === 'partial' ? <span className="tb__sub"> · {D.revisionsViaHttp}</span> : null}
        </h3>
        {revisions.length ? (
          <table>
            <thead>
              <tr>
                <th scope="col">{D.misc.rev}</th>
                <th scope="col">{D.misc.time}</th>
                <th scope="col">{D.misc.action}</th>
                <th scope="col">{D.misc.outcome}</th>
              </tr>
            </thead>
            <tbody>
              {revisions.slice(-8).map((r) => (
                <tr key={r.id} className={`rev rev--${r.outcome}`}>
                  <td>{r.rev}</td>
                  <td className="revs__t">{new Date(r.at).toISOString().slice(11, 19)}</td>
                  {/* Break only at the dots: demo.isolation.inspect, never mid-word. */}
                  <td>{r.action.split('.').join('.​')}</td>
                  <td>{r.outcome}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="tb__empty">{D.revisionsEmpty}</p>
        )}
        {revisions.length > 8 ? (
          <p className="tb__empty">
            {revisions.length - 8} {D.misc.earlier}
          </p>
        ) : null}
        {otherEvents > 0 ? (
          <p className="tb__empty">
            {otherEvents} {D.otherActivity}
          </p>
        ) : null}
      </section>

      {tenant && !recorded ? (
        <section className="tb__receipt">
          {left ? (
            <>
              <button
                type="button"
                className="act__secondary"
                onClick={() => void takeReceipt()}
                disabled={receipt.busy}
              >
                {receipt.busy ? D.receipt.busy : D.receipt.action}
              </button>
              <p className="tb__empty">{D.receipt.note}</p>
              {receipt.url ? (
                <p className="tb__link">
                  <a href={receipt.url}>{receipt.url}</a>
                </p>
              ) : null}
              {receipt.error ? <p className="tb__empty">{receipt.error}</p> : null}
            </>
          ) : (
            <>
              <p className="tb__empty">{D.expiry.ended}</p>
              <button
                type="button"
                className="act__secondary"
                onClick={() => {
                  clearSession();
                  location.reload();
                }}
              >
                {D.expiry.restart}
              </button>
            </>
          )}
        </section>
      ) : (
        <p className="tb__empty">{recorded ? D.receipt.recordedNote : ''}</p>
      )}
    </aside>
  );
}
