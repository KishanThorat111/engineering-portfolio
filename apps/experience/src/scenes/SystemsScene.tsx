/**
 * REFERENCE 02 — SYSTEMS. The 3D half.
 *
 * Reuses the kit wholesale: `Plate` for islands, `ChipField` for the service
 * clusters the reference floats around each one, `Core` for the emitters,
 * `Conduit` for the routes from the shared core, `CityField` for the same
 * ground reference 01 stands on, and `LabelProjector` for every word.
 *
 * ONE WORLD, NOT TWO SCENES — this is the continuous-world rule made concrete.
 * The ENTER stack and these islands occupy the SAME coordinate space and the
 * SAME ground plane. The demo island at [-14, 0, 20] is the object the visitor
 * was standing on at station 01; travelling from 01 to 02 is a camera move
 * that pulls back until that stack is one node of four, exactly as dossier
 * §2.7 describes the scale reveal. Nothing is rebuilt between the two.
 *
 * THE RING CORE
 * The reference's centre is a stack of concentric machined discs with an
 * emitter above them. Built from `Plate` at ring proportions rather than a new
 * primitive, because a disc is a plate with a different footprint and adding a
 * bespoke object here would be the first crack in the shared system.
 */
import { useMemo } from 'react';
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Core } from '../kit/Core.tsx';
import { Conduit, type ConduitPacket } from '../kit/Conduit.tsx';
import { CityField } from '../kit/CityField.tsx';
import { ChipField, type ChipSpec } from '../kit/Chip.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, type Glow } from '../kit/glow.ts';
import { ISLANDS, CORE, STATUS_TONE, islandRoute, type Island } from './systems.ts';

export type SystemsSceneProps = {
  /**
   * Events seen per island id. Absent means none, which means unlit — the
   * pre-launch platform genuinely has no traffic, and the reference's
   * uniformly bright islands would be a claim that it does.
   */
  activityByIsland?: Record<string, number>;
  packets?: ConduitPacket[];
  reducedMotion?: boolean;
  cityBlocks?: number;
  maxBeads?: number;
  projection: LabelProjection;
  activeId?: string | null;
};

/** Chips laid out in a grid on an island, from its real subsystem list. */
function chipsFor(island: Island, lit: Glow): ChipSpec[] {
  const columns = 3;
  return island.chips.map((name, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      id: `${island.id}:${name}`,
      position: [(col - 1) * 2.3, 0, (row - 0.5) * 2.3],
      size: [1.5, 1.5],
      tint: island.tint,
      glow: lit,
    } satisfies ChipSpec;
  });
}

/**
 * The scene's annotations. Exported so the DOM overlay and the geometry read
 * one list — the same guarantee `enterAnchors` gives station 01.
 */
export function systemsAnchors(): LabelAnchor[] {
  const out: LabelAnchor[] = [];

  /*
   * Anchored high and to the RIGHT. Anchored left it projected straight across
   * the hero paragraph, because the core sits at the origin and the hero owns
   * the left third of this frame — the one place a centre-anchored label must
   * never point.
   */
  /*
   * LABEL ONLY, no detail line. The core sits at the origin, so whichever side
   * its label takes it crosses the estate; a full sentence there was drawn over
   * two islands at once. The sentence belongs in an instrument panel, where a
   * line of prose can be read. The world names the object.
   */
  out.push({
    id: 'core',
    at: [0, 6.5, 9],
    label: CORE.label,
    side: 'right',
  });

  for (const island of ISLANDS) {
    const [x, , z] = island.at;
    /*
     * NAME ONLY in the world. The register card beside it already carries the
     * description and the disclosed limitation; repeating them here laid a
     * paragraph of body text across the geometry and made both unreadable.
     * The world labels the object, the card explains it.
     */
    out.push({
      id: `island:${island.id}`,
      at: [x, island.labelHeight, z],
      label: island.title,
      // Left-hand islands annotate leftward, right-hand ones rightward, so the
      // leader rules radiate outward from the estate rather than crossing it.
      side: x < 0 ? 'left' : 'right',
      tone: STATUS_TONE[island.status],
    });
  }

  return out;
}

export function SystemsScene({
  activityByIsland = {},
  packets = [],
  reducedMotion = false,
  cityBlocks = 420,
  maxBeads = 40,
  projection,
}: SystemsSceneProps) {
  const islandGlow = useMemo(() => {
    const out = new Map<string, Glow>();
    for (const island of ISLANDS) {
      const events = activityByIsland[island.id];
      out.set(island.id, events === undefined ? DARK : glowFromActivity(events));
    }
    return out;
  }, [activityByIsland]);

  /*
   * The core's own light is the SUM of what the estate is doing. It is not a
   * separate measurement and it must not invent one: a core glowing over four
   * dark islands would be claiming activity nothing reported.
   */
  const coreActivity = ISLANDS.reduce<number | null>((sum, island) => {
    const events = activityByIsland[island.id];
    if (events === undefined) return sum;
    return (sum ?? 0) + events;
  }, null);
  const coreGlow = coreActivity === null ? DARK : glowFromActivity(coreActivity, 40);

  return (
    <>
      <CityField count={cityBlocks} position={[0, -2.4, 0]} radius={230} innerRadius={62} />

      {/* The shared core: concentric discs, then the emitter above them. */}
      {CORE.rings.map((ring, i) => (
        <Plate
          key={`ring-${i}`}
          shape="disc"
          size={[ring.radius * 2, ring.radius * 2]}
          thickness={ring.thickness}
          position={[0, ring.y, 0]}
          material="pcb"
          glow={coreGlow}
          tint={PALETTE.record}
          rim={PALETTE.structure}
          windows={1.6}
        />
      ))}

      <Core
        position={[0, 3.1, 0]}
        radius={0.9}
        glow={coreGlow}
        colour={PALETTE.record}
        shaftHeight={9}
        shafts={3}
        reducedMotion={reducedMotion}
      />

      {/* Four islands. */}
      {ISLANDS.map((island) => {
        const [x, y, z] = island.at;
        const lit = islandGlow.get(island.id) ?? DARK;
        return (
          <group key={island.id} position={[x, y, z]}>
            <Plate
              size={island.size}
              thickness={0.8}
              material="pcb"
              glow={lit}
              tint={island.tint}
              rim={PALETTE.structure}
              windows={1.7}
            >
              <ChipField chips={chipsFor(island, lit)} height={0.42} />
            </Plate>
            <Core
              position={[0, 2.4, 0]}
              radius={0.55}
              glow={lit}
              colour={STATUS_TONE[island.status]}
              shaftHeight={0}
              reducedMotion={reducedMotion}
            />
          </group>
        );
      })}

      {/* Routes from the shared core out to each island. */}
      {ISLANDS.map((island) => (
        <Conduit
          key={`route:${island.id}`}
          path={islandRoute(island)}
          packets={packets}
          maxBeads={maxBeads}
          colour={PALETTE.structure}
          restOpacity={0.2}
        />
      ))}

      <LabelProjector projection={projection} />
    </>
  );
}
