/**
 * The world's state. Zustand, per the locked stack.
 *
 * ONE RULE SHAPES THIS FILE: every visual state must trace to a real backend
 * event (§1.3's corollary). So the store holds events and things DERIVED from
 * events, and it holds nothing that was invented to make the scene look better.
 * There is no ambient activity generator, no idle packet spawner, no synthetic
 * tenant. If the world is empty it is because the system is quiet, and that is
 * the honest reading.
 *
 * "Idle is alive" (§3.6) is satisfied by the world's own motion — drift,
 * breathing, the slow settle of the camera — not by fake traffic. Those are
 * properties of the rendering, not events pretending to have happened.
 */
import { create } from 'zustand';
import type { LiveEvent } from '@contract';
import type { SourceState } from '../live/source.ts';
import type { Tier } from '../render/quality.ts';
import type { BreakOutState } from '../beats/choreography.ts';
import { NEUTRAL } from '../beats/choreography.ts';
import type { EdgeReading } from '../live/api.ts';
import type { Station } from '../router.ts';

/** A tenant volume, derived entirely from events that mentioned it. */
export type Volume = {
  orgRef: string;
  isSelf: boolean;
  /** performance.now() of the most recent event. Drives brightness decay. */
  lastEventAt: number;
  eventCount: number;
  deniedCount: number;
  /** Stable slot so a volume keeps its position for the life of the session. */
  slot: number;
};

/** A packet in flight. Its speed is a real measured duration, or unmeasured. */
export type Packet = {
  id: string;
  orgRef: string;
  /** Real server duration in ms, or null. NEVER defaulted — see envelope.ts. */
  durationMs: number | null;
  outcome: 'allowed' | 'denied' | 'error';
  /** performance.now() when it entered the world. */
  bornAt: number;
  /** How long it should take to cross, in ms. Derived from durationMs. */
  travelMs: number;
  /** True when durationMs was null: drawn dashed, never drawn fast. */
  unmeasured: boolean;
  fromSlot: number;
  toSlot: number;
};

/** The five-beat arc (§2.1). The world knows which beat it is in. */
export type Beat = 'arrival' | 'recognition' | 'ownership' | 'confrontation' | 'consequence';

/** The visitor's own tenant, once the control plane has really created one. */
export type Tenant = {
  orgId: string;
  publicRef: string;
  apiKey: string;
  expiresAt: string;
  seededRecords: number;
};

export type WorldState = {
  source: SourceState;
  /* --- P5 fusion ---------------------------------------------------- */
  beat: Beat;
  /** Real edge PoP and RTT (A6). Null until measured; never guessed. */
  edge: EdgeReading | null;
  /** 0..1 cold-open assembly, paced by the REAL measured handshake. */
  assembly: number;
  tenant: Tenant | null;
  /** Set when provisioning genuinely failed, shown verbatim. */
  provisionError: string | null;
  /** The locked break-out choreography's live state. */
  breakOut: BreakOutState;
  station: Station | null;
  tier: Tier;
  tierReason: string;
  reducedMotion: boolean;
  webglAvailable: boolean;
  volumes: Map<string, Volume>;
  packets: Packet[];
  /** Newest first. Bounded — this is a browser, not a log store. */
  log: LiveEvent[];
  /** The most recent denial, for the membrane flare. Cyan means this and only this. */
  lastDenialAt: number | null;
  frame: { p50: number; p95: number; fps: number };

  setBeat: (beat: Beat) => void;
  setEdge: (edge: EdgeReading) => void;
  setAssembly: (assembly: number) => void;
  setTenant: (tenant: Tenant | null) => void;
  setProvisionError: (message: string | null) => void;
  setBreakOut: (state: BreakOutState) => void;
  /**
   * Fires the locked §2.5 choreography.
   *
   * A counter rather than a boolean: a second refusal must replay the beat, and
   * a boolean that is already true would silently swallow it. The driver in
   * App.tsx watches this and builds the timeline.
   */
  breakOutTrigger: number;
  runBreakOut: () => void;
  setStation: (station: Station | null) => void;

  ingest: (event: LiveEvent) => void;
  setSource: (state: SourceState) => void;
  setTier: (tier: Tier, reason: string) => void;
  setFrame: (frame: { p50: number; p95: number; fps: number }) => void;
  setReducedMotion: (value: boolean) => void;
  setWebglAvailable: (value: boolean) => void;
  retirePackets: (now: number, max: number) => void;
};

const MAX_LOG = 60;

/**
 * How long a packet takes to cross the world.
 *
 * Motion is measurement: this is a monotonic mapping from real milliseconds to
 * screen milliseconds, not an easing curve chosen for looks. A 2ms request and
 * a 200ms request differ visibly and in the right direction, compressed by a
 * log so that the range a real system produces fits a range an eye can read.
 *
 * An UNMEASURED packet does not get a made-up speed. It travels at the median
 * and is drawn dashed, and the legend says what dashed means — because drawing
 * it fast would be asserting a latency nobody recorded.
 */
export function travelTimeFor(durationMs: number | null): {
  travelMs: number;
  unmeasured: boolean;
} {
  if (durationMs === null) return { travelMs: 1400, unmeasured: true };
  const clamped = Math.max(0.5, Math.min(durationMs, 5_000));
  const travel = 420 + Math.log10(clamped + 1) * 900;
  return { travelMs: travel, unmeasured: false };
}

let nextSlot = 0;
const slotFor = new Map<string, number>();
function assignSlot(orgRef: string): number {
  const existing = slotFor.get(orgRef);
  if (existing !== undefined) return existing;
  const slot = nextSlot++;
  slotFor.set(orgRef, slot);
  return slot;
}

export const useWorld = create<WorldState>((set) => ({
  source: { mode: 'connecting', presence: null, reason: null, recordedAt: null },
  beat: 'arrival',
  edge: null,
  assembly: 0,
  tenant: null,
  provisionError: null,
  breakOut: NEUTRAL,
  breakOutTrigger: 0,
  station: null,
  tier: 2,
  tierReason: 'initial',
  reducedMotion: false,
  webglAvailable: true,
  volumes: new Map(),
  packets: [],
  log: [],
  lastDenialAt: null,
  frame: { p50: 0, p95: 0, fps: 0 },

  ingest: (event) =>
    set((state) => {
      const now = performance.now();
      const slot = assignSlot(event.orgRef);

      const volumes = new Map(state.volumes);
      const existing = volumes.get(event.orgRef);
      volumes.set(event.orgRef, {
        orgRef: event.orgRef,
        isSelf: event.isSelf,
        lastEventAt: now,
        eventCount: (existing?.eventCount ?? 0) + 1,
        deniedCount: (existing?.deniedCount ?? 0) + (event.outcome === 'denied' ? 1 : 0),
        slot,
      });

      const { travelMs, unmeasured } = travelTimeFor(event.durationMs);
      const packet: Packet = {
        id: event.id,
        orgRef: event.orgRef,
        durationMs: event.durationMs,
        outcome: event.outcome,
        bornAt: now,
        travelMs,
        unmeasured,
        // Everything enters at the edge plane and travels inward, which is the
        // request lifecycle §2.3 describes rather than a decorative path.
        fromSlot: -1,
        toSlot: slot,
      };

      return {
        volumes,
        packets: [...state.packets, packet],
        log: [event, ...state.log].slice(0, MAX_LOG),
        lastDenialAt: event.outcome === 'denied' ? now : state.lastDenialAt,
      };
    }),

  setBeat: (beat) => set({ beat }),
  setEdge: (edge) => set({ edge }),
  setAssembly: (assembly) => set({ assembly }),
  setTenant: (tenant) => set({ tenant }),
  setProvisionError: (provisionError) => set({ provisionError }),
  setBreakOut: (breakOut) => set({ breakOut }),
  runBreakOut: () => set((s) => ({ breakOutTrigger: s.breakOutTrigger + 1 })),
  setStation: (station) => set({ station }),

  setSource: (source) => set({ source }),
  setTier: (tier, tierReason) => set({ tier, tierReason }),
  setFrame: (frame) => set({ frame }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
  setWebglAvailable: (webglAvailable) => set({ webglAvailable }),

  retirePackets: (now, max) =>
    set((state) => {
      // A packet lives until it arrives, plus a beat for the arrival to read.
      const alive = state.packets.filter((p) => now - p.bornAt < p.travelMs + 900);
      // Over the tier's ceiling, the OLDEST go first: the newest events are the
      // ones a visitor is currently watching for.
      const bounded = alive.length > max ? alive.slice(alive.length - max) : alive;
      return bounded.length === state.packets.length ? {} : { packets: bounded };
    }),
}));

/** Volumes sorted into a stable ring. Deterministic, so the world is not restless. */
export function ringPosition(
  slot: number,
  total: number,
  radius: number,
): [number, number, number] {
  const safeTotal = Math.max(total, 1);
  const angle = (slot % safeTotal) * ((Math.PI * 2) / safeTotal) + slot * 0.017;
  const tierIndex = Math.floor(slot / 12);
  const r = radius + tierIndex * 2.4;
  const y = ((slot * 37) % 11) / 11 - 0.5;
  return [Math.cos(angle) * r, y * 1.6, Math.sin(angle) * r];
}
