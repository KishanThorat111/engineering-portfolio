/**
 * 03 / DISSECTION. The exploded architecture, as data.
 *
 * WHAT THE REFERENCE SHOWS
 * Seven architecture layers exploded vertically, seen at high oblique, the top
 * slab cropped by the frame. Each slab carries labelled tiles. Tapered arrows
 * drop between slabs. Three tenant chips fly out to the right under a bracket
 * marked TENANT ISOLATION. The slabs are frosted glass: near-white at the top,
 * darkening and saturating toward the base.
 *
 * WHICH SYSTEM IS BEING DISSECTED, AND WHY
 * The reference dissects a named production platform. This dissects the DEMO
 * PLANE, and that is a deliberate correction rather than a substitution.
 *
 * Station 02 establishes the true claim that all four nodes run one stack, so
 * the architecture drawn here is shared by all of them. But only the demo plane
 * can have its internals opened live — the real row-scope predicate, the real
 * query plan, the real 403 branch (§2.5). Dissecting a hospital platform we
 * cannot show the inside of would make this frame a diagram; dissecting the one
 * we can makes it an instrument. It is also the only one rule 7 lets us open at
 * all.
 *
 * Every layer below is the real composition of `services/api/src`.
 */
import { PALETTE } from '../render/shaders.ts';

export type Layer = {
  id: string;
  /** Reference numbering: LAYER 01 … LAYER 07, top to bottom. */
  index: string;
  label: string;
  /** One honest line describing what the layer is. */
  detail: string;
  /** Height of this slab in the exploded stack. */
  y: number;
  size: [number, number];
  tint: string;
  /**
   * How translucent the slab is. The reference's top layer is near-white and
   * nearly opaque glass; lower layers darken and saturate. This drives that
   * gradient rather than a per-layer colour.
   */
  frost: number;
  /** Tiles standing on the slab. Real modules, from the repository. */
  tiles: string[];
};

/*
 * Seven slabs. Spacing is even at the base and opens up toward the top, which
 * is what the reference does — it gives the upper layers room for their tiles
 * while keeping the base reading as a stack rather than a ladder.
 */
export const LAYERS: Layer[] = [
  {
    id: 'client',
    index: '01',
    label: 'CLIENT',
    detail: 'React · React Three Fiber · this page',
    y: 17.5,
    size: [11, 8],
    tint: PALETTE.structure,
    frost: 1,
    tiles: ['SCENE', 'DOCUMENT', 'STATIONS', 'A11Y'],
  },
  {
    id: 'edge',
    index: '02',
    label: 'EDGE / NETWORK',
    detail: 'Cloudflare · tunnel, no inbound ports · TLS',
    y: 15,
    size: [11.8, 8.5],
    tint: PALETTE.structure,
    frost: 0.9,
    tiles: ['TUNNEL', 'WAF', 'TLS', 'CDN'],
  },
  {
    id: 'gateway',
    index: '03',
    label: 'API GATEWAY',
    detail: 'Fastify · fixed endpoint surface · no arbitrary SQL',
    y: 12.5,
    size: [12.6, 9],
    tint: PALETTE.structure,
    frost: 0.75,
    tiles: ['ROUTING', 'AUTH', 'RATE LIMIT', 'ERRORS'],
  },
  {
    id: 'services',
    index: '04',
    label: 'CORE SERVICES',
    detail: 'The five demonstrations, each a real mechanism',
    y: 10,
    size: [13.5, 9.6],
    tint: PALETTE.record,
    frost: 0.55,
    tiles: ['ISOLATION', 'PAYMENTS', 'FRAUD', 'AI COST', 'LIMITS', 'AUDIT'],
  },
  {
    id: 'events',
    index: '05',
    label: 'DATA / EVENTS',
    detail: 'Postgres NOTIFY · WebSocket fanout · queue worker',
    y: 7.5,
    size: [14.3, 10.2],
    tint: PALETTE.ember,
    frost: 0.4,
    tiles: ['NOTIFY', 'GATEWAY', 'PRESENCE', 'QUEUE'],
  },
  {
    id: 'persistence',
    index: '06',
    label: 'PERSISTENCE',
    detail: 'PostgreSQL with row-level security · Redis',
    y: 5,
    size: [15.1, 10.8],
    tint: PALETTE.ember,
    frost: 0.28,
    tiles: ['POSTGRES', 'RLS POLICY', 'REDIS', 'MIGRATIONS'],
  },
  {
    id: 'observability',
    index: '07',
    label: 'OBSERVABILITY',
    detail: 'OpenTelemetry spans · committed audit rows',
    y: 2.5,
    size: [16, 11.4],
    tint: PALETTE.structure,
    frost: 0.2,
    tiles: ['SPANS', 'AUDIT LOG', 'HEALTH'],
  },
];

/** The stack's centre. Sits over the demo island, so 02 and 03 are one world. */
export const STACK_ORIGIN: [number, number, number] = [-8, 0, 17];

/**
 * The tenant chips that fly out to the right, under the isolation bracket.
 *
 * THE ONLY PLACE ISOLATION CYAN APPEARS IN THIS FRAME, and the reason the
 * palette rule was worth defending through two stations of restraint. Every
 * other cool edge in the world is `structure`; this is a tenancy boundary, so
 * it is the locked colour and it should be the first thing the eye finds.
 */
export const TENANTS = [
  { id: 'a', label: 'TENANT A', offset: [9.5, 1.2, -2.5] as [number, number, number] },
  { id: 'b', label: 'TENANT B', offset: [10.5, 0, 0.5] as [number, number, number] },
  { id: 'c', label: 'TENANT C', offset: [9.8, -1.2, 3.5] as [number, number, number] },
];

/** Where the tenant-isolation bracket attaches on the services layer. */
export const ISOLATION_AT: [number, number, number] = [7, 10, 0];

/**
 * The request trace along the bottom of the reference.
 *
 * Stage NAMES are real — these are the hops a request through this API
 * genuinely makes. Stage TIMINGS are not carried here: they come from a real
 * span at render time, and an unmeasured hop renders as unmeasured. The
 * reference prints a confident millisecond figure for all seven; six of those
 * are hops nothing in this system times individually.
 */
export const TRACE_STAGES = [
  { id: 'client', label: 'CLIENT', role: 'This page' },
  { id: 'edge', label: 'EDGE', role: 'Tunnel / TLS' },
  { id: 'gateway', label: 'API GATEWAY', role: 'Auth / routing' },
  { id: 'service', label: 'SERVICE', role: 'Business logic' },
  { id: 'cache', label: 'REDIS', role: 'Limits / keys' },
  { id: 'db', label: 'POSTGRESQL', role: 'Query, RLS scoped' },
  { id: 'response', label: 'RESPONSE', role: 'Back to you' },
] as const;

/** Vertical drop between two adjacent layers, for the connector arrows. */
export function dropBetween(upper: Layer, lower: Layer): { y: number; height: number } {
  const gap = upper.y - lower.y;
  return { y: lower.y + gap / 2, height: gap * 0.52 };
}
