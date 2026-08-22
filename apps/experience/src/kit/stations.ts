/**
 * THE STATION TABLE — the world's geography, declared once.
 *
 * C3 was ruled on 22 Aug 2026: ONE CONTINUOUS TAKE, TEN CAMERA STATIONS. The
 * references' numbered nav survives as a visible station index, not as page
 * links. Scrolling or clicking flies the camera through continuous space; there
 * are no cuts and no page transitions, and every station stays directly
 * addressable by URL (§2.9) — a deep link ARRIVES at its station rather than
 * loading a page there.
 *
 * WHY THIS FILE IS THE CENTRE OF THE WHOLE RECONSTRUCTION
 * The alternative — each reference building its own scene with its own camera —
 * is ten unrelated scenes wearing one style, which is exactly what the
 * directive forbids. Here the estate is laid out ONCE in a single coordinate
 * space, and the ten references become ten places to stand in it. That single
 * decision is what lets objects be shared between references (the stack in 01
 * IS the demo island in 02), what makes the transitions in §1.7 possible at
 * all, and what makes the world feel continuous rather than themed.
 *
 * COORDINATE CONVENTION
 * +Y is up. The estate lies on the XZ plane, centred on the engineering core at
 * the origin. Four islands sit on a ring of radius 26. The archive room is
 * below the estate at y = -40, reached by descending rather than by cutting.
 * The lab decks are north-east at +X/-Z; the control ring is above at y = 18.
 *
 * WHY LOW FOV AND NOT AN ORTHOGRAPHIC CAMERA
 * References 01, 02, 03 and 09 read as isometric. They are not: an orthographic
 * projection has no parallax, and parallax is most of why these frames feel
 * spatial rather than diagrammatic. A ~26–32° FOV at a high oblique angle gives
 * the near-isometric read AND keeps the depth cue. Verified against the crops:
 * the reference plates converge slightly, which orthographic cannot produce.
 */

export type StationId =
  | 'enter'
  | 'systems'
  | 'dissection'
  | 'data'
  | 'lab'
  | 'live'
  | 'think'
  | 'build'
  | 'proof'
  | 'end';

export type Station = {
  id: StationId;
  /** The reference this station reconstructs. */
  reference: string;
  /** Nav index, as the references number them. */
  index: string;
  /** URL segment. Deep links land here. */
  slug: string;
  /** Camera eye, world space. */
  position: [number, number, number];
  /** What the camera looks at. */
  target: [number, number, number];
  /** Degrees. Low for the near-isometric frames, wider for the human ones. */
  fov: number;
  /** Seconds for the flight INTO this station. The camera has weight (§3.8). */
  travelSeconds: number;
  /** Which of the five locked beats (§2.1) this station carries, if any. */
  beat?: 'arrival' | 'recognition' | 'ownership' | 'confrontation' | 'consequence';
};

/**
 * Ten stations, in narrative order.
 *
 * The five-beat arc is not replaced by these — it is the PATH a first-time
 * visitor is flown along through them, which is how both §2.1 and the
 * references' ten sections are satisfied at once.
 */
export const STATIONS: readonly Station[] = [
  {
    id: 'enter',
    reference: '01 — ENTER',
    index: '01',
    slug: 'enter',
    /*
     * Measured against the reference rather than guessed. In the image the
     * stack's apex sits ~12% down the frame and its base ~85%, occupying the
     * right two-thirds with the left third empty for the type. The first pass
     * used [-18, 22, 34] and cropped the base off the bottom of the frame
     * while filling the hero column with geometry — the camera was inside the
     * composition instead of looking at it.
     */
    position: [-30, 34, 74],
    target: [-11, 3, 2],
    fov: 27,
    travelSeconds: 0,
    beat: 'arrival',
  },
  {
    id: 'systems',
    reference: '02 — SYSTEMS',
    index: '02',
    slug: 'systems',
    /*
     * Pulled back and up until the 01 stack is one island among four. Framed
     * so the estate sits centre-right: the left third stays clear for the
     * hero and the dissection index, and the right quarter for the register,
     * exactly as the reference divides the frame.
     */
    position: [-34, 44, 70],
    target: [4, 1, 1],
    fov: 30,
    travelSeconds: 2.6,
    beat: 'recognition',
  },
  {
    id: 'dissection',
    reference: '03 — DISSECTION',
    index: '03',
    slug: 'dissection',
    /*
     * Looking at the exploded column that rises out of the demo island at
     * STACK_ORIGIN [-8, 0, 17] — the same object the visitor selected at
     * station 02. The camera comes in close and low enough that the top slab
     * crops, which the reference does deliberately: the client layer running
     * off the frame is what makes the stack feel taller than the screen.
     */
    position: [-54, 26, 66],
    target: [-15, 9, 17],
    fov: 27,
    travelSeconds: 2.8,
    beat: 'ownership',
  },
  {
    id: 'data',
    reference: '04 — DATA',
    index: '04',
    slug: 'data',
    /*
     * Near-level and side-on, looking along the request path that runs through
     * PATH_ORIGIN. A sequence reads left to right, so the camera stops looking
     * down — this is the flattest angle in the set and it is what turns the
     * dissection stack into a timeline.
     */
    position: [-10, 27, 86],
    target: [-6, 6, 17],
    fov: 30,
    travelSeconds: 2.2,
    beat: 'confrontation',
  },
  {
    id: 'lab',
    reference: '05 — LAB',
    index: '05',
    slug: 'lab',
    /* The lab floor, north-east of the estate at LAB_ORIGIN. */
    position: [14, 34, 30],
    target: [52, 2, -20],
    fov: 34,
    travelSeconds: 3.0,
  },
  {
    id: 'live',
    reference: '06 — LIVE',
    index: '06',
    slug: 'live',
    /*
     * The only near-level camera in the set, which is what makes this frame
     * read as a room rather than as a model. Looks at the control ring at
     * CONTROL_ORIGIN with the globe behind it.
     */
    position: [2, 34, 86],
    target: [0, 30, -6],
    fov: 38,
    travelSeconds: 3.2,
  },
  {
    id: 'think',
    reference: '07 — THINK',
    index: '07',
    slug: 'think',
    /* Down to the desk at DESK_ORIGIN. Close, warm, near-level. */
    position: [-32, 12, 44],
    target: [-45, 9, 25],
    fov: 40,
    travelSeconds: 3.0,
  },
  {
    id: 'build',
    reference: '08 — BUILD',
    index: '08',
    slug: 'build',
    /* Out to the open ground at BUILD_ORIGIN. The deepest frame in the set. */
    position: [-4, 18, 8],
    target: [-30, 10, -46],
    fov: 38,
    travelSeconds: 2.6,
  },
  {
    id: 'proof',
    reference: '09 — PROOF',
    index: '09',
    slug: 'proof',
    /* Below the estate, into the machine room. Chest height, close. */
    position: [21, -31, 32],
    target: [0, -38.5, 0],
    fov: 34,
    travelSeconds: 3.4,
  },
  {
    id: 'end',
    reference: '10 — END',
    index: '10',
    slug: 'end',
    /* Back out and far. The darkest, widest frame; the estate at rest. */
    position: [-44, 32, 74],
    target: [-2, 5, 2],
    fov: 34,
    travelSeconds: 3.8,
    beat: 'consequence',
  },
] as const;

const BY_ID = new Map(STATIONS.map((station) => [station.id, station]));
const BY_SLUG = new Map(STATIONS.map((station) => [station.slug, station]));

export function stationById(id: StationId): Station {
  const station = BY_ID.get(id);
  /*
   * Throws rather than falling back to the first station. A deep link to a
   * station that does not exist is a routing defect, and silently landing the
   * visitor somewhere else hides it — the failure mode principle 6 warns
   * about, where a gate that checks nothing is worse than one that fails.
   */
  if (!station) throw new Error(`Unknown station: ${id}`);
  return station;
}

/** Null for an unrecognised slug, so the router can 404 honestly. */
export function stationBySlug(slug: string): Station | null {
  return BY_SLUG.get(slug) ?? null;
}

/** The next station along the arc, or null at the end. */
export function nextStation(id: StationId): Station | null {
  const index = STATIONS.findIndex((station) => station.id === id);
  return index >= 0 && index < STATIONS.length - 1 ? STATIONS[index + 1]! : null;
}
