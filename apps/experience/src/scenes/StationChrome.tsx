/**
 * The chrome every station shares: wordmark, station index, status pill.
 *
 * Extracted after the third station, where it had been copied verbatim three
 * times. That duplication is exactly how ten camera stations quietly become ten
 * websites — the nav drifts by a pixel here, the status pill gains a variant
 * there, and the claim that this is one continuous world stops being true at
 * the interface layer even while it stays true in the scene graph.
 *
 * One component, one rail, every station.
 */
import { InstrumentPanel } from '../kit/InstrumentPanel.tsx';
import { PALETTE } from '../render/shaders.ts';
import { STATIONS, type StationId } from '../kit/stations.ts';

export type StationChromeProps = {
  source: 'live' | 'replay' | 'unknown';
  activeStation: StationId;
  /*
   * Explicitly `| undefined`, not just optional. Under
   * `exactOptionalPropertyTypes` those are different types, and every station
   * overlay spreads a shared `base` object through to here — so a handler that
   * may be absent has to be *declared* as possibly-absent rather than merely
   * omittable. Fixing it here fixes it at all seven call sites.
   */
  onStation?: ((id: StationId) => void) | undefined;
};

export function StationChrome({ source, activeStation, onStation }: StationChromeProps) {
  return (
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
  );
}
