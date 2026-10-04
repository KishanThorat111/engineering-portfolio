/**
 * A-101 — Isolation. The signature sheet.
 *
 * The sequence is the system's, step by step:
 *   press        → the request is drawn as a dashed line: in flight, nothing more
 *   403 arrives  → the line inks up to the wall and stops; the wall inks cyan;
 *                  the note is the policy the database actually holds
 *   audit row    → a revision cloud and a numbered row in the title block,
 *                  and only when the database's own audit row has arrived
 *
 * The neighbour is a second tenant this page really provisions, and the
 * target is one of its real records — a fabricated id would produce a 403 that
 * proved nothing.
 */
import { useEffect, useState } from 'react';
import { COPY } from '../../content/copy.ts';
import type * as api from '../../live/api.ts';
import { RECORDED } from '../recorded.ts';
import {
  call,
  isolationTarget,
  recordedIsolation,
  replay,
  replayAudit,
  startOf,
  syncAudit,
  unreachable,
  type IsolationTarget,
  type Outcome,
} from '../demos.ts';
import { useDrawing, type Mode, type Tenant } from '../store.ts';
import {
  Dimension,
  Evidence,
  ExchangeLine,
  Leader,
  Line,
  Notes,
  RecordRow,
  RevisionCloud,
  Room,
  T,
  fmtMs,
  measuredBy,
  useWidth,
} from '../parts.tsx';

const S = COPY.drawing.sheets.isolation;
const N = COPY.drawing.note;
const M = COPY.drawing.misc;

type Phase = 'idle' | 'preparing' | 'sent' | 'refused' | 'breached' | 'failed';

export function IsolationSheet({ mode, tenant }: { mode: Mode; tenant: Tenant | null }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [phase, setPhase] = useState<Phase>('idle');
  const [run, setRun] = useState(0);
  const [target, setTarget] = useState<IsolationTarget | null>(null);
  const [attempt, setAttempt] = useState<Outcome<{ error?: { message: string } }> | null>(null);
  const [inspection, setInspection] = useState<Outcome<api.Inspection> | null>(null);
  const [revBase, setRevBase] = useState<number | null>(null);
  const revisions = useDrawing((s) => s.revisions);
  const announce = useDrawing((s) => s.announce);

  const recorded = mode === 'recorded';
  const rev =
    revBase === null
      ? null
      : (revisions
          .slice(revBase)
          .find((r) => r.action === 'record.read' && r.outcome === 'denied') ?? null);

  useEffect(() => {
    if (rev && phase === 'refused') {
      announce(
        `${rev.via === 'recorded' ? 'Recorded audit row' : 'Audit row written by the database'}: revision ${rev.rev}, record read denied.`,
      );
    }
  }, [rev, phase, announce]);

  const go = async () => {
    setRun((r) => r + 1);
    setAttempt(null);
    setInspection(null);
    setRevBase(useDrawing.getState().revisions.length);

    if (recorded || !tenant) {
      const rec = RECORDED.demos.isolation;
      setTarget(recordedIsolation);
      setPhase('sent');
      const a = await replay(rec.exchanges.attempt);
      setAttempt(a);
      setPhase('refused');
      announce(`Recorded exchange: refused with HTTP ${a.status} in ${fmtMs(a.ms)}.`);
      void replayAudit(rec.audit, startOf(rec.exchanges.attempt));
      setInspection(await replay(rec.exchanges.inspect));
      return;
    }

    setPhase('preparing');
    const t = await isolationTarget();
    if (!t) {
      setPhase('failed');
      return;
    }
    setTarget(t);
    setPhase('sent');
    const a = await call<{ error?: { message: string } }>(
      'GET',
      `/v1/records/${t.target}`,
      tenant.apiKey,
    );
    setAttempt(a);
    if (unreachable(a)) {
      setPhase('failed');
      return;
    }
    if (a.status === 200) {
      setPhase('breached');
      announce(S.isolationFailure);
      return;
    }
    setPhase('refused');
    announce(
      `Refused at the tenant boundary: HTTP ${a.status} in ${fmtMs(a.ms)}, measured in this browser.`,
    );
    setInspection(
      await call<api.Inspection>('GET', `/v1/demos/isolation/inspect/${t.target}`, tenant.apiKey),
    );
    if (mode === 'partial') await syncAudit(tenant.apiKey);
  };

  const busy = phase === 'preparing' || phase === 'sent';
  const policy = inspection?.body?.policy?.policies?.[0] ?? null;
  const yourRef = recorded ? RECORDED.visitor.publicRef : (tenant?.publicRef ?? null);
  const yourRecords = recorded ? RECORDED.visitor.seededRecords : (tenant?.records ?? 0);

  return (
    <article className="sheet-body" aria-labelledby="sheet-title">
      <div className="plan" ref={ref}>
        {width > 0 ? (
          <Plan
            key={run}
            width={width}
            phase={phase}
            yourRef={yourRef}
            yourRecords={yourRecords ?? 0}
            yourName={recorded ? COPY.drawing.misc.recordedRoom : S.yours}
            target={target}
            attempt={attempt}
            policy={policy}
            forced={inspection?.body?.policy?.rlsForced ?? null}
            rev={rev?.rev ?? null}
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
        {phase === 'failed' ? (
          <p className="act__note act__note--fail" role="status">
            {COPY.drawing.failure}
          </p>
        ) : null}
      </div>

      <Notes
        items={[
          [recorded ? N.request : N.you, recorded ? S.youRecorded : S.you],
          phase !== 'idle' ? [N.received, S.received] : null,
          attempt ? [N.did, S.did] : null,
          attempt && phase === 'refused'
            ? [
                N.result,
                <>
                  <strong className="refused">
                    {S.refused} — HTTP {attempt.status}
                  </strong>{' '}
                  in {fmtMs(attempt.ms)}, {measuredBy(attempt)}. “{attempt.body?.error?.message}”
                </>,
              ]
            : null,
          phase === 'breached'
            ? [N.result, <strong className="refused">{S.isolationFailure}</strong>]
            : null,
          attempt && phase === 'refused' ? [N.why, S.why] : null,
          attempt && phase === 'refused'
            ? [
                N.proof,
                rev ? (
                  <>
                    REV {rev.rev} — <code>record.read</code> denied,{' '}
                    {rev.via === 'socket'
                      ? M.viaSocket
                      : rev.via === 'http'
                        ? M.viaHttp
                        : M.viaRecorded}
                    .
                  </>
                ) : (
                  M.waitingAudit
                ),
              ]
            : null,
        ]}
      />

      {attempt ? (
        <Evidence>
          <h4>{COPY.drawing.exchangesHeading}</h4>
          <ul className="xlines">
            <ExchangeLine
              method="GET"
              path={`/v1/records/${target?.target ?? ''}`}
              outcome={attempt}
            />
            {inspection ? (
              <ExchangeLine
                method="GET"
                path={`/v1/demos/isolation/inspect/${target?.target ?? ''}`}
                outcome={inspection}
              />
            ) : null}
          </ul>
          {inspection?.body ? <InspectionDetail inspection={inspection.body} /> : null}
        </Evidence>
      ) : null}
    </article>
  );
}

function InspectionDetail({ inspection }: { inspection: api.Inspection }) {
  return (
    <dl className="ev">
      <dt>{S.layerScope}</dt>
      <dd>
        {inspection.layers.orgScope.mechanism} — refused:{' '}
        {String(inspection.layers.orgScope.refused)}
      </dd>
      <dt>{S.layerRls}</dt>
      <dd>
        {inspection.layers.rowLevelSecurity.mechanism} — refused:{' '}
        {String(inspection.layers.rowLevelSecurity.refused)}
      </dd>
      <dt>{S.predicate}</dt>
      <dd>
        <code>
          {inspection.policy.table}: {inspection.policy.policies[0]?.policyname} USING{' '}
          {inspection.policy.policies[0]?.qual}
        </code>
        <br />
        RLS enabled: {String(inspection.policy.rlsEnabled)} · forced:{' '}
        {String(inspection.policy.rlsForced)}
      </dd>
      <dt>{S.attempted}</dt>
      <dd>
        <code>{inspection.attempt.sql}</code>
        <br />
        tenant from: {inspection.attempt.orgIdSource}
      </dd>
      <dt>{S.branch}</dt>
      <dd>
        <code>
          {inspection.branch.file} — {inspection.branch.condition} → {inspection.branch.statusCode}{' '}
          {inspection.branch.code}
        </code>
      </dd>
      <dt>{S.plan}</dt>
      <dd>
        <pre>{JSON.stringify(inspection.queryPlan, null, 2)}</pre>
      </dd>
      <dt>{M.disclosure}</dt>
      <dd>
        {inspection.disclosure.productionParity} {inspection.disclosure.statusCodeChoice}
      </dd>
    </dl>
  );
}

/* --- the plan ------------------------------------------------------------ */

function Plan({
  width,
  phase,
  yourRef,
  yourRecords,
  yourName,
  target,
  attempt,
  policy,
  forced,
  rev,
}: {
  width: number;
  phase: Phase;
  yourRef: string | null;
  yourRecords: number;
  yourName: string;
  target: IsolationTarget | null;
  attempt: Outcome<unknown> | null;
  policy: { policyname: string; qual: string | null } | null;
  forced: boolean | null;
  rev: number | null;
}) {
  const compact = width < 620;
  const refused = phase === 'refused';
  const inFlight = phase === 'sent' || phase === 'preparing';
  const answered = refused || phase === 'breached';
  const wallT = 12;

  if (compact) {
    const pad = 1;
    const roomH = 150;
    const yours = { x: pad, y: 26, w: width - pad * 2, h: roomH };
    const wallY = yours.y + yours.h;
    const theirs = { x: pad, y: wallY + wallT, w: width - pad * 2, h: roomH };
    const lx = Math.round(width * 0.66);
    const sy = yours.y + 104;
    const ty = theirs.y + 96;
    const noteY = theirs.y + theirs.h + 34;
    const height = answered ? noteY + 76 : theirs.y + theirs.h + 14;
    return (
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={planLabel(phase, attempt)}
      >
        <Room
          x={yours.x}
          y={yours.y}
          w={yours.w}
          h={yours.h}
          name={yourName}
          reference={yourRef}
          inked={Boolean(yourRef)}
        />
        <RecordRow x={yours.x + 14} y={yours.y + 54} count={Math.min(yourRecords, 12)} />
        <Wall x={pad} y={wallY} w={width - pad * 2} h={wallT} inked={refused} />
        <T
          x={width - pad - 12}
          y={wallY + wallT + 22}
          anchor="end"
          className={refused ? 't-cyan' : 't-pencil'}
        >
          {S.boundary}
        </T>
        <Room
          x={theirs.x}
          y={theirs.y}
          w={theirs.w}
          h={theirs.h}
          name={S.theirs}
          reference={target?.neighbourRef ?? null}
          inked={Boolean(target)}
        />
        {target ? (
          <RecordRow x={theirs.x + 14} y={theirs.y + 54} count={Math.min(target.records, 12)} />
        ) : null}
        {!target ? (
          <T x={theirs.x + 14} y={theirs.y + 40} kind="note" className="t-pencil">
            {S.notYetCreated}
          </T>
        ) : null}
        <circle cx={lx} cy={sy} r={4} className="dot" />
        <rect
          x={lx - 5}
          y={ty - 5}
          width={10}
          height={10}
          className={`ln ${target ? '' : 'ln--pencil'}`}
        />
        {inFlight || answered ? (
          <Line x1={lx} y1={sy} x2={lx} y2={ty} className="ln ln--dash" />
        ) : null}
        {refused ? (
          <>
            <Line x1={lx} y1={sy} x2={lx} y2={wallY} className="ln ln--req" draft />
            <Line
              x1={lx - 9}
              y1={wallY - 2}
              x2={lx + 9}
              y2={wallY - 2}
              className="ln ln--stop stamp"
            />
            {attempt ? (
              <Dimension
                from={sy}
                to={wallY}
                at={lx - 26}
                vertical
                label={fmtMs(attempt.ms)}
                sub={measuredBy(attempt as Outcome<unknown>)}
              />
            ) : null}
            <Note
              x={pad + 4}
              y={noteY}
              status={attempt?.status ?? 403}
              policy={policy}
              forced={forced}
            />
            {rev ? <RevisionCloud x={lx - 22} y={wallY - 26} w={44} h={32} rev={rev} /> : null}
          </>
        ) : null}
      </svg>
    );
  }

  const height = Math.round(Math.min(Math.max(width * 0.36, 310), 400));
  const pad = 1;
  const wallX = Math.round(width * 0.5);
  const top = 30;
  const roomH = height - top - 16;
  const yours = { x: pad, y: top, w: wallX - wallT / 2 - pad, h: roomH };
  const theirs = { x: wallX + wallT / 2, y: top, w: width - pad - (wallX + wallT / 2), h: roomH };
  const ly = Math.round(top + roomH * 0.56);
  const sx = Math.round(yours.x + yours.w * 0.3);
  const tx = Math.round(theirs.x + theirs.w * 0.72);
  const face = wallX - wallT / 2;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={planLabel(phase, attempt)}
    >
      <Room
        x={yours.x}
        y={yours.y}
        w={yours.w}
        h={yours.h}
        name={yourName}
        reference={yourRef}
        inked={Boolean(yourRef)}
      />
      <RecordRow x={yours.x + 14} y={yours.y + 56} count={Math.min(yourRecords, 16)} />
      <T x={yours.x + 14} y={yours.y + 84} kind="note">
        {yourRecords} {S.records}
      </T>
      <Room
        x={theirs.x}
        y={theirs.y}
        w={theirs.w}
        h={theirs.h}
        name={S.theirs}
        reference={target?.neighbourRef ?? null}
        inked={Boolean(target)}
      />
      {target ? (
        <>
          <RecordRow x={theirs.x + 14} y={theirs.y + 56} count={Math.min(target.records, 16)} />
          <T x={theirs.x + 14} y={theirs.y + 84} kind="note">
            {target.records} {S.records}
          </T>
        </>
      ) : (
        <T x={theirs.x + 14} y={theirs.y + 62} kind="note" className="t-pencil">
          {S.notYetCreated}
        </T>
      )}
      <Wall x={face} y={top - 8} w={wallT} h={roomH + 16} inked={refused} />
      <T x={wallX} y={top - 14} anchor="middle" className={refused ? 't-cyan' : 't-pencil'}>
        {S.boundary}
      </T>

      <circle cx={sx} cy={ly} r={4} className="dot" />
      <T x={sx} y={ly + 20} kind="note" anchor="middle">
        {M.yourKey}
      </T>
      <rect
        x={tx - 5}
        y={ly - 5}
        width={10}
        height={10}
        className={`ln ${target ? '' : 'ln--pencil'}`}
      />
      {target ? (
        <T x={tx} y={ly + 22} kind="note" anchor="middle">
          {M.theirRecord}
        </T>
      ) : null}

      {inFlight || answered ? (
        <>
          <Line x1={sx} y1={ly} x2={tx} y2={ly} className="ln ln--dash" />
          {inFlight ? (
            <T x={(sx + face) / 2} y={ly - 10} kind="note" anchor="middle">
              {COPY.drawing.pending}
            </T>
          ) : null}
        </>
      ) : null}

      {refused ? (
        <>
          <Line x1={sx} y1={ly} x2={face} y2={ly} className="ln ln--req" draft />
          <Line
            x1={face - 2}
            y1={ly - 10}
            x2={face - 2}
            y2={ly + 10}
            className="ln ln--stop stamp"
          />
          {attempt ? (
            <Dimension
              from={sx}
              to={face}
              at={ly - 46}
              label={fmtMs(attempt.ms)}
              sub={measuredBy(attempt)}
            />
          ) : null}
          <Leader x1={face + wallT + 2} y1={ly + 6} x2={face + wallT + 34} y2={ly + 54} />
          <Note
            x={face + wallT + 58}
            y={ly + 50}
            status={attempt?.status ?? 403}
            policy={policy}
            forced={forced}
          />
          {rev ? <RevisionCloud x={face - 40} y={ly - 28} w={wallT + 80} h={56} rev={rev} /> : null}
        </>
      ) : null}
      {phase === 'breached' ? (
        <Line x1={sx} y1={ly} x2={tx} y2={ly} className="ln ln--stop" draft />
      ) : null}
    </svg>
  );
}

function Wall({
  x,
  y,
  w,
  h,
  inked,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  inked: boolean;
}) {
  return (
    <g className={inked ? 'wall wall--ink' : 'wall'}>
      <rect x={x} y={y} width={w} height={h} className="wall__hatch" />
      <rect x={x} y={y} width={w} height={h} className="wall__poche" />
      <rect x={x} y={y} width={w} height={h} className="ln ln--wall" />
    </g>
  );
}

function Note({
  x,
  y,
  status,
  policy,
  forced,
  keyed = false,
}: {
  x: number;
  y: number;
  status: number;
  policy: { policyname: string; qual: string | null } | null;
  forced: boolean | null;
  keyed?: boolean;
}) {
  return (
    <g className="note stamp">
      <T x={x} y={y} className="t-red">
        {keyed ? '1 — ' : ''}
        {S.refused} · HTTP {status}
      </T>
      {policy ? (
        <>
          <T x={x} y={y + 20} kind="mono">
            {S.policy} {policy.policyname}
          </T>
          <T x={x} y={y + 38} kind="mono">
            {policy.qual}
          </T>
          {forced !== null ? (
            <T x={x} y={y + 56} kind="note">
              {forced ? S.forced : M.notForced}
            </T>
          ) : null}
        </>
      ) : (
        <T x={x} y={y + 20} kind="note" className="t-pencil">
          {M.readingPolicy}
        </T>
      )}
    </g>
  );
}

function planLabel(phase: Phase, attempt: Outcome<unknown> | null): string {
  if (phase === 'refused' && attempt) {
    return `Plan of two tenants divided by a boundary wall. The request from your tenant stopped at the wall: HTTP ${attempt.status} in ${fmtMs(attempt.ms)}.`;
  }
  if (phase === 'sent' || phase === 'preparing')
    return 'Plan of two tenants. A request is in flight toward the other tenant.';
  return 'Plan of two tenants, yours and another, divided by a boundary wall.';
}
