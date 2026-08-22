/**
 * 09 / PROOF. The engineering archive.
 *
 * WHAT THE REFERENCE SHOWS
 * A machine room. One archive cabinet centre-frame on a plinth, its door swung
 * open, seven edge-lit drawers glowing inside, server racks receding into
 * darkness. Camera at chest height, close. The drawers are the only significant
 * light source and they spill onto the cabinet interior — beautifully
 * motivated, and cheap.
 *
 * THE ARCHIVE IS GENUINELY FULL, AND THAT IS THE STATION
 * Every drawer opens onto something this repository actually contains:
 * decisions, evidence chips, lessons, migrations, integration tests, phase-log
 * entries, disclosed limitations. Counted at build time, not asserted.
 *
 * The reference's own numbers — 7,842 cases, 128K artifacts, 14.6K decisions,
 * 22.1K tests — are two orders of magnitude larger and entirely invented.
 * Reproducing that scale would require inventing the archive it is supposed to
 * prove. Twelve decisions a person actually wrote and can be read in full is a
 * stronger exhibit than fourteen thousand that cannot, so the drawers are
 * designed for two-digit counts and the frame is composed for a cabinet you
 * could actually empty.
 *
 * DRAWER COLOUR
 * The reference gives each drawer its own hue — seven colours, which would
 * spend the entire register on one object and mean nothing. They are all
 * `record`, at varying luminance by how full each is. Record is exactly what
 * they contain.
 */
import * as THREE from 'three';
import { PALETTE } from '../render/shaders.ts';
import { Housing } from '../kit/Housing.tsx';
import { Plate } from '../kit/Plate.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, type Glow } from '../kit/glow.ts';

/** The machine room sits below the estate, reached by descending. */
export const ARCHIVE_ORIGIN: [number, number, number] = [0, -40, 0];

export type Drawer = {
  id: string;
  index: string;
  label: string;
  /** What it actually holds, counted at build time. */
  count: number;
  /** Where the reader can go and read it. */
  href: string | null;
};

/**
 * Seven drawers, matching the reference's count exactly. Every figure here is
 * a count of files in this repository as of 22 Aug 2026.
 */
export const DRAWERS: Drawer[] = [
  { id: 'architecture', index: '01', label: 'ARCHITECTURE', count: 3, href: '/systems' },
  { id: 'decisions', index: '02', label: 'DECISIONS', count: 12, href: '/engineering' },
  { id: 'evidence', index: '03', label: 'EVIDENCE', count: 5, href: '/engineering' },
  { id: 'tests', index: '04', label: 'TESTS', count: 14, href: null },
  { id: 'migrations', index: '05', label: 'MIGRATIONS', count: 4, href: null },
  { id: 'operations', index: '06', label: 'OPERATIONS', count: 21, href: null },
  { id: 'lessons', index: '07', label: 'LESSONS', count: 2, href: '/engineering' },
];

export type ProofSceneProps = {
  /** Which drawer is pulled out. */
  open?: string | null;
  reducedMotion?: boolean;
  projection: LabelProjection;
};

export function proofAnchors(): LabelAnchor[] {
  const [ox, oy, oz] = ARCHIVE_ORIGIN;
  const out: LabelAnchor[] = [
    {
      id: 'archive',
      at: [ox, oy + 7.4, oz],
      label: 'ENGINEERING ARCHIVE',
      detail: 'Every drawer opens on something in this repository',
      side: 'right',
      tone: PALETTE.record,
    },
  ];
  for (const [i, drawer] of DRAWERS.entries()) {
    out.push({
      id: `drawer:${drawer.id}`,
      at: [ox - 4.2, oy + 5 - i * 0.78, oz + 2.6],
      label: `${drawer.index} ${drawer.label}`,
      detail: `${drawer.count}`,
      side: 'left',
      tone: PALETTE.record,
    });
  }
  return out;
}

export function ProofScene({ open = null, reducedMotion = false, projection }: ProofSceneProps) {
  const [ox, oy, oz] = ARCHIVE_ORIGIN;

  /*
   * The cabinet's own light is the sum of what it holds. It is full, so it is
   * lit — and unlike every other station this glow needs no live plane, because
   * the measurement is a count of committed files rather than of traffic.
   */
  const total = DRAWERS.reduce((sum, d) => sum + d.count, 0);
  const cabinetGlow: Glow = glowFromActivity(total, 70);

  return (
    <>
      {/*
        Server racks receding. The city field with a tall, narrow, dense profile
        reads as a machine room — same primitive, different parameters, which is
        the whole argument for having a kit.
      */}
      <CityField
        count={150}
        position={[ox, oy - 3.2, oz]}
        radius={70}
        innerRadius={16}
        maxHeight={11}
        seed={9021}
      />

      {/* Plinth. */}
      <Plate
        size={[13, 11]}
        thickness={0.8}
        position={[ox, oy - 2.6, oz]}
        material="pcb"
        glow={cabinetGlow}
        tint={PALETTE.record}
        /* Sparse. In the reference the drawers are the ONLY real light here. */
        windows={0.4}
      />

      {/* The cabinet body. */}
      <Housing
        size={[7.6, 8, 6.4]}
        position={[ox, oy + 2, oz]}
        glow={cabinetGlow}
        seam={PALETTE.record}
      />

      {/* The open door, hinged to the left. */}
      <group position={[ox - 3.8, oy + 2, oz + 3.2]} rotation={[0, Math.PI / 2.6, 0]}>
        <mesh position={[-1.9, 0, 0]}>
          <boxGeometry args={[3.8, 7.4, 0.3]} />
          <meshBasicMaterial color="#12161f" toneMapped={false} />
        </mesh>
        <lineSegments position={[-1.9, 0, 0]}>
          <edgesGeometry args={[new THREE.BoxGeometry(3.8, 7.4, 0.3)]} />
          <lineBasicMaterial
            color={PALETTE.structure}
            transparent
            opacity={0.4}
            toneMapped={false}
          />
        </lineSegments>
      </group>

      {/*
        The drawers. Each slides out when selected, and each is lit by how much
        it actually holds — the LESSONS drawer with two entries is visibly
        dimmer than DECISIONS with twelve, which is a true statement about this
        repository rather than a design choice.
      */}
      {DRAWERS.map((drawer, i) => {
        const y = oy + 5 - i * 0.78;
        const pulled = open === drawer.id;
        const z = oz + 3.1 + (pulled && !reducedMotion ? 1.9 : 0);
        const fill = glowFromActivity(drawer.count, 16);
        return (
          <group key={drawer.id} position={[ox, y, z]}>
            <mesh>
              <boxGeometry args={[5.9, 0.5, 5.2]} />
              <meshBasicMaterial color="#151a24" toneMapped={false} />
            </mesh>
            {/* The lit edge — the reference's whole material idea. */}
            <mesh position={[0, 0, 2.7]}>
              <boxGeometry args={[5.7, 0.2, 0.1]} />
              <meshBasicMaterial
                color={PALETTE.record}
                toneMapped={false}
                transparent
                opacity={0.3 + fill.intensity * 0.7}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Interior spill: one light inside the cabinet, from the drawers. */}
      <pointLight
        position={[ox, oy + 2, oz + 2]}
        color={PALETTE.record}
        distance={26}
        decay={2}
        intensity={cabinetGlow.intensity * 10}
      />

      <LabelProjector projection={projection} />
    </>
  );
}

/** Total count, for the overlay's stat rail. Never asserted, always summed. */
export const ARCHIVE_TOTAL = DRAWERS.reduce((sum, d) => sum + d.count, 0);
export const UNLIT: Glow = DARK;
