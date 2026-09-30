/**
 * 03 / DISSECTION. The interface half.
 *
 * Reference 03's composition, reproduced:
 *   left column    eyebrow, display hero, sub-line
 *   left bottom    a live system-health panel with sparklines
 *   right sidebar  the numbered dissection index, system metadata, quick stats
 *   bottom strip   a seven-stage request trace with per-hop timings
 *
 * THE TRACE STRIP IS WHERE THIS FRAME'S HONESTY PROBLEM LIVES
 * The reference prints a confident millisecond figure against all seven hops
 * and a 60ms total. This system times the SPAN, not each hop inside it — six of
 * those seven numbers describe measurements nothing takes. So a stage renders a
 * duration only when one was really recorded, and the others say so rather than
 * carrying a plausible number. That is the difference between a trace and a
 * picture of a trace, and it is the whole reason this station exists.
 */
import { COPY } from '../content/copy.ts';
import { InstrumentPanel } from '../kit/InstrumentPanel.tsx';
import { Sparkline } from '../kit/Sparkline.tsx';
import { PALETTE } from '../render/shaders.ts';
import { STATIONS, type StationId } from '../kit/stations.ts';
import { DISSECTION } from './systems.ts';
import { LAYERS, TRACE_STAGES } from './dissection.ts';

/** One hop of a real span. `durationMs` null means this hop was not timed. */
export type TraceHop = {
  id: string;
  durationMs: number | null;
};

export type DissectionOverlayProps = {
  source: 'live' | 'replay' | 'unknown';
  activeStation: StationId;
  onStation?: (id: StationId) => void;
  /** Real counts from the session. */
  eventCount: number;
  slowestSpanMs: number | null;
  deniedCount: number;
  /** Real measured edge PoP, or null when the edge named none. */
  edgePop: string | null;
  /** Real trend series. Empty draws no line at all. */
  eventSeries: number[];
  /** Real hops of the most recent span, or null when nothing has happened. */
  hops: TraceHop[] | null;
  /** Real total, when the span carried one. */
  totalMs: number | null;
  /** Repository counts, resolved at build time. */
  counts: { migrations: number; tests: number; layers: number; demonstrations: number };
  selectedLayer?: string | null;
  onLayer?: (id: string | null) => void;
};

export function DissectionOverlay({
  source,
  activeStation,
  onStation,
  eventCount,
  slowestSpanMs,
  deniedCount,
  edgePop,
  eventSeries,
  hops,
  totalMs,
  counts,
  selectedLayer = null,
  onLayer,
}: DissectionOverlayProps) {
  const D = COPY.dissection;

  return (
    <div className="enter dissection">
      {/* --- Top rail: the same one, at every station. ----------------- */}
      <header className="enter__top">
        <a className="enter__mark" href="/">
          KT<span aria-hidden="true">.</span>
        </a>
        <nav className="enter__nav" aria-label="Stations">
          <ol>
            {STATIONS.map((station) => (
              <li key={station.id}>
                <button
                  type="button"
                  onClick={() => onStation?.(station.id)}
                  aria-current={station.id === activeStation ? 'true' : undefined}
                >
                  <span className="enter__nav-index">{station.index}</span>
                  <span className="enter__nav-slash" aria-hidden="true">
                    /
                  </span>
                  <span className="enter__nav-name">{station.id}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <div className="enter__status">
          <InstrumentPanel
            title="System status"
            tone={source === 'live' ? PALETTE.green : PALETTE.amber}
            source={source}
          />
        </div>
      </header>

      {/* --- Left column ---------------------------------------------- */}
      <div className="enter__hero dissection__hero">
        <p className="dissection__eyebrow">
          {D.eyebrow}
          <span className="dissection__subject">{D.subject}</span>
        </p>

        <h2 className="enter__claim dissection__claim">
          <span className="enter__claim-line">{D.claimLead}</span>
          <span className="enter__claim-line">
            <em className="dissection__em">{D.claimEmphasis}</em>
          </span>
          <span className="enter__claim-line enter__claim-line--emphasis">{D.claimTail}</span>
        </h2>

        <p className="enter__subline">{D.subline}</p>
        <p className="dissection__note">{D.subjectNote}</p>
      </div>

      {/* --- Left bottom: live system health --------------------------- */}
      <div className="dissection__health">
        <InstrumentPanel title={D.healthTitle} tone={PALETTE.green} source={source}>
          <dl className="dissection__health-rows">
            <div>
              <dt>{D.health.events}</dt>
              <dd>
                <span className="dissection__health-value">{eventCount}</span>
                <Sparkline
                  samples={eventSeries}
                  colour={PALETTE.green}
                  label={`${D.health.events}: ${eventSeries.length} samples`}
                />
              </dd>
            </div>
            <div>
              <dt>{D.health.latency}</dt>
              <dd>
                <span
                  className="dissection__health-value"
                  data-known={slowestSpanMs === null ? 'false' : 'true'}
                >
                  {slowestSpanMs === null ? D.health.unmeasured : `${Math.round(slowestSpanMs)}ms`}
                </span>
              </dd>
            </div>
            <div>
              <dt>{D.health.denied}</dt>
              <dd>
                <span
                  className="dissection__health-value"
                  style={deniedCount > 0 ? { color: PALETTE.danger } : undefined}
                >
                  {deniedCount}
                </span>
              </dd>
            </div>
          </dl>
        </InstrumentPanel>
        <p className="enter__scroll dissection__scroll">
          <span className="enter__scroll-icon" aria-hidden="true" />
          {D.scroll}
        </p>
      </div>

      {/* --- Right sidebar --------------------------------------------- */}
      <aside className="dissection__sidebar">
        <section className="dissection__panel">
          <h2 className="dissection__panel-title">{D.meta.title}</h2>
          <ol className="dissection__index">
            {DISSECTION.map((section) => (
              <li key={section.index}>
                <span
                  className="dissection__index-row"
                  data-active={section.index === '03' ? 'true' : 'false'}
                >
                  <span className="dissection__index-num">{section.index}</span>
                  <span>{section.label}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section className="dissection__panel">
          <dl className="dissection__meta">
            <div>
              <dt>{D.meta.system}</dt>
              <dd className="dissection__meta-strong">{D.subject}</dd>
            </div>
            <div>
              <dt>{D.meta.type}</dt>
              <dd>{D.meta.typeValue}</dd>
            </div>
            <div>
              <dt>{D.meta.status}</dt>
              <dd style={{ color: PALETTE.record }}>{COPY.disclosure.label}</dd>
            </div>
            <div>
              <dt>{D.meta.deployment}</dt>
              <dd>{D.meta.deploymentValue}</dd>
            </div>
            <div>
              <dt>{D.meta.isolation}</dt>
              <dd style={{ color: PALETTE.isolationCyan }}>{D.meta.isolationValue}</dd>
            </div>
            <div>
              <dt>{D.meta.region}</dt>
              {/*
                The reference prints "AMS AP-SOUTH-1". This prints the real
                measured PoP, or nothing when the edge did not name one — an
                unknown location is unstated, never guessed (rule 4). There is
                deliberately no VERSION row: the reference's v3.7.4 is an
                invention and no real build version is published here.
              */}
              <dd data-known={edgePop === null ? 'false' : 'true'}>
                {edgePop ?? D.health.unmeasured}
              </dd>
            </div>
          </dl>
        </section>

        <section className="dissection__panel">
          <h2 className="dissection__panel-title">{D.statsTitle}</h2>
          <dl className="dissection__stats">
            <div>
              <dt>{D.stats.layers}</dt>
              <dd>{counts.layers}</dd>
            </div>
            <div>
              <dt>{D.stats.services}</dt>
              <dd>{counts.demonstrations}</dd>
            </div>
            <div>
              <dt>{D.stats.migrations}</dt>
              <dd>{counts.migrations}</dd>
            </div>
            <div>
              <dt>{D.stats.tests}</dt>
              <dd>{counts.tests}</dd>
            </div>
          </dl>
          <p className="dissection__stats-note">{D.statsNote}</p>
        </section>
      </aside>

      {/* --- Bottom: the request trace --------------------------------- */}
      <div className="dissection__trace">
        <div className="dissection__trace-head">
          <h2 className="dissection__trace-title">
            <span
              className="instrument__dot"
              style={{ background: hops ? PALETTE.green : PALETTE.amber }}
              aria-hidden="true"
            />
            {D.traceTitle}
          </h2>
          {totalMs !== null ? (
            <p className="dissection__trace-total">
              <span>{D.totalTime}</span>
              <strong>{Math.round(totalMs)}ms</strong>
            </p>
          ) : null}
        </div>

        {hops ? (
          <>
            <ol className="dissection__stages">
              {TRACE_STAGES.map((stage) => {
                const hop = hops.find((h) => h.id === stage.id);
                const timed = hop && hop.durationMs !== null;
                return (
                  <li key={stage.id} className="dissection__stage">
                    <span
                      className="dissection__stage-node"
                      data-timed={timed ? 'true' : 'false'}
                      aria-hidden="true"
                    />
                    <span className="dissection__stage-label">{stage.label}</span>
                    <span className="dissection__stage-role">{stage.role}</span>
                    <span className="dissection__stage-time" data-known={timed ? 'true' : 'false'}>
                      {timed ? `${hop.durationMs}ms` : '—'}
                    </span>
                  </li>
                );
              })}
            </ol>
            <p className="dissection__trace-note">{D.tracePerStage}</p>
          </>
        ) : (
          <p className="dissection__trace-empty">{D.traceEmpty}</p>
        )}
      </div>

      {/* Layer selection is an interface state; a visible control owns it. */}
      {selectedLayer ? (
        <button type="button" className="dissection__clear" onClick={() => onLayer?.(null)}>
          Show all {LAYERS.length} layers
        </button>
      ) : null}
    </div>
  );
}
