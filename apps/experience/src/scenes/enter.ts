/**
 * REFERENCE 01 — ENTER. The scene's geometry and content, as data.
 *
 * Separated from the component so the layout can be read, reviewed and diffed
 * against the reference image without wading through JSX, and so the label
 * layer and the 3D scene are provably reading the SAME anchors rather than two
 * hand-synced copies that drift.
 *
 * WHAT THE REFERENCE SHOWS, AND WHAT IS REPRODUCED
 * A seven-tier stepped stack rising from a dark city, a plasma core erupting at
 * its apex with vertical light shafts, six architecture layers annotated down
 * the left with leader rules, and five capability satellites annotated down the
 * right, each tethered to the stack by a conduit carrying travelling light.
 * Composition, hierarchy, scale and lighting direction are preserved exactly.
 *
 * WHAT IS NOT REPRODUCED, AND WHY
 * The reference's layer names are AI-generated and several are misspellings of
 * real terms ("API SATEWAY", "DATA LATER", "IMPRASTRUCTURE", "Requeet Pouting",
 * "2.4M Eventers"). Every name below is the real architecture of this
 * repository's own control plane, taken from services/api/src — which is both
 * more honest and, conveniently, exactly what the directive asks for: the
 * repository content is authoritative, not the picture of a website.
 */
import { PALETTE } from '../render/shaders.ts';

/** One tier of the stepped stack. Top of the list is the top of the stack. */
export type StackTier = {
  id: string;
  /** Real layer name, from this repository's own architecture. */
  label: string;
  /** One honest line. No figures that do not exist. */
  detail: string;
  /** Footprint. The reference's tiers grow steadily toward the base. */
  size: [number, number];
  y: number;
  tint: string;
  /**
   * Emissive cells per WORLD UNIT (not per plate). Constant density means a
   * small plate and a large one read as the same material rather than as the
   * same texture stretched.
   */
  windows: number;
};

/*
 * Seven tiers. The reference's stack is a ziggurat: each tier is wider than the
 * one above by a near-constant step, with the gap between tiers slightly larger
 * near the top. Measured off the reference crop and reproduced proportionally
 * rather than guessed.
 */
export const STACK: StackTier[] = [
  {
    id: 'edge',
    label: 'EDGE',
    detail: 'Cloudflare · tunnel, no inbound ports',
    size: [7.2, 7.2],
    y: 7.6,
    tint: PALETTE.structure,
    windows: 1.5,
  },
  {
    id: 'gateway',
    label: 'API GATEWAY',
    detail: 'Fastify · fixed endpoint surface',
    size: [9.4, 9.4],
    y: 5.9,
    tint: PALETTE.structure,
    windows: 1.6,
  },
  {
    id: 'auth',
    label: 'AUTH / POLICY',
    detail: 'Scoped credentials · per-tenant limits',
    size: [11.4, 11.4],
    y: 4.3,
    tint: PALETTE.record,
    windows: 1.7,
  },
  {
    id: 'services',
    label: 'SERVICES',
    detail: 'Isolation · payments · fraud · AI · limits',
    size: [13.6, 13.6],
    y: 2.8,
    tint: PALETTE.record,
    windows: 1.8,
  },
  {
    id: 'events',
    label: 'EVENT STREAM',
    detail: 'Postgres NOTIFY · WebSocket fanout',
    size: [15.8, 15.8],
    y: 1.4,
    tint: PALETTE.ember,
    windows: 1.9,
  },
  {
    id: 'data',
    label: 'DATA',
    detail: 'PostgreSQL with row-level security · Redis',
    size: [18.2, 18.2],
    y: 0.1,
    tint: PALETTE.ember,
    windows: 2.0,
  },
  {
    id: 'infrastructure',
    label: 'INFRASTRUCTURE',
    detail: 'One VM · Docker Compose · Caddy',
    size: [21, 21],
    y: -1.2,
    tint: PALETTE.structure,
    windows: 2.1,
  },
];

/** A capability tethered to the stack, annotated down the right of the frame. */
export type Satellite = {
  id: string;
  label: string;
  detail: string;
  /** World position. The reference arcs these down the right-hand side. */
  at: [number, number, number];
  tint: string;
  /** Where on the stack its conduit attaches. */
  fromTier: string;
};

/*
 * Five satellites, matching the reference's right-hand column in position and
 * count.
 *
 * Their x was pulled inboard twice while the label layer still cropped at the
 * frame edge, and that was solving the wrong problem: at x < 10.5 a satellite
 * is inside the base plate's own footprint, so it reads as embedded in the
 * stack rather than tethered to it. Once LabelLayer learned to flip a label to
 * its other side on overflow, the positions could go back out to where the
 * reference actually puts them — clear of the silhouette, on their own. Their content is this system's real capabilities, and each one is
 * something a visitor can actually operate — which is the difference between
 * an annotation and a claim.
 */
export const SATELLITES: Satellite[] = [
  {
    id: 'ai',
    label: 'AI COST ROUTING',
    detail: 'SQL-first · escalates only when it must',
    at: [16, 11, -9],
    tint: PALETTE.record,
    fromTier: 'services',
  },
  {
    id: 'telemetry',
    label: 'TELEMETRY',
    detail: 'OpenTelemetry · the traces are real spans',
    at: [18.5, 7, -2],
    tint: PALETTE.green,
    fromTier: 'gateway',
  },
  {
    id: 'database',
    label: 'POSTGRESQL',
    detail: 'Row-level security · genuine tenant isolation',
    at: [19, 2.4, 6],
    tint: PALETTE.ember,
    fromTier: 'data',
  },
  {
    id: 'cache',
    label: 'REDIS',
    detail: 'Rate limits · idempotency keys · presence',
    at: [16.5, -0.8, 13],
    tint: PALETTE.ember,
    fromTier: 'data',
  },
  {
    id: 'purge',
    label: 'TTL PURGE',
    detail: 'A real scheduled job under advisory lock',
    at: [12, -3, 18],
    tint: PALETTE.structure,
    fromTier: 'infrastructure',
  },
];

/** Where a tier sits, for routing conduits to it. */
export function tierAt(id: string): [number, number, number] {
  const tier = STACK.find((t) => t.id === id);
  if (!tier) throw new Error(`Unknown stack tier: ${id}`);
  return [0, tier.y, 0];
}

/**
 * The conduit route from a tier out to a satellite.
 *
 * Three waypoints, not two. The reference's tethers bow outward and sag before
 * arriving, which is what makes them read as cables rather than as leader
 * lines; a straight segment between two points reads as a diagram and loses
 * the depth the whole frame depends on.
 */
export function satelliteRoute(satellite: Satellite): Array<[number, number, number]> {
  const [tx, ty, tz] = tierAt(satellite.fromTier);
  const [sx, sy, sz] = satellite.at;
  return [
    [tx, ty, tz],
    [(tx + sx) / 2 + 1.5, (ty + sy) / 2 + 1.8, (tz + sz) / 2],
    [sx, sy, sz],
  ];
}
