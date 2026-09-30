/**
 * REFERENCE 01 — ENTER. The interface half, as real HTML.
 *
 * Every word the reference image shows is reproduced here as DOM, from the
 * repository's own copy module — not drawn into a texture, not baked into the
 * scene. Spelling is exact, the text is selectable and translatable, a screen
 * reader gets the whole frame in reading order, and the copy gate can scan it.
 *
 * THE COMPOSITION IS THE REFERENCE'S, PRECISELY
 *   top left      wordmark, then the numbered station index
 *   top right     system status pill
 *   left third    eyebrow, three-line display claim, sub-line, primary action
 *   bottom left   a metrics row over a hairline, then the scroll affordance
 *   bottom centre the live request trace panel
 * The empty left third is not empty by accident — it is where the reference
 * puts its type, and the camera station is offset left precisely to leave it.
 *
 * WHAT CHANGED FROM THE REFERENCE, AND WHY (all recorded in §3 of the
 * decomposition): the four metrics are replaced, because uptime and error-rate
 * figures are forbidden by rule 7 and the other two were invented; the demo
 * label is ADDED, because rule 11 requires it and the reference has none; and
 * the trace panel renders unmeasured durations as unmeasured instead of
 * showing a confident number for a span nobody timed.
 */
import { COPY } from '../content/copy.ts';
import { InstrumentPanel } from '../kit/InstrumentPanel.tsx';
import { PALETTE } from '../render/shaders.ts';
import { STATIONS, type StationId } from '../kit/stations.ts';

export type TraceReading = {
  action: string;
  outcome: 'allowed' | 'denied' | 'error';
  /** Real measured duration, or null. Never defaulted. */
  durationMs: number | null;
  traceId: string | null;
  occurredAt: string;
};

export type EnterOverlayProps = {
  /** Real measured edge round trip in ms, or null when unmeasured. */
  edgeRttMs: number | null;
  /** Real edge PoP name, or null when the edge did not name one. */
  edgePop: string | null;
  /** Real count of events received this session. */
  eventCount: number;
  /** The visitor's real tenant reference, or null when not provisioned. */
  tenantRef: string | null;
  /** ISO expiry of the real tenant, or null. */
  tenantExpiresAt: string | null;
  /** Liveness, stated. Never smoothed over. */
  source: 'live' | 'replay' | 'unknown';
  /** The most recent real audit row, or null. */
  trace: TraceReading | null;
  activeStation: StationId;
  onStation?: (id: StationId) => void;
  onEnter?: () => void;
};

const OUTCOME_TONE: Record<TraceReading['outcome'], string> = {
  allowed: PALETTE.green,
  denied: PALETTE.danger,
  error: PALETTE.amber,
};

/** Whole seconds remaining, or null when there is no real expiry to count. */
function remaining(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) return 'expired';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

export function EnterOverlay({
  edgeRttMs,
  edgePop,
  eventCount,
  tenantRef,
  tenantExpiresAt,
  source,
  trace,
  activeStation,
  onStation,
  onEnter,
}: EnterOverlayProps) {
  const M = COPY.enter.metrics;

  return (
    <div className="enter">
      {/* --- Top rail ------------------------------------------------- */}
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

        {/*
          The reference's status pill claims ALL SYSTEMS OPERATIONAL
          unconditionally. This one is derived from the socket's real state and
          says REPLAY or UNKNOWN when that is what is true (rule 12).
        */}
        <div className="enter__status">
          <InstrumentPanel
            title="System status"
            tone={source === 'live' ? PALETTE.green : PALETTE.amber}
            source={source}
          />
        </div>
      </header>

      {/*
        --- Left column -------------------------------------------------
        The claim and the metrics strip were two separately positioned blocks:
        one pinned near the top, one pinned to the bottom edge. On a wide but
        short viewport the claim grew down into the strip and the ENTER control
        landed on top of the readings, hiding them. Two absolutely positioned
        siblings cannot be made not to collide by adjusting their offsets —
        there is always a viewport where the arithmetic fails.

        So they are one column now, in flow, and the overlap is impossible
        rather than merely unlikely. The column itself carries the position;
        `space-between` keeps the composition the reference specifies, with the
        claim high and the readings low, whenever there is room for it.
      */}
      <div className="enter__column">
        <div className="enter__hero">
          {/* Rule 11, in the most prominent slot the frame has. */}
          <p className="enter__eyebrow">
            <span className="enter__demo">{COPY.disclosure.label}</span>
            <span className="enter__demo-note">{COPY.disclosure.short}</span>
          </p>

          <h2 className="enter__claim">
            {COPY.enter.claimLines.map((line) => (
              <span className="enter__claim-line" key={line}>
                {line}
              </span>
            ))}
            <span className="enter__claim-line enter__claim-line--emphasis">
              {COPY.enter.claimTail}
            </span>
          </h2>

          <p className="enter__subline">{COPY.enter.subline}</p>

          <button type="button" className="enter__action" onClick={onEnter}>
            {COPY.enter.action}
            <span aria-hidden="true">→</span>
          </button>
        </div>

        {/* --- Bottom left: metrics + scroll affordance ------------------ */}
        <div className="enter__metrics">
          <dl>
            <div className="enter__metric">
              <dt>{M.edge}</dt>
              <dd data-known={edgeRttMs === null ? 'false' : 'true'}>
                {edgeRttMs === null ? M.unmeasured : `${Math.round(edgeRttMs)}ms`}
              </dd>
            </div>
            <div className="enter__metric">
              <dt>{M.events}</dt>
              <dd data-known="true">{eventCount}</dd>
            </div>
            <div className="enter__metric">
              <dt>{M.tenant}</dt>
              <dd data-known={tenantRef === null ? 'false' : 'true'}>{tenantRef ?? M.none}</dd>
            </div>
            <div className="enter__metric">
              <dt>{M.expires}</dt>
              <dd data-known={tenantExpiresAt === null ? 'false' : 'true'}>
                {remaining(tenantExpiresAt) ?? M.none}
              </dd>
            </div>
          </dl>

          <p className="enter__scroll">
            <span className="enter__scroll-icon" aria-hidden="true" />
            {COPY.enter.scroll}
            {/*
            The reference prints an IP address here. This prints the real edge
            PoP when the edge named one, and nothing at all when it did not —
            an unknown location is unstated, never guessed (rule 4).
          */}
            {edgePop ? <span className="enter__pop">{edgePop}</span> : null}
          </p>
        </div>
      </div>

      {/* --- Bottom centre: the live request trace -------------------- */}
      <div className="enter__trace">
        <InstrumentPanel
          title={COPY.enter.trace.heading}
          /* Omitted, not undefined: with no trace there is no state to colour. */
          {...(trace ? { tone: OUTCOME_TONE[trace.outcome] } : {})}
          source={source}
        >
          {trace ? (
            <dl className="enter__trace-body">
              <div>
                <dt>Action</dt>
                <dd>{trace.action}</dd>
              </div>
              <div>
                <dt>Outcome</dt>
                <dd style={{ color: OUTCOME_TONE[trace.outcome] }}>{trace.outcome}</dd>
              </div>
              <div>
                <dt>Duration</dt>
                <dd data-known={trace.durationMs === null ? 'false' : 'true'}>
                  {trace.durationMs === null
                    ? COPY.enter.trace.unmeasuredDuration
                    : `${trace.durationMs}ms`}
                </dd>
              </div>
              <div>
                <dt>Trace</dt>
                <dd data-known={trace.traceId === null ? 'false' : 'true'}>
                  {trace.traceId ?? M.unmeasured}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="enter__trace-empty">{COPY.enter.trace.empty}</p>
          )}
        </InstrumentPanel>
      </div>
    </div>
  );
}
