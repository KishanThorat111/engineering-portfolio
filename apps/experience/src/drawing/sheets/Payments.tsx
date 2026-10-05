/**
 * A-103 — Payments. Two confirmations of one payment, in flight together,
 * arrive at a door with one leaf: a unique constraint. One passes and writes
 * the row; the other turns back as a replay. Which one won is whatever the
 * database decided this time — the drawing reads it from the responses.
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
  Evidence,
  ExchangeLine,
  Line,
  Notes,
  Path,
  Room,
  T,
  fmtMs,
  measuredBy,
  useWidth,
} from '../parts.tsx';

const S = COPY.drawing.sheets.payments;
const N = COPY.drawing.note;
const M = COPY.drawing.misc;

type KeyView = {
  activation: api.Activation['activation'];
  mechanism: { authority: string; statement: string; why: string; redisRole: string };
};

const newKey = () => `evt_${Math.random().toString(36).slice(2, 10)}`;

export function PaymentsSheet({ mode, tenant }: { mode: Mode; tenant: Tenant | null }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pair, setPair] = useState<[Outcome<api.Activation>, Outcome<api.Activation>] | null>(null);
  const [keyView, setKeyView] = useState<Outcome<KeyView> | null>(null);
  const [idemKey, setIdemKey] = useState<string | null>(null);
  const [run, setRun] = useState(0);
  const announce = useDrawing((s) => s.announce);
  const recorded = mode === 'recorded';

  const go = async () => {
    setRun((r) => r + 1);
    setPair(null);
    setKeyView(null);
    setFailed(false);
    setBusy(true);
    if (recorded || !tenant) {
      const rec = RECORDED.demos.payments;
      setIdemKey(rec.idempotencyKey);
      void replayAudit(rec.audit, startOf(rec.exchanges.first));
      const [a, b] = await Promise.all([replay(rec.exchanges.first), replay(rec.exchanges.second)]);
      setPair([a, b]);
      announce(describe(a, b, true));
      setKeyView(await replay(rec.exchanges.key));
    } else {
      const key = newKey();
      setIdemKey(key);
      const body = {
        idempotencyKey: key,
        subscriptionRef: 'sub_demo',
        amountMinor: 4900,
        currency: 'GBP',
      };
      // Genuinely simultaneous: both requests are in flight before either returns.
      const [a, b] = await Promise.all([
        call<api.Activation>('POST', '/v1/demos/payments/verify', tenant.apiKey, body),
        call<api.Activation>('POST', '/v1/demos/payments/verify', tenant.apiKey, body),
      ]);
      if (unreachable(a) || unreachable(b)) {
        setFailed(true);
        setBusy(false);
        return;
      }
      setPair([a, b]);
      setKeyView(
        await call<KeyView>(
          'GET',
          `/v1/demos/payments/keys/${encodeURIComponent(key)}`,
          tenant.apiKey,
        ),
      );
      if (mode === 'partial') await syncAudit(tenant.apiKey);
      announce(describe(a, b, false));
    }
    setBusy(false);
  };

  const activated = pair ? pair.filter((p) => p.body?.outcome === 'activated').length : 0;
  const replayed = pair ? pair.filter((p) => p.body?.outcome === 'replayed').length : 0;

  return (
    <article className="sheet-body" aria-labelledby="sheet-title">
      <div className="plan" ref={ref}>
        {width > 0 ? (
          <Plan
            key={run}
            width={width}
            busy={busy}
            pair={pair}
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
          busy || pair ? [N.received, S.received] : null,
          pair ? [N.did, S.did] : null,
          pair
            ? [
                N.result,
                <>
                  {activated} {S.activated},{' '}
                  <strong className="refused">{replayed} replayed</strong> —{' '}
                  {keyView?.body
                    ? `${S.rows}: 1, ${S.replays}: ${keyView.body.activation.replay_count}.`
                    : ''}
                </>,
              ]
            : null,
          pair ? [N.why, S.why] : null,
          keyView?.body ? [N.proof, <code key="p">{keyView.body.mechanism.statement}</code>] : null,
        ]}
      />
      {pair ? (
        <>
          <table className="schedule stamp">
            <caption>{S.schedule}</caption>
            <thead>
              <tr>
                <th scope="col">{S.key}</th>
                <th scope="col">A</th>
                <th scope="col">B</th>
                <th scope="col">{S.rows}</th>
                <th scope="col">{S.replays}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>{idemKey}</code>
                </td>
                <td>
                  {pair[0].body?.outcome} · {fmtMs(pair[0].ms)}
                </td>
                <td>
                  {pair[1].body?.outcome} · {fmtMs(pair[1].ms)}
                </td>
                <td>1</td>
                <td>{keyView?.body?.activation.replay_count ?? '—'}</td>
              </tr>
            </tbody>
          </table>
          <Evidence>
            <h4>{COPY.drawing.exchangesHeading}</h4>
            <ul className="xlines">
              <ExchangeLine method="POST" path="/v1/demos/payments/verify  (A)" outcome={pair[0]} />
              <ExchangeLine method="POST" path="/v1/demos/payments/verify  (B)" outcome={pair[1]} />
              {keyView ? (
                <ExchangeLine
                  method="GET"
                  path={`/v1/demos/payments/keys/${idemKey ?? ''}`}
                  outcome={keyView}
                />
              ) : null}
            </ul>
            {keyView?.body ? (
              <dl className="ev">
                <dt>{S.statement}</dt>
                <dd>
                  <code>{keyView.body.mechanism.statement}</code> —{' '}
                  {keyView.body.mechanism.authority}
                </dd>
                <dt>{M.why}</dt>
                <dd>{keyView.body.mechanism.why}</dd>
                <dt>{S.redis}</dt>
                <dd>{keyView.body.mechanism.redisRole}</dd>
              </dl>
            ) : null}
          </Evidence>
        </>
      ) : null}
    </article>
  );
}

function describe(
  a: Outcome<api.Activation>,
  b: Outcome<api.Activation>,
  isRecorded: boolean,
): string {
  const won = [a, b].filter((o) => o.body?.outcome === 'activated').length;
  return `${isRecorded ? 'Recorded run: ' : ''}two confirmations sent at once: ${won} activated, ${2 - won} replayed.`;
}

function Plan({
  width,
  busy,
  pair,
  recorded,
  tenantRef,
}: {
  width: number;
  busy: boolean;
  pair: [Outcome<api.Activation>, Outcome<api.Activation>] | null;
  recorded: boolean;
  tenantRef: string | null;
}) {
  const compact = width < 620;
  const height = compact ? 420 : Math.round(Math.min(Math.max(width * 0.4, 320), 400));
  const top = 26;
  const wallT = 12;
  const yours = compact
    ? { x: 1, y: top, w: width - 2, h: 150 }
    : { x: 1, y: top, w: Math.round(width * 0.44), h: height - top - 16 };
  const theirs = compact
    ? { x: 1, y: top + 150 + wallT, w: width - 2, h: height - top - 150 - wallT - 16 }
    : {
        x: yours.x + yours.w + wallT,
        y: top,
        w: width - (yours.x + yours.w + wallT) - 1,
        h: yours.h,
      };

  // The door: a gap in the wall with one leaf and its swing.
  const door = compact
    ? { x: Math.round(width * 0.62), y: yours.y + yours.h + wallT / 2 }
    : { x: yours.x + yours.w + wallT / 2, y: Math.round(top + yours.h * 0.55) };
  const leaf = 34;
  const a = compact
    ? { x: Math.round(width * 0.3), y: yours.y + 96 }
    : { x: Math.round(yours.w * 0.26), y: door.y - 54 };
  const b = compact
    ? { x: Math.round(width * 0.9), y: yours.y + 96 }
    : { x: Math.round(yours.w * 0.26), y: door.y + 54 };
  const row = compact
    ? { x: door.x, y: theirs.y + 80 }
    : { x: theirs.x + Math.round(theirs.w * 0.5), y: door.y };

  const winner = pair ? (pair[0].body?.outcome === 'activated' ? 0 : 1) : null;
  const points = [a, b];

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label="Plan: two payment confirmations reach one door; one passes and writes one row, the other is replayed."
    >
      <Room
        x={yours.x}
        y={yours.y}
        w={yours.w}
        h={yours.h}
        name={recorded ? COPY.drawing.misc.recordedRoom : COPY.drawing.sheets.isolation.yours}
        reference={tenantRef}
        inked={Boolean(tenantRef)}
      />
      <Room
        x={theirs.x}
        y={theirs.y}
        w={theirs.w}
        h={theirs.h}
        name={S.activations}
        reference={pair ? 'payment_activation' : null}
        inked={Boolean(pair)}
      />
      {/* wall with the door opening */}
      {compact ? (
        <>
          <rect
            x={1}
            y={yours.y + yours.h}
            width={door.x - leaf / 2 - 1}
            height={wallT}
            className="ln ln--wall poche-ink"
          />
          <rect
            x={door.x + leaf / 2}
            y={yours.y + yours.h}
            width={width - 1 - door.x - leaf / 2}
            height={wallT}
            className="ln ln--wall poche-ink"
          />
          <Line
            x1={door.x - leaf / 2}
            y1={door.y}
            x2={door.x - leaf / 2}
            y2={door.y + leaf}
            className="ln"
          />
          <Path
            d={`M ${door.x - leaf / 2} ${door.y + leaf} A ${leaf} ${leaf} 0 0 0 ${door.x + leaf / 2} ${door.y}`}
            className="ln ln--fine"
          />
        </>
      ) : (
        <>
          <rect
            x={yours.x + yours.w}
            y={top - 8}
            width={wallT}
            height={door.y - leaf / 2 - top + 8}
            className="ln ln--wall poche-ink"
          />
          <rect
            x={yours.x + yours.w}
            y={door.y + leaf / 2}
            width={wallT}
            height={top + yours.h + 8 - door.y - leaf / 2}
            className="ln ln--wall poche-ink"
          />
          <Line
            x1={door.x}
            y1={door.y - leaf / 2}
            x2={door.x + leaf}
            y2={door.y - leaf / 2}
            className="ln"
          />
          <Path
            d={`M ${door.x + leaf} ${door.y - leaf / 2} A ${leaf} ${leaf} 0 0 1 ${door.x} ${door.y + leaf / 2}`}
            className="ln ln--fine"
          />
        </>
      )}
      <T x={compact ? 12 : door.x + 22} y={compact ? row.y + 50 : door.y + leaf / 2 + 40}>
        {S.door}
      </T>
      {compact ? (
        <>
          <T x={12} y={row.y + 68} kind="mono">
            UNIQUE (tenant_id,
          </T>
          <T x={12 + 58} y={row.y + 84} kind="mono">
            idempotency_key)
          </T>
        </>
      ) : (
        <T x={door.x + 22} y={door.y + leaf / 2 + 58} kind="mono">
          UNIQUE (tenant_id, idempotency_key)
        </T>
      )}

      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={4} className="dot" />
          <T x={p.x - 10} y={p.y + 4} anchor="end" kind="num">
            {i === 0 ? 'A' : 'B'}
          </T>
          {busy && !pair ? (
            <Line x1={p.x} y1={p.y} x2={door.x} y2={door.y} className="ln ln--dash" />
          ) : null}
        </g>
      ))}

      {pair && winner !== null
        ? points.map((p, i) => {
            const o = pair[i]!;
            const won = i === winner;
            const mx = (p.x + door.x) / 2;
            const my = (p.y + door.y) / 2;
            return (
              <g key={`r${i}`}>
                <Line x1={p.x} y1={p.y} x2={door.x} y2={door.y} className="ln ln--req" draft />
                {won ? (
                  <>
                    <Line
                      x1={door.x}
                      y1={door.y}
                      x2={row.x}
                      y2={row.y}
                      className="ln ln--req"
                      draft
                    />
                    <rect
                      x={row.x - 6}
                      y={row.y - 6}
                      width={12}
                      height={12}
                      className="rec rec--ink stamp"
                    />
                    <T x={row.x} y={row.y + 24} kind="note" anchor="middle">
                      {S.oneRow}
                    </T>
                  </>
                ) : (
                  <Path
                    d={
                      compact
                        ? `M ${door.x} ${door.y} q 22 -10 30 -40`
                        : `M ${door.x} ${door.y} q -10 ${p.y < door.y ? -26 : 26} -44 ${p.y < door.y ? -30 : 30}`
                    }
                    className="ln ln--stop"
                    draft
                  />
                )}
                {compact ? (
                  <T x={12} y={yours.y + 62 + i * 16} kind="num">
                    {`${i === 0 ? 'A' : 'B'} · ${fmtMs(o.ms)} · ${won ? S.activated : M.replayed}`}
                  </T>
                ) : (
                  <T x={mx} y={my + (p.y < door.y ? -12 : 22)} kind="num" anchor="middle">
                    {`${fmtMs(o.ms)} · ${won ? S.activated : M.replayed}`}
                  </T>
                )}
              </g>
            );
          })
        : null}
      {pair ? (
        <T
          x={compact ? 8 : door.x - 12}
          y={compact ? yours.y + yours.h - 12 : top + yours.h - 10}
          anchor={compact ? 'start' : 'end'}
          kind="note"
        >
          {measuredBy(pair[0])}
        </T>
      ) : null}
    </svg>
  );
}
