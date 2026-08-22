/**
 * 03 / DISSECTION. The 3D half.
 *
 * THIS IS WHERE `Plate`'s FROST MATERIAL EARNS ITS COST.
 * Stations 01 and 02 are circuit board — dark, matte, emissive detail. This one
 * is architectural glass, and the contrast between the two material languages
 * is most of why the reference's dissection reads as a DIAGRAM while its enter
 * frame reads as a PLACE. Both come out of one primitive with one parameter
 * changed, which is exactly what the shared kit was for.
 *
 * CONTINUOUS WORLD
 * The stack explodes upward out of the demo island's position, `STACK_ORIGIN`,
 * which is the same island the visitor selected at station 02 and the same
 * object they stood on at station 01. Nothing is rebuilt between stations; the
 * camera moves in and the layers separate.
 *
 * WHAT IS NEW HERE AND WHY IT IS LOCAL RATHER THAN KIT
 * The tapered drop arrows between slabs. They are reference 03's signature
 * connector and appear nowhere else in the set, so they live in this file. The
 * moment a second station needs them they move to the kit — but adding a
 * primitive to the shared kit that only one scene uses is how a shared kit
 * turns back into ten scenes.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Core } from '../kit/Core.tsx';
import { ChipField, type ChipSpec } from '../kit/Chip.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, type Glow } from '../kit/glow.ts';
import {
  LAYERS,
  TENANTS,
  STACK_ORIGIN,
  ISOLATION_AT,
  dropBetween,
  type Layer,
} from './dissection.ts';

export type DissectionSceneProps = {
  /** Events seen per layer id. Absent means none, which means unlit. */
  activityByLayer?: Record<string, number>;
  /** Layer the visitor has selected. Others recede. */
  selected?: string | null;
  reducedMotion?: boolean;
  cityBlocks?: number;
  projection: LabelProjection;
};

/**
 * A tapered arrow dropping from one slab to the next.
 *
 * Additive and unlit, like every other emissive thing here. It carries the
 * layer's own glow, so a layer nothing has touched has no arrow leaving it —
 * the connector is a claim about flow, and flow is a measurement.
 */
function DropArrow({
  at,
  height,
  colour,
  glow,
}: {
  at: [number, number, number];
  height: number;
  colour: string;
  glow: Glow;
}) {
  if (glow.intensity <= 0.05) return null;
  const opacity = 0.18 + glow.intensity * 0.5;

  return (
    <group position={at}>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[0.035, 0.035, height, 6]} />
        <meshBasicMaterial
          color={colour}
          toneMapped={false}
          transparent
          opacity={opacity * 0.7}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.28, 0.7, 8]} />
        <meshBasicMaterial
          color={colour}
          toneMapped={false}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/** Tiles laid out in a row across a slab, from the layer's real module list. */
function tilesFor(layer: Layer, lit: Glow): ChipSpec[] {
  const columns = Math.min(layer.tiles.length, 3);
  const spacing = 3.1;
  return layer.tiles.map((name, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    return {
      id: `${layer.id}:${name}`,
      position: [(col - (columns - 1) / 2) * spacing, 0, (row - 0.5) * 2.7],
      size: [1.55, 1.05],
      tint: layer.tint,
      glow: lit,
    } satisfies ChipSpec;
  });
}

/**
 * Annotations. The reference runs layer labels down the LEFT with hairline
 * leader rules, and the tenant chips out to the RIGHT under a bracket.
 */
export function dissectionAnchors(): LabelAnchor[] {
  const [ox, , oz] = STACK_ORIGIN;
  const out: LabelAnchor[] = [];

  for (const layer of LAYERS) {
    out.push({
      id: `layer:${layer.id}`,
      // Held out past the slab's left edge, where the reference's leader rules
      // begin. The offset scales with the slab so the column stays straight as
      // the stack widens downward.
      at: [ox - layer.size[0] / 2 - 4, layer.y + 0.5, oz + layer.size[1] / 2 - 1.5],
      label: `LAYER ${layer.index} · ${layer.label}`,
      detail: layer.detail,
      side: 'left',
    });
  }

  out.push({
    id: 'isolation',
    at: [ox + ISOLATION_AT[0] + 8, ISOLATION_AT[1] + 4.4, oz - 7],
    label: 'TENANT ISOLATION',
    detail: 'Row-level security. The boundary, not a filter.',
    side: 'right',
    tone: PALETTE.isolationCyan,
  });

  for (const tenant of TENANTS) {
    out.push({
      id: `tenant:${tenant.id}`,
      at: [ox + tenant.offset[0], ISOLATION_AT[1] + tenant.offset[1], oz + tenant.offset[2]],
      label: tenant.label,
      side: 'right',
      tone: PALETTE.isolationCyan,
    });
  }

  return out;
}

export function DissectionScene({
  activityByLayer = {},
  selected = null,
  reducedMotion = false,
  cityBlocks = 260,
  projection,
}: DissectionSceneProps) {
  const [ox, , oz] = STACK_ORIGIN;

  const layerGlow = useMemo(() => {
    const out = new Map<string, Glow>();
    for (const layer of LAYERS) {
      const events = activityByLayer[layer.id];
      out.set(layer.id, events === undefined ? DARK : glowFromActivity(events));
    }
    return out;
  }, [activityByLayer]);

  return (
    <>
      {/* The same ground the estate stands on. Far below, mostly fog. */}
      <CityField count={cityBlocks} position={[0, -2.4, 0]} radius={240} innerRadius={80} />

      {LAYERS.map((layer, i) => {
        const lit = layerGlow.get(layer.id) ?? DARK;
        /*
         * Selection recedes the others. This is interface state, not system
         * state, so it changes OPACITY and never colour — a dimmed layer must
         * not be mistakable for an idle one.
         */
        const recede = selected !== null && selected !== layer.id;
        const lower = LAYERS[i + 1];

        return (
          <group key={layer.id}>
            <group position={[ox, layer.y, oz]} scale={recede ? 0.97 : 1}>
              <Plate
                size={layer.size}
                thickness={0.55}
                material="frost"
                glow={lit}
                tint={layer.tint}
                rim={PALETTE.structure}
                /*
                 * The reference's top-to-bottom glass gradient, finally wired.
                 * `frost` was declared per layer and never passed through, so
                 * all seven slabs rendered at the same value and the stack read
                 * as seven identical sheets instead of a section through one
                 * object.
                 */
                lift={layer.frost * 0.2}
                opacity={0.42 + layer.frost * 0.38}
              />
              <ChipField chips={tilesFor(layer, lit)} height={0.34} />
            </group>

            {/* Drop to the next slab down. */}
            {lower ? (
              <DropArrow
                at={[ox, dropBetween(layer, lower).y, oz]}
                height={dropBetween(layer, lower).height}
                colour={layer.tint}
                glow={lit}
              />
            ) : null}
          </group>
        );
      })}

      {/*
        The service mesh core, inside the core-services slab. The reference puts
        a violet emitter there and lights the layer from within.
      */}
      <Core
        position={[ox, 11, oz]}
        radius={0.42}
        glow={layerGlow.get('services') ?? DARK}
        colour={PALETTE.record}
        shaftHeight={0}
        reducedMotion={reducedMotion}
      />

      {/*
        TENANT VOLUMES AND THE ISOLATION BOUNDARY.

        The only isolation-cyan in the frame, and the only place it appears at
        any station so far. Each tenant is a small shell at the services layer's
        height, flown out to the right exactly as the reference brackets them.
        They are lit by the services layer's own activity, because a tenant with
        no traffic is not a tenant doing anything.
      */}
      {TENANTS.map((tenant) => {
        const lit = layerGlow.get('services') ?? DARK;
        return (
          <group
            key={tenant.id}
            position={[
              ox + tenant.offset[0],
              ISOLATION_AT[1] + tenant.offset[1],
              oz + tenant.offset[2],
            ]}
          >
            <mesh>
              <boxGeometry args={[1.9, 1.2, 1.9]} />
              <meshBasicMaterial
                color={PALETTE.isolationCyan}
                toneMapped={false}
                transparent
                opacity={0.06 + lit.intensity * 0.14}
                depthWrite={false}
              />
            </mesh>
            {/* The shell's edges: the boundary itself, always legible. */}
            <lineSegments>
              <edgesGeometry args={[new THREE.BoxGeometry(1.9, 1.2, 1.9)]} />
              <lineBasicMaterial
                color={PALETTE.isolationCyan}
                transparent
                opacity={0.35 + lit.intensity * 0.45}
                toneMapped={false}
              />
            </lineSegments>
          </group>
        );
      })}

      <LabelProjector projection={projection} />
    </>
  );
}
