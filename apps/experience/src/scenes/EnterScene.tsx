/**
 * REFERENCE 01 — ENTER. The 3D half.
 *
 * Composed ENTIRELY from the shared kit: Plate, Core, Conduit, CityField,
 * LabelLayer. There is no geometry in this file that any other reference
 * cannot also use, which is the test the directive set — one shared visual
 * system rather than ten unrelated scenes.
 *
 * WHAT DRIVES THE LIGHT
 * Every `glow` below comes from a real measurement or is DARK. A tier lights
 * because events really touched that layer; the apex core lights on the
 * measured round trip; a conduit's beads exist because audit rows exist and
 * travel at the duration those rows recorded. With no live plane and no
 * recording, this scene renders as dark structure on a dark city — which is
 * the honest appearance of a system nobody is using, and is exactly what §3.7
 * means by "when idle, the world is genuinely darker".
 *
 * THE REFERENCE'S APEX IS THE ONE PLACE I DEPARTED ON PURPOSE
 * Reference 01 puts a bright plasma at the top of the stack at all times. Under
 * the glow rule that is only permissible while something is actually measuring
 * — so the core here is bound to the real edge round-trip and the live event
 * rate. On a healthy connected session it looks like the reference. On a dead
 * one it does not, and it should not.
 */
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Core } from '../kit/Core.tsx';
import { Conduit, type ConduitPacket } from '../kit/Conduit.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, glowFromLatency, type Glow } from '../kit/glow.ts';
import { STACK, SATELLITES, satelliteRoute } from './enter.ts';

export type EnterSceneProps = {
  /**
   * Real measured edge round trip, or null when it has not been measured.
   * Drives the apex core, exactly as §2.2 describes the arrival beat.
   */
  edgeRttMs: number | null;
  /** Events seen per layer id. Absent means none — which means unlit. */
  activityByTier?: Record<string, number>;
  /** Real packets in flight, from the event store. */
  packets?: ConduitPacket[];
  reducedMotion?: boolean;
  /** From the active quality tier. */
  cityBlocks?: number;
  maxBeads?: number;
  /** Shared with the DOM overlay outside the Canvas. */
  projection: LabelProjection;
};

/**
 * The scene's annotations, derived from the same data the geometry uses.
 *
 * Exported so the DOM overlay and the 3D scene are provably reading ONE list
 * rather than two hand-synced copies. A label that points at nothing is the
 * classic failure of annotated 3D, and it happens when the two drift.
 */
export function enterAnchors(): LabelAnchor[] {
  const out: LabelAnchor[] = [];

  for (const tier of STACK) {
    // Anchored at the tier's left edge, where the reference's leader rules
    // meet the geometry.
    /*
     * Held OUT from the plate, not on its edge. Anchoring at -size/2 put the
     * label on top of the geometry at this oblique angle; the reference keeps
     * the annotation column clear of the stack and lets the leader rule span
     * the gap. The offset scales with the tier so the column stays straight
     * as the ziggurat widens toward its base.
     */
    out.push({
      id: `tier:${tier.id}`,
      at: [-tier.size[0] / 2 - 1, tier.y + 0.5, tier.size[1] / 2 - 2],
      label: tier.label,
      detail: tier.detail,
      side: 'left',
    });
  }

  for (const satellite of SATELLITES) {
    out.push({
      id: `sat:${satellite.id}`,
      at: satellite.at,
      label: satellite.label,
      detail: satellite.detail,
      side: 'right',
      tone: satellite.tint,
    });
  }

  return out;
}

export function EnterScene({
  edgeRttMs,
  activityByTier = {},
  packets = [],
  reducedMotion = false,
  cityBlocks = 420,
  maxBeads = 48,
  projection,
}: EnterSceneProps) {
  /*
   * The apex. Bound to the real round trip: a fast edge is a bright core, an
   * unmeasured one is a dark core. `glowFromLatency` returns DARK for null,
   * so there is no branch here that could accidentally light it.
   */
  const apex: Glow = glowFromLatency(edgeRttMs, 300);

  return (
    <>
      {/*
        Terrain. Not telemetry, and it never moves — see CityField's header.
        Sunk slightly so the stack's base plate reads as sitting ON the city
        rather than floating over it.
      */}
      <CityField count={cityBlocks} position={[0, -2.4, 0]} radius={210} innerRadius={52} />

      {/* The stepped stack. Seven Plates, one Core. */}
      {STACK.map((tier) => {
        const events = activityByTier[tier.id];
        return (
          <Plate
            key={tier.id}
            size={tier.size}
            thickness={0.5}
            position={[0, tier.y, 0]}
            material="pcb"
            /*
             * `undefined` here means this layer saw no events, which is not
             * the same as seeing zero — glowFromActivity(undefined ?? null)
             * would be a coercion, so the absent case is passed as DARK
             * explicitly.
             */
            glow={events === undefined ? DARK : glowFromActivity(events)}
            tint={tier.tint}
            rim={PALETTE.structure}
            windows={tier.windows}
          />
        );
      })}

      <Core
        position={[0, 9.6, 0]}
        radius={0.85}
        glow={apex}
        colour={PALETTE.record}
        shaftHeight={12}
        shafts={3}
        reducedMotion={reducedMotion}
      />

      {/* Satellites: a small plate and a small core each, reusing the kit. */}
      {SATELLITES.map((satellite) => {
        const [x, y, z] = satellite.at;
        const lit = activityByTier[satellite.fromTier];
        const satelliteGlow = lit === undefined ? DARK : glowFromActivity(lit);
        return (
          <group key={satellite.id}>
            <Plate
              size={[3.2, 3.2]}
              thickness={0.28}
              position={[x, y - 0.5, z]}
              material="pcb"
              glow={satelliteGlow}
              tint={satellite.tint}
              windows={1.4}
            />
            <Core
              position={[x, y + 0.3, z]}
              radius={0.42}
              glow={satelliteGlow}
              colour={satellite.tint}
              shaftHeight={0}
              reducedMotion={reducedMotion}
            />
          </group>
        );
      })}

      {/* Tethers. Beads only where a real duration was measured. */}
      {SATELLITES.map((satellite) => (
        <Conduit
          key={`route:${satellite.id}`}
          path={satelliteRoute(satellite)}
          packets={packets}
          maxBeads={maxBeads}
          colour={PALETTE.structure}
          restOpacity={0.18}
        />
      ))}

      <LabelProjector projection={projection} />
    </>
  );
}
