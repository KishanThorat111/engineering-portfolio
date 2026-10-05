/**
 * A-102 — Rate limits. Twenty requests, one after another; each cell of the
 * tally is drawn only when its own response comes back, so the moment the
 * limiter starts shedding is the moment the cells turn.
 */
import { useState } from 'react';
import { COPY } from '../../content/copy.ts';
import type * as api from '../../live/api.ts';
import { RECORDED } from '../recorded.ts';
import {
  call,
  replay,
  replayAudit,
  startOf,
  syncAudit,
  unreachable,
  type Outcome,
} from '../demos.ts';
import { useDrawing, type Mode, type Tenant } from '../store.ts';
import {
  Dimension,
  Evidence,
  ExchangeLine,
  Line,
  Notes,
  Room,
  T,
  fmtMs,
  measuredBy,
  useWidth,
} from '../parts.tsx';

const S = COPY.drawing.sheets.limits;
const N = COPY.drawing.note;
const M = COPY.drawing.misc;
const COUNT = 20;
const PATH = '/v1/demos/limits/hammer';

export function LimitsSheet({ mode, tenant }: { mode: Mode; tenant: Tenant | null }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [runs, setRuns] = useState<Array<Outcome<api.HammerResult | null>>>([]);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [revBase, setRevBase] = useState<number | null>(null);
  const [run, setRun] = useState(0);
  const revisions = useDrawing((s) => s.revisions);
  const announce = useDrawing((s) => s.announce);
  const recorded = mode === 'recorded';

  const go = async () => {
    setRun((r) => r + 1);
    setRuns([]);
    setFailed(false);
    setTotalMs(null);
    setBusy(true);
    setRevBase(useDrawing.getState().revisions.length);
    const results: Array<Outcome<api.HammerResult | null>> = [];
    const started = performance.now();

    if (recorded || !tenant) {
      const rec = RECORDED.demos.limits;
      void replayAudit(rec.audit, startOf(rec.exchanges[0]!));
      for (const exchange of rec.exchanges) {
        results.push(await replay(exchange));
        setRuns([...results]);
      }
      setTotalMs(rec.totalMs);
    } else {
      for (let i = 0; i < COUNT; i += 1) {
        const result = await call<api.HammerResult | null>('POST', PATH, tenant.apiKey);
        results.push(result);
        setRuns([...results]);
        if (unreachable(result)) {
          setFailed(true);
          break;
        }
      }
      setTotalMs(Math.round(performance.now() - started));
      if (mode === 'partial') await syncAudit(tenant.apiKey);
    }
    setBusy(false);
    const ok = results.filter((r) => r.status === 200).length;
    const shed = results.filter((r) => r.status === 429).length;
    announce(
      `${recorded ? 'Recorded run: ' : ''}${ok} ${S.accepted}, ${shed} ${S.shed} with HTTP 429.`,
    );
  };

  const accepted = runs.filter((r) => r.status === 200);
  const shed = runs.filter((r) => r.status === 429);
  const limit = accepted.find((r) => r.body)?.body?.limit ?? null;
  const firstShed = runs.find((r) => r.status === 429) ?? null;
  const audited =
    revBase === null
      ? 0
      : revisions.slice(revBase).filter((r) => r.action === 'demo.limits.request').length;
  const done = !busy && runs.length > 0;

  return (
    <article className="sheet-body" aria-labelledby="sheet-title">
      <div className="plan" ref={ref}>
        {width > 0 ? (
          <Plan
            key={run}
            width={width}
            runs={runs}
            limit={limit}
            totalMs={totalMs}
            source={runs[0] ?? null}
            recorded={recorded}
            tenantRef={recorded ? RECORDED.visitor.publicRef : (tenant?.publicRef ?? null)}
          />
        ) : null}
      </div>
      <div className="act">
        <button
          type="button"
          className="act__primary"
          onClick={() => void go()}
          disabled={busy || mode === 'connecting'}
        >
          {busy ? S.busy : recorded ? S.actionRecorded : S.action}
        </button>
        {failed ? (
          <p className="act__note act__note--fail" role="status">
            {COPY.drawing.failure}
          </p>
        ) : null}
      </div>
      <Notes
        items={[
          [recorded ? N.request : N.you, recorded ? S.youRecorded : S.you],
          runs.length ? [N.received, S.received] : null,
          runs.length ? [N.did, S.did] : null,
          done
            ? [
                N.result,
                <>
                  {accepted.length} {S.accepted},{' '}
                  <strong className="refused">
                    {shed.length} {S.shed}
                  </strong>{' '}
                  (HTTP 429){firstShed?.retryAfter ? `, ${S.retry} ${firstShed.retryAfter} s` : ''}.
                </>,
              ]
            : null,
          done ? [N.why, S.why] : null,
          done && !recorded && mode !== 'connecting'
            ? [N.proof, `${audited} ${M.limitsProof}`]
            : null,
          done && recorded
            ? [N.proof, `${RECORDED.demos.limits.audit.length} ${M.limitsProofRecorded}`]
            : null,
        ]}
      />
      {done ? (
        <Evidence>
          <h4>{COPY.drawing.exchangesHeading}</h4>
          <ul className="xlines">
            {runs.map((r, i) => (
              <ExchangeLine key={i} method="POST" path={`${PATH}  #${i + 1}`} outcome={r} />
            ))}
          </ul>
          {limit ? (
            <dl className="ev">
              <dt>{M.limit}</dt>
              <dd>
                {limit.max} per {limit.window}, keyed by {limit.keyedBy}. {limit.store}.
              </dd>
              {accepted[0]?.body?.layers.map((layer) => (
                <div key={layer.name}>
                  <dt>{layer.name}</dt>
                  <dd>{layer.note}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </Evidence>
      ) : null}
    </article>
  );
}

function Plan({
  width,
  runs,
  limit,
  totalMs,
  source,
  recorded,
  tenantRef,
}: {
  width: number;
  runs: Array<Outcome<api.HammerResult | null>>;
  limit: api.HammerResult['limit'] | null;
  totalMs: number | null;
  source: Outcome<unknown> | null;
  recorded: boolean;
  tenantRef: string | null;
}) {
  const compact = width < 620;
  const perRow = compact ? 10 : COUNT;
  const rows = COUNT / perRow;
  const roomW = compact ? width - 2 : Math.round(width * 0.24);
  const roomH = compact ? 96 : 150;
  const top = 26;
  const gridX = compact ? 1 : roomW + 64;
  const gridW = width - gridX - 2;
  const gap = compact ? 5 : 6;
  const cell = Math.floor((gridW - gap * (perRow - 1)) / perRow);
  const gridY = compact ? top + roomH + 74 : top + 92;
  const height = compact
    ? gridY + rows * (cell + gap) + 76
    : Math.max(top + roomH + 24, gridY + cell + gap + 60);
  const doorY = compact ? top + roomH : top + roomH / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Tally of twenty requests: ${runs.filter((r) => r.status === 200).length} accepted, ${runs.filter((r) => r.status === 429).length} shed.`}
    >
      <Room
        x={1}
        y={top}
        w={roomW}
        h={roomH}
        name={recorded ? COPY.drawing.misc.recordedRoom : COPY.drawing.sheets.isolation.yours}
        reference={tenantRef}
        inked={Boolean(tenantRef)}
      />
      {/* The sign is lettered from the first accepted response, not from memory. */}
      <g className={limit ? 'sign stamp' : 'sign'}>
        <T x={gridX} y={compact ? top + roomH + 28 : top + 22}>
          {limit ? `${S.sign} ${limit.max} ${S.perWindow} ${limit.window}` : `${S.sign} —`}
        </T>
        <T
          x={gridX}
          y={compact ? top + roomH + 46 : top + 40}
          kind="note"
          className={limit ? '' : 't-pencil'}
        >
          {limit
            ? `${S.keyed} ${limit.keyedBy} · ${limit.store.split(',')[0]}`
            : M.letteredFromFirst}
        </T>
      </g>
      {runs.length ? (
        compact ? (
          <Line
            x1={width - 14}
            y1={doorY}
            x2={width - 14}
            y2={gridY - 8}
            className="ln ln--req"
            draft
          />
        ) : (
          <Line
            x1={roomW + 1}
            y1={doorY}
            x2={gridX - 8}
            y2={gridY + cell / 2}
            className="ln ln--req"
            draft
          />
        )
      ) : null}
      {Array.from({ length: COUNT }, (_, i) => {
        const r = runs[i];
        const cx = gridX + (i % perRow) * (cell + gap);
        const cy = gridY + Math.floor(i / perRow) * (cell + gap);
        const state = !r ? 'empty' : r.status === 200 ? 'ok' : r.status === 429 ? 'shed' : 'err';
        return (
          <g key={i} className={`cell cell--${state}`}>
            <rect x={cx} y={cy} width={cell} height={cell} className="cell__box" />
            {state === 'shed' ? (
              <path
                d={`M ${cx + 5} ${cy + 5} L ${cx + cell - 5} ${cy + cell - 5} M ${cx + cell - 5} ${cy + 5} L ${cx + 5} ${cy + cell - 5}`}
                className="ln ln--stop stamp"
              />
            ) : null}
            {!compact || i < perRow ? (
              <T x={cx + cell / 2} y={cy - 6} kind="note" anchor="middle" className="t-pencil">
                {String(i + 1)}
              </T>
            ) : null}
          </g>
        );
      })}
      {totalMs !== null && source ? (
        <Dimension
          from={gridX}
          to={gridX + perRow * (cell + gap) - gap}
          at={gridY + rows * (cell + gap) + 26}
          label={`${S.total} ${fmtMs(totalMs)}`}
          sub={measuredBy(source)}
        />
      ) : null}
    </svg>
  );
}
