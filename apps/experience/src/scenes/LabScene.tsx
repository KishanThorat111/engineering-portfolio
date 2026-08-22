/**
 * 05 / LAB. The experimental ground.
 *
 * WHAT THE REFERENCE SHOWS
 * The densest frame in the set: a wide floor of decks at different heights, a
 * machined lab core at the centre with an orange-lit vent, a GPU point field
 * spilling off the near-left deck, a displaced shader surface on the right, a
 * network topology graph upper-right, and an AI-routing board of chips.
 *
 * WHAT MAKES THIS NOT SCI-FI DECORATION
 * Every zone is a real thing this renderer or this API actually does, and the
 * two headline readouts are the renderer measuring ITSELF — frame time and
 * point count are facts about the machine the visitor is holding, which makes
 * this the one station where a live number needs no backend at all. The zones
 * that describe the API (AI routing, load) are bound to real API state and go
 * dark without it.
 *
 * The field and the surface are genuine GPU work, not sprites: `Field` displaces
 * thousands of points in a vertex shader. The lab is a lab because the thing on
 * the bench is the renderer.
 */
import { PALETTE } from '../render/shaders.ts';
import { Plate } from '../kit/Plate.tsx';
import { Housing } from '../kit/Housing.tsx';
import { Core } from '../kit/Core.tsx';
import { Field } from '../kit/Field.tsx';
import { ChipField, type ChipSpec } from '../kit/Chip.tsx';
import { CityField } from '../kit/CityField.tsx';
import { LabelProjector, type LabelAnchor, type LabelProjection } from '../kit/LabelLayer.tsx';
import { DARK, glowFromActivity, type Glow } from '../kit/glow.ts';

/** The lab floor's centre, north-east of the estate. */
export const LAB_ORIGIN: [number, number, number] = [52, 0, -20];

export type LabZone = {
  id: string;
  label: string;
  detail: string;
  /** Offset from LAB_ORIGIN. */
  at: [number, number, number];
  deck: [number, number];
  tone: string;
  /** Whether this zone measures the renderer (always available) or the API. */
  source: 'renderer' | 'api';
};

export const ZONES: LabZone[] = [
  {
    id: 'gpu',
    label: 'GPU FIELD',
    detail: 'Vertex-shader displacement, thousands of points',
    at: [-16, 0, 8],
    deck: [16, 12],
    tone: PALETTE.record,
    source: 'renderer',
  },
  {
    id: 'shader',
    label: 'SHADER SURFACE',
    detail: 'The same field, displaced into a sheet',
    at: [17, 1.5, 6],
    deck: [15, 12],
    tone: PALETTE.structure,
    source: 'renderer',
  },
  {
    id: 'routing',
    label: 'AI COST ROUTING',
    detail: 'SQL-first. Escalates only when it must.',
    at: [15, 0, -12],
    deck: [13, 10],
    tone: PALETTE.record,
    source: 'api',
  },
  {
    id: 'load',
    label: 'LOAD BEHAVIOUR',
    detail: 'Rate limits, observed by hammering them',
    at: [-15, 0, -13],
    deck: [13, 10],
    tone: PALETTE.amber,
    source: 'api',
  },
];

export type LabSceneProps = {
  /**
   * Renderer self-measurement: sustained frame time. Always available, because
   * the renderer can always measure itself.
   */
  frameMs: number | null;
  /** Real API activity per zone id. Absent means unlit. */
  activityByZone?: Record<string, number>;
  /** Which experiment the visitor selected. */
  active?: string | null;
  reducedMotion?: boolean;
  projection: LabelProjection;
  /** From the quality tier — the field is the most scalable thing here. */
  fieldPoints?: number;
};

export function labAnchors(): LabelAnchor[] {
  const [ox, oy, oz] = LAB_ORIGIN;
  const out: LabelAnchor[] = [
    {
      id: 'lab-core',
      at: [ox, oy + 7.5, oz],
      label: 'LAB CORE',
      detail: 'Where the renderer measures itself',
      side: 'right',
    },
  ];
  for (const zone of ZONES) {
    out.push({
      id: `zone:${zone.id}`,
      at: [ox + zone.at[0], oy + zone.at[1] + 3.6, oz + zone.at[2]],
      label: zone.label,
      detail: zone.detail,
      side: zone.at[0] < 0 ? 'left' : 'right',
      tone: zone.tone,
    });
  }
  return out;
}

function routingChips(lit: Glow): ChipSpec[] {
  return ['INTENT', 'SQL PATH', 'BUDGET', 'MODEL PATH'].map((name, i) => ({
    id: `routing:${name}`,
    position: [(i % 2) * 3.4 - 1.7, 0, Math.floor(i / 2) * 3 - 1.5],
    size: [2.4, 1.7],
    tint: PALETTE.record,
    glow: lit,
  }));
}

export function LabScene({
  frameMs,
  activityByZone = {},
  active = null,
  reducedMotion = false,
  projection,
  fieldPoints = 4000,
}: LabSceneProps) {
  const [ox, oy, oz] = LAB_ORIGIN;

  /*
   * The lab core is lit by the renderer's own health: a fast frame time is a
   * bright core. This is the one glow in the whole world that cannot be dark
   * for lack of a backend, because the measurement is local — and it is still
   * a real measurement, so the rule holds exactly as written.
   */
  const coreGlow: Glow = frameMs === null ? DARK : glowFromActivity(Math.max(0, 34 - frameMs), 20);

  const zoneGlow = (zone: LabZone): Glow => {
    if (zone.source === 'renderer') return coreGlow;
    const events = activityByZone[zone.id];
    return events === undefined ? DARK : glowFromActivity(events);
  };

  return (
    <>
      <CityField count={200} position={[0, -2.4, 0]} radius={260} innerRadius={100} />

      {/* The lab floor. */}
      <Plate
        size={[52, 42]}
        thickness={0.4}
        position={[ox, oy - 1.4, oz]}
        material="pcb"
        glow={coreGlow}
        tint={PALETTE.structure}
        /* Sparse: the decks and the fields are the subject, not the floor. */
        windows={0.32}
      />

      {/* The lab core: a machined housing with a lit vent and an emitter. */}
      <Housing
        size={[7, 4.4, 6]}
        position={[ox, oy + 1.4, oz]}
        glow={coreGlow}
        seam={PALETTE.ember}
      />
      <Core
        position={[ox, oy + 5, oz]}
        radius={0.7}
        glow={coreGlow}
        colour={PALETTE.record}
        shaftHeight={8}
        shafts={3}
        reducedMotion={reducedMotion}
      />

      {ZONES.map((zone) => {
        const lit = zoneGlow(zone);
        const [zx, zy, zz] = zone.at;
        const dim = active !== null && active !== zone.id;
        return (
          <group key={zone.id} position={[ox + zx, oy + zy, oz + zz]}>
            <Plate
              size={zone.deck}
              thickness={0.45}
              material="pcb"
              glow={dim ? DARK : lit}
              tint={zone.tone}
              windows={0.7}
            />

            {/* The GPU field spills off its own deck. */}
            {zone.id === 'gpu' ? (
              <Field
                count={fieldPoints}
                radius={9}
                position={[0, 1.6, 0]}
                colourA={PALETTE.record}
                colourB={PALETTE.structure}
                glow={dim ? DARK : lit}
                mode="disc"
                reducedMotion={reducedMotion}
              />
            ) : null}

            {/* The shader surface: the same primitive, displaced into a sheet. */}
            {zone.id === 'shader' ? (
              <Field
                count={Math.round(fieldPoints * 0.9)}
                radius={7}
                position={[0, 2.4, 0]}
                colourA={PALETTE.structure}
                colourB={PALETTE.record}
                glow={dim ? DARK : lit}
                mode="surface"
                reducedMotion={reducedMotion}
                pointSize={1.9}
              />
            ) : null}

            {zone.id === 'routing' ? (
              <ChipField chips={routingChips(dim ? DARK : lit)} height={0.5} />
            ) : null}

            {/*
              Load behaviour: a stack of thin plates whose count is the real
              limit. Nothing animates it — a rate limit at rest is at rest.
            */}
            {zone.id === 'load'
              ? Array.from({ length: 5 }, (_, i) => (
                  <Plate
                    key={i}
                    size={[7 - i * 0.6, 5 - i * 0.4]}
                    thickness={0.22}
                    position={[0, 0.7 + i * 0.55, 0]}
                    material="pcb"
                    glow={dim ? DARK : lit}
                    tint={PALETTE.amber}
                    windows={1.1}
                  />
                ))
              : null}
          </group>
        );
      })}

      <LabelProjector projection={projection} />
    </>
  );
}
