/**
 * The interface halves of stations 04–10.
 *
 * Held in one module because they share one shape: chrome, a hero in the left
 * column, and one or two instrument panels. Seven near-identical files would
 * make the differences between them harder to see, not easier — and the whole
 * risk at this point in the build is stations drifting apart.
 *
 * Every one of them uses `StationChrome`, the shared hero classes from
 * `enter.css`, and `InstrumentPanel`. Nothing here invents a new interface
 * language; the stations differ in what they SAY, not in how they are built.
 */
import { COPY } from '../content/copy.ts';
import { InstrumentPanel } from '../kit/InstrumentPanel.tsx';
import { Sparkline } from '../kit/Sparkline.tsx';
import { PALETTE } from '../render/shaders.ts';
import { StationChrome } from './StationChrome.tsx';
import type { StationId } from '../kit/stations.ts';
import { STAGES } from './DataScene.tsx';
import { ZONES } from './LabScene.tsx';
import { REGIONS } from './LiveScene.tsx';
import { DRAWERS, ARCHIVE_TOTAL } from './ProofScene.tsx';
import { SITE_LINKS } from './links.ts';

type Base = {
  source: 'live' | 'replay' | 'unknown';
  activeStation: StationId;
  onStation?: (id: StationId) => void;
};

/** Left-column hero, shared by every station from 04 on. */
function Hero({
  eyebrow,
  lead,
  emphasis,
  tail,
  subline,
  note,
  className,
}: {
  eyebrow: string;
  lead: string;
  emphasis?: string;
  tail?: string;
  subline: string;
  note?: string;
  className?: string;
}) {
  return (
    <div className={`enter__hero station__hero${className ? ` ${className}` : ''}`}>
      <p className="station__eyebrow">{eyebrow}</p>
      <h2 className="enter__claim station__claim">
        <span className="enter__claim-line">{lead}</span>
        {emphasis ? (
          <span className="enter__claim-line enter__claim-line--emphasis">{emphasis}</span>
        ) : null}
        {tail ? <span className="enter__claim-line">{tail}</span> : null}
      </h2>
      <p className="enter__subline">{subline}</p>
      {note ? <p className="station__note">{note}</p> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ 04 */

export function DataOverlay({
  source,
  activeStation,
  onStation,
  hopMs,
  denied,
}: Base & { hopMs: Record<string, number | null>; denied: boolean }) {
  const D = COPY.data;
  const timed = Object.values(hopMs).filter((v): v is number => v !== null);
  const total = timed.length > 0 ? timed.reduce((a, b) => a + b, 0) : null;

  return (
    <div className="enter station">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />
      <Hero
        eyebrow={D.eyebrow}
        lead={D.claimLead}
        emphasis={D.claimEmphasis}
        tail={D.claimTail}
        subline={D.subline}
        note={D.note}
      />

      <div className="station__rail">
        <InstrumentPanel
          title={D.trace}
          tone={denied ? PALETTE.danger : PALETTE.green}
          source={source}
          readings={[
            { label: 'Total', value: total === null ? null : `${total}ms` },
            { label: 'Outcome', value: denied ? 'refused' : total === null ? null : 'allowed' },
          ]}
        >
          <ul className="station__hops">
            {STAGES.map((stage) => {
              const ms = hopMs[stage.id];
              const known = ms !== undefined && ms !== null;
              return (
                <li key={stage.id}>
                  <span
                    className="station__hop-dot"
                    data-timed={known ? 'true' : 'false'}
                    aria-hidden="true"
                  />
                  <span className="station__hop-label">{stage.label}</span>
                  <span className="station__hop-time" data-known={known ? 'true' : 'false'}>
                    {known ? `${ms}ms` : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
          {denied ? <p className="station__alert">{D.denied}</p> : null}
        </InstrumentPanel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 05 */

export function LabOverlay({
  source,
  activeStation,
  onStation,
  frameMs,
  points,
  tier,
  active,
  onZone,
  frameSeries,
}: Base & {
  frameMs: number | null;
  points: number;
  tier: number;
  active: string | null;
  onZone?: (id: string | null) => void;
  frameSeries: number[];
}) {
  const L = COPY.lab;
  return (
    <div className="enter station">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />
      <Hero
        eyebrow={L.eyebrow}
        lead={L.claimLead}
        emphasis={L.claimEmphasis}
        tail={L.claimTail}
        subline={L.subline}
        note={L.note}
      />

      <div className="station__rail">
        <InstrumentPanel
          title={L.telemetryTitle}
          tone={PALETTE.green}
          /*
           * ALWAYS 'live', and legitimately so: this panel reports the renderer
           * measuring itself. It needs no control plane and cannot be stale.
           */
          source="live"
          readings={[
            { label: L.frameTime, value: frameMs === null ? null : `${frameMs.toFixed(1)}ms` },
            { label: L.points, value: points.toLocaleString('en-GB') },
            { label: L.tier, value: String(tier) },
          ]}
        >
          <Sparkline
            samples={frameSeries}
            colour={PALETTE.green}
            width={190}
            height={30}
            label={`Frame time, ${frameSeries.length} samples`}
          />
        </InstrumentPanel>

        <nav className="station__zones" aria-label={L.selectTitle}>
          <p className="station__zones-title">{L.selectTitle}</p>
          {ZONES.map((zone) => (
            <button
              key={zone.id}
              type="button"
              className="station__zone"
              data-active={zone.id === active ? 'true' : 'false'}
              onClick={() => onZone?.(zone.id === active ? null : zone.id)}
            >
              <span
                className="station__zone-dot"
                style={{ background: zone.tone }}
                aria-hidden="true"
              />
              <span className="station__zone-label">{zone.label}</span>
              <span className="station__zone-source">{zone.source}</span>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 06 */

export function LiveOverlay({
  source,
  activeStation,
  onStation,
  edgeRttMs,
  edgePop,
  events,
}: Base & {
  edgeRttMs: number | null;
  edgePop: string | null;
  events: Array<{ id: string; action: string; outcome: string; at: string }>;
}) {
  const L = COPY.live;
  return (
    <div className="enter station">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />
      <Hero
        eyebrow={L.eyebrow}
        lead={L.claimLead}
        emphasis={L.claimEmphasis}
        tail={L.claimTail}
        subline={L.subline}
        note={L.note}
      />

      <div className="station__rail">
        <InstrumentPanel
          title={L.globeTitle}
          tone={PALETTE.green}
          source={source}
          readings={[
            {
              label: L.yourEdge,
              value:
                edgeRttMs === null
                  ? null
                  : `${Math.round(edgeRttMs)}ms${edgePop ? ` · ${edgePop}` : ''}`,
            },
            ...REGIONS.map((r) => ({ label: r.label, value: null })),
          ]}
        />

        <InstrumentPanel title={L.feedTitle} tone={PALETTE.record} source={source}>
          {events.length === 0 ? (
            <p className="station__note station__note--tight">{L.feedEmpty}</p>
          ) : (
            <ul className="station__feed">
              {events.slice(0, 6).map((e) => (
                <li key={e.id}>
                  <span className="station__feed-at">{e.at}</span>
                  <span className="station__feed-action">{e.action}</span>
                  <span
                    className="station__feed-outcome"
                    style={{ color: e.outcome === 'denied' ? PALETTE.danger : PALETTE.green }}
                  >
                    {e.outcome}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </InstrumentPanel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 07 */

/** The orbit diagram. SVG, because it is a flat overlay in screen space. */
function OrbitDiagram({ axes }: { axes: readonly string[] }) {
  return (
    <svg className="think__orbit" viewBox="0 0 420 420" aria-hidden="true" focusable="false">
      {[190, 152, 114, 76].map((r, i) => (
        <circle
          key={r}
          cx="210"
          cy="210"
          r={r}
          fill="none"
          stroke={i % 2 === 0 ? PALETTE.record : PALETTE.structure}
          strokeOpacity={0.3 - i * 0.04}
          strokeWidth="1"
          strokeDasharray={i % 2 === 0 ? '3 7' : undefined}
        />
      ))}
      {axes.map((axis, i) => {
        const angle = (i / axes.length) * Math.PI * 2 - Math.PI / 2;
        const x = 210 + Math.cos(angle) * 190;
        const y = 210 + Math.sin(angle) * 190;
        return (
          <g key={axis}>
            <line x1="210" y1="210" x2={x} y2={y} stroke={PALETTE.structure} strokeOpacity="0.18" />
            <circle cx={x} cy={y} r="3" fill={PALETTE.record} fillOpacity="0.8" />
          </g>
        );
      })}
    </svg>
  );
}

export function ThinkOverlay({ source, activeStation, onStation }: Base) {
  const T = COPY.think;
  return (
    <div className="enter station think">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />

      <div className="enter__hero station__hero think__hero">
        <p className="station__eyebrow">{T.eyebrow}</p>
        {/* The set's one serif moment. Judgment reads differently from systems. */}
        <h2 className="think__claim">
          <span>{T.claimLead}</span>
          <span className="think__claim-em">{T.claimEmphasis}</span>
        </h2>
        <p className="enter__subline">{T.subline}</p>
      </div>

      <div className="think__diagram" aria-hidden="true">
        <OrbitDiagram axes={T.axes} />
        <ul className="think__axes">
          {T.axes.map((axis, i) => (
            <li key={axis} data-index={i}>
              {axis}
            </li>
          ))}
        </ul>
      </div>

      <div className="think__lower">
        <section className="think__held">
          <h2 className="station__panel-title">{T.heldTitle}</h2>
          <ol>
            {T.held.map((line, i) => (
              <li key={line}>
                <span className="think__held-num">{i + 1}</span>
                {line}
              </li>
            ))}
          </ol>
        </section>

        <section className="think__wrong">
          <h2 className="station__panel-title">{T.wrongTitle}</h2>
          <ul>
            <li>I shipped a hospital-production system without an automated test suite.</li>
            <li>I documented a compliance behaviour before automating it.</li>
          </ul>
          <p className="station__note station__note--tight">{T.wrongNote}</p>
          <a className="station__link" href="/engineering">
            Read both
          </a>
        </section>

        {/* Rule 9: the missing portrait is disclosed, not quietly skipped. */}
        <p className="think__pending">{T.portraitPending}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 08 */

export function BuildOverlay({ source, activeStation, onStation }: Base) {
  const B = COPY.build;
  return (
    <div className="enter station">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />
      <Hero
        eyebrow={B.eyebrow}
        lead={B.claimLead}
        emphasis={B.claimEmphasis}
        tail={B.claimTail}
        subline={B.subline}
      />

      <div className="station__actions">
        <a className="enter__action" href={`mailto:${SITE_LINKS.email}`}>
          {B.action}
          <span aria-hidden="true">→</span>
        </a>
        <p className="station__available">
          <span className="station__available-dot" aria-hidden="true" />
          {B.availableFor}
          <strong>{SITE_LINKS.availability}</strong>
        </p>
        <ul className="station__links">
          {SITE_LINKS.profiles.map((link) => (
            <li key={link.label}>
              <a href={link.href}>{link.label}</a>
            </li>
          ))}
        </ul>
      </div>

      <div className="station__rail">
        <InstrumentPanel
          title={B.stateLabel}
          tone={PALETTE.record}
          readings={[{ label: 'State', value: B.stateValue }]}
        >
          <p className="station__note station__note--tight">{B.stateNote}</p>
        </InstrumentPanel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 09 */

export function ProofOverlay({
  source,
  activeStation,
  onStation,
  open,
  onOpen,
}: Base & { open: string | null; onOpen?: (id: string | null) => void }) {
  const P = COPY.proof;
  return (
    <div className="enter station">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />
      <Hero
        eyebrow={P.eyebrow}
        lead={P.claimLead}
        emphasis={P.claimEmphasis}
        tail={P.claimTail}
        subline={P.subline}
      />

      <div className="station__rail station__rail--wide">
        <InstrumentPanel
          title={P.archiveTitle}
          tone={PALETTE.record}
          readings={[{ label: P.totalLabel, value: String(ARCHIVE_TOTAL) }]}
        >
          <ul className="proof__drawers">
            {DRAWERS.map((drawer) => (
              <li key={drawer.id}>
                <button
                  type="button"
                  className="proof__drawer"
                  data-open={drawer.id === open ? 'true' : 'false'}
                  onClick={() => onOpen?.(drawer.id === open ? null : drawer.id)}
                >
                  <span className="proof__drawer-index">{drawer.index}</span>
                  <span className="proof__drawer-label">{drawer.label}</span>
                  <span className="proof__drawer-count">{drawer.count}</span>
                </button>
                {drawer.id === open && drawer.href ? (
                  <a className="station__link proof__drawer-link" href={drawer.href}>
                    {P.openDrawer}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
          <p className="station__note station__note--tight">{P.note}</p>
        </InstrumentPanel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ 10 */

export function EndOverlay({
  source,
  activeStation,
  onStation,
  visited,
}: Base & { visited: string[] }) {
  const E = COPY.end;
  return (
    <div className="enter station end">
      <StationChrome source={source} activeStation={activeStation} onStation={onStation} />

      <div className="enter__hero station__hero end__hero">
        <p className="station__eyebrow">{E.eyebrow}</p>
        <h2 className="enter__claim station__claim">
          <span className="enter__claim-line">{E.claimLead}</span>
          <span className="enter__claim-line enter__claim-line--emphasis">{E.claimEmphasis}</span>
        </h2>
        <p className="enter__subline">{E.subline}</p>

        <div className="end__state">
          <span>
            <em>{E.systemLabel}</em>
            {E.systemValue}
          </span>
          <span>
            <em>{E.nextLabel}</em>
            <strong>{E.nextValue}</strong>
          </span>
        </div>

        <a className="enter__action" href={`mailto:${SITE_LINKS.email}`}>
          {E.action}
          <span aria-hidden="true">→</span>
        </a>
      </div>

      <footer className="end__footer">
        <p className="end__closing">{E.closing}</p>
        <p className="end__identity">
          <strong>{SITE_LINKS.name}</strong>
          <span>{SITE_LINKS.role}</span>
        </p>
        <p className="end__visited">
          <em>{E.visitedTitle}</em>
          {visited.length === 0 ? E.visitedNone : visited.join(' · ')}
        </p>
      </footer>
    </div>
  );
}
