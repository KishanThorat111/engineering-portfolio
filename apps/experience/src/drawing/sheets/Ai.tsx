/**
 * A-105 — AI routing. A question leaves your room and reaches the router. The
 * route that inks is the one the server reports it took; the budget scale is
 * the server's own count of tokens used against the limit. When the model
 * plane is not configured, the server says so in its answer, and so does the
 * sheet — nothing stands in for a model reply.
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

const S = COPY.drawing.sheets.ai;
const N = COPY.drawing.note;
const M = COPY.drawing.misc;
const Q = COPY.stations.ai;

type Asked = { question: string; outcome: Outcome<api.AskResult> };

export function AiSheet({ mode, tenant }: { mode: Mode; tenant: Tenant | null }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [asked, setAsked] = useState<Asked[]>([]);
  const announce = useDrawing((s) => s.announce);
  const recorded = mode === 'recorded';

  const ask = async (question: string) => {
    if (!tenant) return;
    setFailed(false);
    setBusy(true);
    const o = await call<api.AskResult>('POST', '/v1/demos/ai/ask', tenant.apiKey, { question });
    setBusy(false);
    if (unreachable(o)) {
      setFailed(true);
      return;
    }
    setAsked((a) => [...a, { question, outcome: o }]);
    announce(
      `Routed to the ${o.body?.route === 'data-plane' ? 'data plane, zero tokens' : `model plane, ${o.body?.tokensCharged ?? 0} tokens charged`}.`,
    );
    if (mode === 'partial') await syncAudit(tenant.apiKey);
  };

  const playRecorded = async () => {
    setAsked([]);
    setBusy(true);
    const rec = RECORDED.demos.ai;
    void replayAudit(rec.audit, startOf(rec.exchanges.operational));
    const a = await replay(rec.exchanges.operational);
    setAsked([{ question: Q.operational, outcome: a }]);
    const b = await replay(rec.exchanges.creative);
    setAsked([
      { question: Q.operational, outcome: a },
      { question: Q.creative, outcome: b },
    ]);
    setBusy(false);
    announce(
      'Recorded run: the first question was answered by SQL at zero tokens; the second was routed to the model plane and charged.',
    );
  };

  const last = asked[asked.length - 1] ?? null;
  const budget =
    [...asked].reverse().find((a) => a.outcome.body?.budget)?.outcome.body?.budget ?? null;

  return (
    <article className="sheet-body" aria-labelledby="sheet-title">
      <div className="plan" ref={ref}>
        {width > 0 ? (
          <Plan
            width={width}
            busy={busy}
            asked={asked}
            budget={budget}
            recorded={recorded}
            tenantRef={recorded ? RECORDED.visitor.publicRef : (tenant?.publicRef ?? null)}
          />
        ) : null}
      </div>
      <div className="act">
        {recorded || !tenant ? (
          <button
            type="button"
            className="act__primary"
            onClick={() => void playRecorded()}
            disabled={busy || mode === 'connecting'}
          >
            {busy ? S.busy : S.actionRecorded}
          </button>
        ) : (
          <>
            <button
              type="button"
              className="act__primary"
              onClick={() => void ask(Q.operational)}
              disabled={busy}
            >
              {S.operational}
            </button>
            <button
              type="button"
              className="act__secondary"
              onClick={() => void ask(Q.creative)}
              disabled={busy}
            >
              {S.creative}
            </button>
          </>
        )}
        {failed ? (
          <p className="act__note act__note--fail" role="status">
            {COPY.drawing.failure}
          </p>
        ) : null}
      </div>
      <Notes
        items={[
          [
            recorded ? N.request : N.you,
            recorded ? S.youRecorded : last ? `${S.you} “${last.question}”` : S.you,
          ],
          last ? [N.received, S.received] : null,
          last ? [N.did, S.did] : null,
          ...asked.map(
            (a, i) =>
              [
                `${N.result} ${asked.length > 1 ? i + 1 : ''}`.trim(),
                <>
                  “{a.question}” →{' '}
                  <strong className={a.outcome.body?.route === 'model-plane' ? 'refused' : ''}>
                    {a.outcome.body?.route === 'data-plane' ? S.dataPlane : S.modelPlane}
                  </strong>
                  , {a.outcome.body?.tokensCharged ?? 0} {S.tokens}, {fmtMs(a.outcome.ms)}{' '}
                  {measuredBy(a.outcome)}. {S.answer}: {a.outcome.body?.answer}
                </>,
              ] as [string, React.ReactNode],
          ),
          last ? [N.why, S.why] : null,
          last?.outcome.body?.intent
            ? [N.proof, <code key="sql">{last.outcome.body.intent.sql}</code>]
            : null,
        ]}
      />
      {asked.length ? (
        <Evidence>
          <h4>{COPY.drawing.exchangesHeading}</h4>
          <ul className="xlines">
            {asked.map((a, i) => (
              <ExchangeLine key={i} method="POST" path="/v1/demos/ai/ask" outcome={a.outcome} />
            ))}
          </ul>
          <dl className="ev">
            {asked.map((a, i) => (
              <div key={i}>
                <dt>“{a.question}”</dt>
                <dd>
                  route {a.outcome.body?.route}; estimated {a.outcome.body?.estimatedTokens} tokens,
                  charged {a.outcome.body?.tokensCharged}.{' '}
                  {a.outcome.body?.intent ? (
                    <>
                      {S.sql}: <code>{a.outcome.body.intent.sql}</code>.{' '}
                    </>
                  ) : null}
                  Model plane: {a.outcome.body?.modelPlane.provider}
                  {a.outcome.body?.modelPlane.available ? '' : ', not available'}.{' '}
                  {a.outcome.body?.costNote}
                </dd>
              </div>
            ))}
          </dl>
        </Evidence>
      ) : null}
    </article>
  );
}

function Plan({
  width,
  busy,
  asked,
  budget,
  recorded,
  tenantRef,
}: {
  width: number;
  busy: boolean;
  asked: Asked[];
  budget: api.AskResult['budget'];
  recorded: boolean;
  tenantRef: string | null;
}) {
  const compact = width < 620;
  const top = 26;
  const yours = compact
    ? { x: 1, y: top, w: width - 2, h: 96 }
    : { x: 1, y: top, w: Math.round(width * 0.24), h: 220 };
  const router = compact
    ? { x: Math.round(width / 2), y: top + 96 + 42 }
    : { x: yours.w + Math.round(width * 0.1), y: top + 120 };
  const data = compact
    ? { x: 1, y: router.y + 46, w: Math.round(width * 0.46), h: 70 }
    : { x: router.x + 90, y: top, w: width - router.x - 91, h: 82 };
  const model = compact
    ? {
        x: Math.round(width * 0.52),
        y: router.y + 46,
        w: width - Math.round(width * 0.52) - 1,
        h: 70,
      }
    : { x: router.x + 170, y: top + 168, w: width - router.x - 171, h: 92 };
  const scaleY = compact ? model.y + model.h + 46 : top + 260 + 40;
  const height = scaleY + 40;
  const used = asked.map((a) => a.outcome.body?.route);

  const toData = compact
    ? `M ${router.x} ${router.y} L ${data.x + data.w / 2} ${data.y}`
    : `M ${router.x} ${router.y} L ${router.x + 40} ${data.y + data.h / 2} L ${data.x} ${data.y + data.h / 2}`;
  const toModel = compact
    ? `M ${router.x} ${router.y} L ${model.x + model.w / 2} ${model.y}`
    : `M ${router.x} ${router.y} L ${router.x + 60} ${model.y + model.h / 2} L ${model.x} ${model.y + model.h / 2}`;
  const from = compact ? { x: router.x, y: yours.y + yours.h } : { x: yours.w + 1, y: router.y };
  const scaleX0 = compact ? 1 : model.x;
  const scaleX1 = width - 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`Router with two routes: data plane at zero tokens, model plane charged against a budget.${budget ? ` Budget used: ${budget.tokensUsed} of ${budget.tokensLimit} tokens.` : ''}`}
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
        x={data.x}
        y={data.y}
        w={data.w}
        h={data.h}
        name={S.dataPlane}
        reference={S.free}
        inked={used.includes('data-plane')}
      />
      <Room
        x={model.x}
        y={model.y}
        w={model.w}
        h={model.h}
        name={S.modelPlane}
        reference={S.budget}
        inked={used.includes('model-plane')}
      />
      <Line
        x1={from.x}
        y1={from.y}
        x2={router.x}
        y2={router.y}
        className={asked.length ? 'ln ln--req' : 'ln ln--pencil'}
      />
      {busy ? (
        <Line x1={from.x} y1={from.y} x2={router.x} y2={router.y} className="ln ln--dash" />
      ) : null}
      <circle
        cx={router.x}
        cy={router.y}
        r={9}
        className={`ln ${asked.length ? '' : 'ln--pencil'}`}
      />
      <T
        x={compact ? router.x - 16 : router.x - 14}
        y={compact ? router.y + 4 : router.y + 26}
        anchor="end"
      >
        {S.router}
      </T>
      <Path d={toData} className="ln ln--pencil" />
      <Path d={toModel} className="ln ln--pencil" />
      {used.includes('data-plane') ? <Path d={toData} className="ln ln--req" draft /> : null}
      {used.includes('model-plane') ? <Path d={toModel} className="ln ln--req" draft /> : null}
      {/* the budget scale: the server's own numbers */}
      <g className={budget ? 'scale stamp' : 'scale'}>
        <Line x1={scaleX0} y1={scaleY} x2={scaleX1} y2={scaleY} className="ln ln--fine" />
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <Line
            key={f}
            x1={scaleX0 + (scaleX1 - scaleX0) * f}
            y1={scaleY - 5}
            x2={scaleX0 + (scaleX1 - scaleX0) * f}
            y2={scaleY + 5}
            className="ln ln--fine"
          />
        ))}
        {budget ? (
          <rect
            x={scaleX0}
            y={scaleY - 3}
            width={Math.max(1.5, ((scaleX1 - scaleX0) * budget.tokensUsed) / budget.tokensLimit)}
            height={6}
            className="scale__fill"
          />
        ) : null}
        <T x={scaleX0} y={scaleY - 12} kind="note">
          {S.budget}
          {budget
            ? ` — ${budget.tokensUsed.toLocaleString('en-GB')} ${S.used} / ${budget.tokensLimit.toLocaleString('en-GB')}`
            : ''}
        </T>
        <T x={scaleX1} y={scaleY + 22} kind="note" anchor="end" className="t-pencil">
          {budget ? budget.tokensLimit.toLocaleString('en-GB') : M.fromFirstAnswer}
        </T>
      </g>
      {asked.length ? (
        <T
          x={compact ? 8 : from.x + 10}
          y={compact ? yours.y + yours.h - 12 : router.y - 12}
          kind="num"
        >
          {fmtMs(asked[asked.length - 1]!.outcome.ms)}
        </T>
      ) : null}
    </svg>
  );
}
