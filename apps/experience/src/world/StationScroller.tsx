/**
 * The scroll track the camera rides, and the station index that names it.
 *
 * The world is fixed to the viewport; this is the only thing on the page tall
 * enough to scroll. Ten viewports of height, one per station, so the scroll bar
 * is an honest depth gauge of how far through the world the visitor is.
 *
 * WHY THE TRACK IS EMPTY AND aria-hidden
 * It carries no content — the accessible version of every station is the
 * document below, and the station index in the chrome is the navigable
 * control. A ten-screen-tall empty region announced to a screen reader is ten
 * screens of nothing to page through.
 *
 * WHY IT SITS BEHIND EVERYTHING
 * `z-index: 0` and no pointer events: the overlays must remain clickable and
 * the canvas must remain visible. The track exists to give the document a
 * scrollable height, nothing else.
 */
import { useStationScroll } from './useStationScroll.ts';
import { STATIONS } from '../kit/stations.ts';

export function StationScroller() {
  useStationScroll();

  return (
    <div
      className="station-track"
      aria-hidden="true"
      style={{ height: `${STATIONS.length * 100}vh` }}
    />
  );
}
