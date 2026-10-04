/**
 * A-104 — Duplicate evidence. The fingerprint is drawn from the digest the
 * SERVER computed and returned; every square is one of its 256 bits. The
 * second submission's fingerprint is drawn beside the first only once the
 * server has answered 409, and it is the same picture because it is the same
 * number.
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
  DigestGlyph,
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

const S = COPY.drawing.sheets.fraud;
const N = COPY.drawing.note;
const M = COPY.drawing.misc;
/** A tiny deterministic image: the same bytes every time, so the digest collides. */
const EVIDENCE_BYTES = 'a2lzaGFuLXRob3JhdC1kZW1vLWV2aWRlbmNlLXBob3Rv';
const PATH = '/v1/demos/fraud/evidence';

export function FraudSheet({ mode, tenant }: { mode: Mode; tenant: Tenant | null }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [first, setFirst] = useState<Outcome<api.Evidence> | null>(null);
  const [second, setSecond] = useState<Outcome<api.Evidence> | null>(null);
  const [run, setRun] = useState(0);
  const announce = useDrawing((s) => s.announce);
  const recorded = mode === 'recorded';

  const go = async () => {
    setRun((r) => r + 1);
    setFirst(null);
    setSecond(null);
    setFailed(false);
    setBusy(true);
    if (recorded || !tenant) {
      const rec = RECORDED.demos.fraud;
      void replayAudit(rec.audit, startOf(rec.exchanges.first));
      setFirst(await replay(rec.exchanges.first));
      const s = await replay(rec.exchanges.second);
      setSecond(s);
      announce(
        `Recorded run: the second submission was refused with HTTP ${s.status}, identical fingerprint.`,
      );
    } else {
      const f = await call<api.Evidence>('POST', PATH, tenant.apiKey, {
        label: 'ward 3 clean',
        imageBase64: EVIDENCE_BYTES,
      });
      if (unreachable(f)) {
        setFailed(true);
        setBusy(false);
        return;
      }
      setFirst(f);
      const s = await call<api.Evidence>('POST', PATH, tenant.apiKey, {
        label: 'a different job',
        imageBase64: EVIDENCE_BYTES,
      });
      if (unreachable(s)) {
        setFailed(true);
        setBusy(false);
        return;
      }
      setSecond(s);
      announce(`The second submission was refused with HTTP ${s.status}: identical fingerprint.`);
      if (mode === 'partial') await syncAudit(tenant.apiKey);
    }
    setBusy(false);
  };

  // A tenant that has already submitted this photo gets a duplicate on the
  // FIRST try too — that is the system remembering, and it is shown as such.
  const digest = second?.body?.digest ?? first?.body?.digest ?? null;

  return (
    <article className="sheet-body" aria-labelledby="sheet-title">
      <div className="plan" ref={ref}>
        {width > 0 ? (
          <Plan
            key={run}
            width={width}
            busy={busy}
            first={first}
            second={second}
            digest={digest}
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
          busy || first ? [N.received, S.received] : null,
          second ? [N.did, S.did] : null,
          second
            ? [
                N.result,
                <>
                  First: {first?.body?.outcome} (HTTP {first?.status}).{' '}
                  <strong className="refused">
                    Second: {S.duplicate.toLowerCase()} — HTTP {second.status}
                  </strong>{' '}
                  in {fmtMs(second.ms)}, {measuredBy(second)}.
                </>,
              ]
            : null,
          second ? [N.why, S.why] : null,
          second?.body?.collidedWith
            ? [
                N.proof,
                <>
                  {S.digest} <code>{second.body.digest}</code> matches the submission on file from{' '}
                  {new Date(second.body.collidedWith.submitted_at).toISOString().slice(11, 19)} UTC.
                </>,
              ]
            : null,
        ]}
      />
      {second ? (
        <Evidence>
          <h4>{COPY.drawing.exchangesHeading}</h4>
          <ul className="xlines">
            {first ? (
              <ExchangeLine method="POST" path={`${PATH}  (first)`} outcome={first} />
            ) : null}
            <ExchangeLine method="POST" path={`${PATH}  (second)`} outcome={second} />
          </ul>
          {second.body?.mechanism ? (
            <dl className="ev">
              <dt>{S.digest}</dt>
              <dd>
                <code>{second.body.digest}</code>
              </dd>
              <dt>{M.algorithm}</dt>
              <dd>{second.body.mechanism.algorithm}</dd>
              <dt>{M.decidedBy}</dt>
              <dd>{second.body.mechanism.authority}</dd>
              <dt>{M.stored}</dt>
              <dd>{second.body.mechanism.storage}</dd>
              <dt>{M.why}</dt>
              <dd>{second.body.mechanism.why}</dd>
            </dl>
          ) : null}
        </Evidence>
      ) : null}
    </article>
  );
}

function Plan({
  width,
  busy,
  first,
  second,
  digest,
  recorded,
  tenantRef,
}: {
  width: number;
  busy: boolean;
  first: Outcome<api.Evidence> | null;
  second: Outcome<api.Evidence> | null;
  digest: string | null;
  recorded: boolean;
  tenantRef: string | null;
}) {
  const compact = width < 620;
  const top = 26;
  const g = compact ? 4 : 5;
  const glyph = 16 * g;
  const yours = compact
    ? { x: 1, y: top, w: width - 2, h: 120 }
    : { x: 1, y: top, w: Math.round(width * 0.3), h: 250 };
  const reg = compact
    ? { x: 1, y: top + 120 + 46, w: width - 2, h: glyph + 120 }
    : { x: Math.round(width * 0.42), y: top, w: width - Math.round(width * 0.42) - 1, h: 250 };
  const height = compact ? reg.y + reg.h + 16 : top + 250 + 20;
  const photo = compact ? { x: 20, y: top + 54 } : { x: 24, y: top + 70 };
  const slot1 = compact ? { x: reg.x + 18, y: reg.y + 54 } : { x: reg.x + 28, y: reg.y + 72 };
  const slot2 = compact
    ? { x: reg.x + glyph + 74, y: reg.y + 54 }
    : { x: reg.x + glyph + 120, y: reg.y + 72 };
  const entry = compact ? { x: width / 2, y: reg.y } : { x: reg.x, y: top + 125 };

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={
        second
          ? `Register: the second submission carries the identical fingerprint and was refused with HTTP ${second.status}.`
          : 'Plan: your photo, and the register of fingerprints.'
      }
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
      {/* the photo: a frame with a horizon, drawn as a symbol */}
      <g className="photo">
        <rect x={photo.x} y={photo.y} width={44} height={34} className="ln" />
        <path
          d={`M ${photo.x + 4} ${photo.y + 28} l 12 -12 l 8 8 l 6 -6 l 10 10`}
          className="ln ln--fine"
        />
        <circle cx={photo.x + 33} cy={photo.y + 9} r={3} className="ln ln--fine" />
      </g>
      <Room
        x={reg.x}
        y={reg.y}
        w={reg.w}
        h={reg.h}
        name={S.register}
        reference={digest ? 'fraud_submission' : null}
        inked={Boolean(first)}
      />
      {busy && !first ? (
        <Line
          x1={photo.x + 44}
          y1={photo.y + 17}
          x2={entry.x}
          y2={entry.y}
          className="ln ln--dash"
        />
      ) : null}
      {first ? (
        <Line
          x1={photo.x + 44}
          y1={photo.y + 17}
          x2={entry.x}
          y2={entry.y}
          className="ln ln--req"
          draft
        />
      ) : null}
      {first?.body?.digest ? (
        <>
          <DigestGlyph x={slot1.x} y={slot1.y} digest={first.body.digest} size={g} />
          <T x={slot1.x - 3} y={slot1.y + glyph + 22}>
            {S.slot}
          </T>
          <T x={slot1.x - 3} y={slot1.y + glyph + 38} kind="note">
            {first.body.outcome === 'accepted'
              ? `${S.accepted} · HTTP ${first.status}`
              : `${M.onFileAlready} · HTTP ${first.status}`}
          </T>
        </>
      ) : null}
      {second?.body?.digest ? (
        <>
          <T
            x={(slot1.x + glyph + slot2.x) / 2}
            y={slot1.y + glyph / 2 + 8}
            kind="title"
            anchor="middle"
            className="t-red stamp"
          >
            =
          </T>
          <DigestGlyph
            x={slot2.x}
            y={slot2.y}
            digest={second.body.digest}
            size={g}
            className="glyph--refused"
          />
          <T x={slot2.x - 3} y={slot2.y + glyph + 22} className="t-red">
            {S.duplicate} · HTTP {second.status}
          </T>
          <T x={slot2.x - 3} y={slot2.y + glyph + 38} kind="note">
            {S.matches}
          </T>
          {!compact ? (
            <T x={slot1.x - 3} y={reg.y + reg.h - 14} kind="mono">
              {S.digest} {second.body.digest.slice(0, 32)}…
            </T>
          ) : null}
        </>
      ) : null}
    </svg>
  );
}
