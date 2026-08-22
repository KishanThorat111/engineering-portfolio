/**
 * REFERENCE 02 — SYSTEMS. The estate, as data.
 *
 * WHAT THE REFERENCE SHOWS
 * Three raised islands arranged around a central ring core, each island a
 * cluster of chips on a plate with a small emitter, annotated by a floating
 * card carrying a number, a name, a status and one line of description. Chips
 * with service names float around each island on hairlines. The centre carries
 * an "ENGINEERING CORE" ring labelled as shared foundations.
 *
 * WHAT IS RECONSTRUCTED, AND WHAT IS CORRECTED
 * The composition, the island ring, the central core, the chip clusters, the
 * floating cards and their placement are reproduced. The CONTENT is the real
 * estate, from `apps/static/src/content/systems/`:
 *
 *   - the reference's "HOSPITALITY OPERATIONS" is an AI misrendering of
 *     "hospital ... operations", and rule 7 forbids naming the hospital at
 *     all. The approved title is used verbatim.
 *   - the reference shows THREE islands. There are FOUR nodes, because dossier
 *     §2.7 is explicit: the system the visitor has been playing inside
 *     resolves into one node of four, and it is the smallest. The demo plane
 *     is the fourth island and it is labelled a demo (rule 11).
 *   - the reference's "12 Services Online" is an invention and does not ship.
 *     "3 Primary Systems" is real and does.
 *
 * THE DISCLOSED LIMITATION IS ON THE CARD, AND THAT IS DELIBERATE
 * Rule 3 requires every system to disclose a limitation. P9 put those on the
 * static /systems index "before a visitor has committed to reading anything"
 * and recorded it as the page's most distinguishing feature. The same choice
 * is made here: the limitation is on the island card, in the world, next to
 * the thing it is about — not buried in a case study a click away.
 */
import { PALETTE } from '../render/shaders.ts';

export type IslandStatus = 'IN_PRODUCTION_HOSPITAL' | 'LIVE' | 'PRE_LAUNCH' | 'DEMO';

export type Island = {
  id: string;
  /** Index as the reference numbers its cards. */
  index: string;
  /** Real title, verbatim from the content collection. */
  title: string;
  status: IslandStatus;
  /** One line, from the system's own `problem`. */
  line: string;
  /**
   * The limitation this system discloses about itself. Rule 3. Carries its own
   * date qualifier, exactly as written in the content collection (rule 2).
   */
  limitation: string;
  /** Island centre, world space. */
  at: [number, number, number];
  /** Plate footprint. */
  size: [number, number];
  tint: string;
  /** Whether a visitor may attack it. Only ever true for the demo. */
  attackable: boolean;
  /** Service chips standing on the island. Real subsystems. */
  chips: string[];
  /** Route to the static case study, or null for the demo. */
  href: string | null;
  /**
   * Height its world label floats at.
   *
   * Per-island rather than one constant.
   *
   * Note what did NOT work: raising two labels to different heights to separate
   * them. Distant objects compress toward the horizon under this camera, so
   * height moved both into the same narrow band the core label already owned
   * and made three labels overlap instead of two. Separation comes from world
   * placement; this only trims each label to sit close to its own island.
   */
  labelHeight: number;
};

/** The register hue each status paints in. Status is state, so it takes one. */
export const STATUS_TONE: Record<IslandStatus, string> = {
  IN_PRODUCTION_HOSPITAL: PALETTE.green,
  LIVE: PALETTE.green,
  PRE_LAUNCH: PALETTE.amber,
  /* The demo is not a production status and must never borrow signal green. */
  DEMO: PALETTE.record,
};

/** Display labels, matching `schemas/constitution.ts` so the surfaces agree. */
export const STATUS_LABEL: Record<IslandStatus, string> = {
  IN_PRODUCTION_HOSPITAL: 'IN PRODUCTION — HOSPITAL',
  LIVE: 'LIVE',
  PRE_LAUNCH: 'PRE-LAUNCH',
  DEMO: 'DEMO PLANE',
};

/*
 * Four islands on a ring of radius 26, matching the station table's stated
 * geography. Angles are chosen so the three real platforms occupy the upper
 * and right arc the reference gives them, and the demo sits nearest the
 * camera — it is the one the visitor has just been inside.
 */
export const ISLANDS: Island[] = [
  {
    id: 'hospital',
    index: '01',
    title: 'Hospital housekeeping operations',
    status: 'IN_PRODUCTION_HOSPITAL',
    line: 'Cleaning had to be provable in a clinical setting, not just reported by whoever did it.',
    limitation:
      'There is no automated test suite. Not a thin one — none. Every deploy rests on manual ' +
      'verification and a single content-freshness check in the pipeline (as of Jul 2026).',
    at: [2, 0, -21],
    size: [10, 10],
    tint: PALETTE.structure,
    attackable: false,
    chips: ['ROOMS', 'ATTENDANCE', 'TICKETS', 'EVIDENCE', 'REPORTS', 'MEDIA'],
    href: '/systems/hospital-operations',
    labelHeight: 2.8,
  },
  {
    id: 'menu',
    index: '02',
    title: 'Digital menu platform',
    status: 'LIVE',
    line: 'Real money moves through code I wrote, so a double-fired payment has to be a non-event.',
    limitation:
      'Soft-deleting a tenant anonymises its personal data and sets a purge date thirty days ' +
      'out — and then nothing enforces it. No scheduled job reads that date (as of Jul 2026).',
    at: [20, 0, -2],
    size: [9.5, 9.5],
    tint: PALETTE.ember,
    attackable: false,
    chips: ['MENU', 'QR ENTRY', 'BILLING', 'PAYMENTS', 'SUBSCRIPTIONS'],
    href: '/systems/menu-platform',
    labelHeight: 2.8,
  },
  {
    id: 'electrical',
    index: '03',
    title: 'Electrical inspection platform',
    status: 'PRE_LAUNCH',
    line: 'Everything I learned running a system without a safety net, applied before the first user arrives.',
    limitation:
      'Nobody uses it. No production users, no operating history, nothing that has survived a ' +
      'real workload. Its readiness audit returned not-ready, two critical blockers open ' +
      '(as of Jul 2026).',
    at: [10, 0, 16],
    size: [9.5, 9.5],
    tint: PALETTE.record,
    attackable: false,
    chips: ['INSPECTIONS', 'FAULTS', 'SAFETY', 'MULTI-TENANT', 'REPORTING'],
    href: '/systems/electrical-platform',
    labelHeight: 4.0,
  },
  {
    id: 'demo',
    index: '04',
    title: 'This demo plane',
    status: 'DEMO',
    line: 'A real system, built to be attacked. Separate from anything in production.',
    limitation:
      'It is a demo and says so. A physically separate database with no path to any production ' +
      'system, and every tenant it creates is destroyed on a TTL by a scheduled job.',
    at: [-8, 0, 17],
    size: [8.5, 8.5],
    tint: PALETTE.record,
    attackable: true,
    chips: ['ISOLATION', 'PAYMENTS', 'FRAUD', 'AI COST', 'LIMITS'],
    href: null,
    labelHeight: 4.4,
  },
];

/**
 * The shared core at the origin.
 *
 * The reference labels it "ENGINEERING CORE — shared foundations powering all
 * systems", which is a claim, so it has to be a true one. It is: all four run
 * the same stack and the same patterns, and that is stated at CV level and
 * nowhere beyond it.
 */
export const CORE = {
  label: 'ENGINEERING CORE',
  line: 'One stack, four systems. Fastify, PostgreSQL with row-level security, Redis, Docker.',
  /* Concentric rings, matching the reference's stacked-disc core. */
  rings: [
    { radius: 7.4, thickness: 0.4, y: 0.3 },
    { radius: 5.6, thickness: 0.5, y: 0.95 },
    { radius: 3.8, thickness: 0.6, y: 1.7 },
  ],
} as const;

/**
 * The dissection index the reference runs down its left column.
 *
 * These are the sections a case study actually has on the static surface, so
 * selecting one is a real destination rather than a label.
 */
export const DISSECTION = [
  { index: '01', label: 'PROBLEM' },
  { index: '02', label: 'ARCHITECTURE' },
  { index: '03', label: 'DATA FLOW' },
  { index: '04', label: 'SECURITY' },
  { index: '05', label: 'DEPLOYMENT' },
  { index: '06', label: 'IMPACT' },
] as const;

/** Conduit route from the shared core out to an island. */
export function islandRoute(island: Island): Array<[number, number, number]> {
  const [x, , z] = island.at;
  const mid = 0.55;
  return [
    [0, 1.4, 0],
    [x * mid, 2.6, z * mid],
    [x, 0.9, z],
  ];
}
