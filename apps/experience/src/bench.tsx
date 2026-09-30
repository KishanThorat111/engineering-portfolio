/**
 * THE KIT BENCH — R1's gate. Dev only; never built, never shipped.
 *
 * R1 delivers the kit with no reference scene attached to it, which raises an
 * obvious question: how do you know it holds 60fps before there is anything to
 * look at? This is the answer. It composes the kit at ABOVE the density the
 * heaviest reference shows — reference 05 is the densest frame in the set, and
 * this bench deliberately exceeds it — so that a tier-2 measurement here is a
 * ceiling rather than an optimistic floor.
 *
 * WHAT IT IS ALSO FOR, AND ARGUABLY MORE IMPORTANTLY
 * The glow rule (C2) says nothing emits light unless it is carrying a real
 * measurement. That rule is only worth anything if its failure is visible, so
 * the bench includes a control: a row of plates and chips given `DARK` — the
 * honest representation of unmeasured — next to an identical row given real
 * measurements. If those two rows ever look the same, the rule has been broken
 * somewhere in the kit and the bench says so at a glance.
 *
 * The measurements driving the lit half are synthetic, and the bench SAYS SO
 * on screen. That is not a violation of the glow rule: the rule constrains what
 * the world may claim to a visitor, and this page is not the world. Labelling
 * it is the same instinct that makes the demo plane label itself (§7.4).
 */
import { StrictMode, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import { BloomPass } from './kit/BloomPass.tsx';
import { STATIONS, type Station, type StationId } from './kit/stations.ts';
import { CameraRig } from './kit/CameraRig.tsx';
import { Plate } from './kit/Plate.tsx';
import { ChipField, type ChipSpec } from './kit/Chip.tsx';
import { Conduit, type ConduitPacket } from './kit/Conduit.tsx';
import { Core } from './kit/Core.tsx';
import {
  LabelProjector,
  LabelOverlay,
  createLabelProjection,
  type LabelAnchor,
} from './kit/LabelLayer.tsx';
import { InstrumentPanel } from './kit/InstrumentPanel.tsx';
import { DARK, glowFromActivity, glowFromLatency } from './kit/glow.ts';
import { PALETTE } from './render/shaders.ts';
import { EnterScene, enterAnchors } from './scenes/EnterScene.tsx';
import { SystemsScene, systemsAnchors } from './scenes/SystemsScene.tsx';
import { SystemsOverlay } from './scenes/SystemsOverlay.tsx';
import { DissectionScene, dissectionAnchors } from './scenes/DissectionScene.tsx';
import { DissectionOverlay } from './scenes/DissectionOverlay.tsx';
import { DataScene, dataAnchors } from './scenes/DataScene.tsx';
import { LabScene, labAnchors } from './scenes/LabScene.tsx';
import { LiveScene, liveAnchors } from './scenes/LiveScene.tsx';
import { ThinkScene, thinkAnchors } from './scenes/ThinkScene.tsx';
import { BuildScene, buildAnchors } from './scenes/BuildScene.tsx';
import { ProofScene, proofAnchors } from './scenes/ProofScene.tsx';
import { EndScene, endAnchors } from './scenes/EndScene.tsx';
import {
  DataOverlay,
  LabOverlay,
  LiveOverlay,
  ThinkOverlay,
  BuildOverlay,
  ProofOverlay,
  EndOverlay,
} from './scenes/overlays.tsx';
import { EnterOverlay } from './scenes/EnterOverlay.tsx';
import './styles.css';
import './kit/kit.css';
import './scenes/enter.css';
import './scenes/systems.css';
import './scenes/dissection.css';
import './scenes/stations.css';

/* Above reference 05's density, on purpose. */
const CHIPS_PER_PLATE = 18;
const PLATES = 7;
const CONDUITS = 24;

/*
 * Built with the optional keys omitted rather than set to undefined.
 * `exactOptionalPropertyTypes` is on in this workspace, and it is right to be:
 * "absent" and "present but undefined" are different, and this kit leans hard
 * on exactly that distinction elsewhere — a measurement of null is not a
 * measurement of zero.
 */
const benchAnchors: LabelAnchor[] = Array.from({ length: 14 }, (_, i) => {
  const anchor: LabelAnchor = {
    id: `label-${i}`,
    at: [
      Math.cos((i / 14) * Math.PI * 2) * 20,
      2 + (i % 4) * 2,
      Math.sin((i / 14) * Math.PI * 2) * 20,
    ],
    label: `ANCHOR ${String(i).padStart(2, '0')}`,
    side: i > 6 ? 'left' : 'right',
  };
  if (i % 3 === 0) {
    anchor.detail = 'real HTML, projected';
    anchor.tone = PALETTE.green;
  }
  return anchor;
});

function chipsFor(row: number, lit: boolean): ChipSpec[] {
  return Array.from({ length: CHIPS_PER_PLATE }, (_, i) => {
    const col = i % 6;
    const rank = Math.floor(i / 6);
    return {
      id: `r${row}-c${i}`,
      position: [(col - 2.5) * 1.5, 0, (rank - 1) * 1.5],
      size: [1.15, 1.15],
      tint: PALETTE.record,
      /*
       * The control. The unlit half is given DARK, which is what the kit
       * receives for a real event whose duration was never measured.
       */
      glow: lit ? glowFromActivity((i * 3 + row * 5) % 14) : DARK,
    } satisfies ChipSpec;
  });
}

const benchProjection = createLabelProjection();
const enterProjection = createLabelProjection();
const ENTER_ANCHORS = enterAnchors();
const systemsProjection = createLabelProjection();
const SYSTEMS_ANCHORS = systemsAnchors();
const dissectionProjection = createLabelProjection();
const DISSECTION_ANCHORS = dissectionAnchors();

/*
 * One projection per station. Module scope because a projection is a mutable
 * seam between two reconcilers, not React state — see LabelLayer.
 */
const P = {
  data: createLabelProjection(),
  lab: createLabelProjection(),
  live: createLabelProjection(),
  think: createLabelProjection(),
  build: createLabelProjection(),
  proof: createLabelProjection(),
  end: createLabelProjection(),
};

/** Synthetic hop timings: only the two stages this API really times. */
const HOPS: Record<string, number | null> = {
  client: null,
  edge: null,
  gateway: null,
  service: 34,
  cache: null,
  db: 22,
  response: null,
};
const DEAD_HOPS: Record<string, number | null> = {};
const FRAME_SERIES = [17.1, 16.8, 16.9, 17.4, 16.7, 16.6, 17.0, 16.8, 16.5, 16.9, 16.7, 16.6];
const LIVE_EVENTS = [
  { id: 'e1', action: 'records.read', outcome: 'allowed', at: '20:23' },
  { id: 'e2', action: 'isolation.attempt', outcome: 'denied', at: '20:23' },
  { id: 'e3', action: 'payments.webhook', outcome: 'allowed', at: '20:22' },
  { id: 'e4', action: 'tenant.provision', outcome: 'allowed', at: '20:21' },
];
const VISITED = ['enter', 'systems', 'dissection', 'data', 'lab', 'live'];

function Bench({ station, reducedMotion }: { station: Station; reducedMotion: boolean }) {
  const packets = useMemo<ConduitPacket[]>(
    () =>
      Array.from({ length: 40 }, (_, i) => ({
        id: `p${i}`,
        // Every fourth packet is unmeasured. Those must draw NOTHING. If the
        // bench ever shows forty beads instead of thirty, the honesty gate in
        // Conduit has regressed.
        durationMs: i % 4 === 0 ? null : 20 + (i % 9) * 30,
        outcome: i % 7 === 0 ? 'denied' : 'allowed',
        startedAt: -(i * 0.3),
      })),
    [],
  );

  const conduits = useMemo(
    () =>
      Array.from({ length: CONDUITS }, (_, i) => {
        const angle = (i / CONDUITS) * Math.PI * 2;
        const r = 22;
        return [
          [0, 8, 0],
          [Math.cos(angle) * r * 0.5, 5 + (i % 3) * 2, Math.sin(angle) * r * 0.5],
          [Math.cos(angle) * r, 1, Math.sin(angle) * r],
        ] as Array<[number, number, number]>;
      }),
    [],
  );

  return (
    <>
      <CameraRig station={station} reducedMotion={reducedMotion} />
      <ambientLight intensity={0.12} />
      <fog attach="fog" args={[PALETTE.dark, 40, 190]} />

      <Core
        position={[0, 9, 0]}
        radius={1.2}
        glow={glowFromLatency(38)}
        colour={PALETTE.record}
        shaftHeight={14}
        reducedMotion={reducedMotion}
      />

      {Array.from({ length: PLATES }, (_, i) => {
        const lit = i % 2 === 0;
        return (
          <Plate
            key={i}
            size={[11, 7]}
            thickness={0.4}
            position={[0, i * 2.2 - 4, 0]}
            material={i > 4 ? 'frost' : 'pcb'}
            glow={lit ? glowFromActivity(4 + i * 2) : DARK}
            tint={i > 3 ? PALETTE.ember : PALETTE.record}
            windows={i > 4 ? 0 : 1.1}
          >
            <ChipField chips={chipsFor(i, lit)} />
          </Plate>
        );
      })}

      {conduits.map((path, i) => (
        <Conduit key={i} path={path} packets={packets} maxBeads={24} />
      ))}

      <LabelProjector projection={benchProjection} />
    </>
  );
}

/*
 * R2 preview. The ENTER scene wired to the same synthetic measurements the
 * stress bench uses, so the composition can be checked against the reference
 * image before it is wired to a live control plane.
 *
 * `?scene=enter&dead=1` renders it with NO measurements at all. That is the
 * view that proves the glow rule: the same scene, same geometry, and a world
 * that is genuinely dark because nothing is happening in it.
 */
const params = new URLSearchParams(location.search);
const SCENE = params.get('scene') ?? 'enter';
const DEAD = params.get('dead') === '1';
/*
 * POST-PROCESSING IS OFF, AND THIS IS A FINDING RATHER THAN A PREFERENCE.
 *
 * @react-three/postprocessing 3.0.5 / postprocessing 6.39.4 / three 0.185.1 /
 * R3F 9.7.0 are all within each other's declared peer ranges, and the composer
 * still renders this scene roughly four times darker than no composer at all —
 * measured over the subject region, mean 5.9 against 23.1. Neither
 * `frameBufferType={HalfFloatType}` nor `flat` (NoToneMapping) moved the number
 * by a single unit, which rules out the two usual causes.
 *
 * Rather than ship a scene lit around a bug I do not understand, the glow the
 * reference needs is produced by geometry I control: additive halos on cores
 * and brighter emissive cells on plates. That is also CHEAPER — no extra render
 * targets per frame — which the mid-range 60fps budget cares about more than it
 * cares about a mip-blurred bloom.
 *
 * `?bloom=1` still mounts the composer, so the defect stays reproducible for
 * whoever picks this up. It is recorded as unresolved, not as fixed.
 */
const BLOOM = params.get('bloom') !== '0';

function EnterPreview({ reducedMotion }: { reducedMotion: boolean }) {
  const packets = useMemo<ConduitPacket[]>(
    () =>
      DEAD
        ? []
        : Array.from({ length: 18 }, (_, i) => ({
            id: `e${i}`,
            durationMs: i % 5 === 0 ? null : 18 + (i % 7) * 26,
            outcome: i % 6 === 0 ? 'denied' : 'allowed',
            startedAt: -(i * 0.45),
          })),
    [],
  );

  const activity = DEAD
    ? {}
    : {
        edge: 9,
        gateway: 14,
        auth: 6,
        services: 18,
        events: 11,
        data: 16,
        infrastructure: 4,
      };

  return (
    <EnterScene
      edgeRttMs={DEAD ? null : 34}
      activityByTier={activity}
      packets={packets}
      reducedMotion={reducedMotion}
      cityBlocks={420}
      projection={enterProjection}
    />
  );
}

function SystemsPreview({ reducedMotion }: { reducedMotion: boolean }) {
  const packets = useMemo<ConduitPacket[]>(
    () =>
      DEAD
        ? []
        : Array.from({ length: 16 }, (_, i) => ({
            id: `s${i}`,
            durationMs: i % 5 === 0 ? null : 22 + (i % 6) * 30,
            outcome: i % 8 === 0 ? 'denied' : 'allowed',
            startedAt: -(i * 0.5),
          })),
    [],
  );

  /*
   * The pre-launch platform is deliberately absent from this map, not set to
   * zero. It has no traffic, and `undefined` renders it as unlit structure
   * while `0` would render it as a measured idle — a different claim.
   */
  const activity = DEAD ? {} : { hospital: 17, menu: 11, demo: 6 };

  return (
    <SystemsScene
      activityByIsland={activity}
      packets={packets}
      reducedMotion={reducedMotion}
      projection={systemsProjection}
    />
  );
}

function DissectionPreview({ reducedMotion }: { reducedMotion: boolean }) {
  /*
   * The observability layer is deliberately absent rather than zero: nothing
   * has reported activity for it, and absent renders as unlit structure while
   * zero would render as a measured idle. Different claims.
   */
  const activity = DEAD
    ? {}
    : { client: 14, edge: 12, gateway: 16, services: 19, events: 9, persistence: 13 };

  return (
    <DissectionScene
      activityByLayer={activity}
      reducedMotion={reducedMotion}
      projection={dissectionProjection}
    />
  );
}

function BenchPage() {
  const [stationIndex, setStationIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const station = STATIONS[stationIndex]!;
  const isEnter = SCENE === 'enter';
  const isSystems = SCENE === 'systems';
  const isDissection = SCENE === 'dissection';
  const is = (id: string) => SCENE === id;
  const isScene =
    isEnter ||
    isSystems ||
    isDissection ||
    ['data', 'lab', 'live', 'think', 'build', 'proof', 'end'].includes(SCENE);

  return (
    <div style={{ position: 'fixed', inset: 0, background: PALETTE.dark }}>
      <Canvas
        camera={{ fov: station.fov, near: 0.1, far: 400 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        /*
         * NoToneMapping. R3F defaults to ACESFilmic, which is a filmic curve
         * designed for physically-lit scenes; this world is emissive-driven
         * and authored in display values, so the curve only crushes it.
         * Measured: it does not by itself explain the composer's dimming, but
         * it is the correct setting for this scene either way.
         */
        flat
      >
        <CameraRig station={station} reducedMotion={reducedMotion} />
        {isScene ? (
          <>
            <ambientLight intensity={0.1} />
            <fog attach="fog" args={[PALETTE.dark, 45, 260]} />
            {isEnter ? <EnterPreview reducedMotion={reducedMotion} /> : null}
            {isSystems ? <SystemsPreview reducedMotion={reducedMotion} /> : null}
            {isDissection ? <DissectionPreview reducedMotion={reducedMotion} /> : null}
            {is('data') ? (
              <DataScene
                hopMs={DEAD ? DEAD_HOPS : HOPS}
                denied={!DEAD}
                reducedMotion={reducedMotion}
                projection={P.data}
              />
            ) : null}
            {is('lab') ? (
              <LabScene
                frameMs={DEAD ? null : 16.8}
                activityByZone={DEAD ? {} : { routing: 12, load: 8 }}
                reducedMotion={reducedMotion}
                projection={P.lab}
                fieldPoints={4000}
              />
            ) : null}
            {is('live') ? (
              <LiveScene
                edgeRttMs={DEAD ? null : 34}
                edgeGeo={DEAD ? null : { lat: 19.08, lon: 72.88, label: 'BOM' }}
                activityByPlatform={DEAD ? {} : { hospital: 17, menu: 11, demo: 6 }}
                reducedMotion={reducedMotion}
                projection={P.live}
              />
            ) : null}
            {is('think') ? <ThinkScene reducedMotion={reducedMotion} projection={P.think} /> : null}
            {is('build') ? <BuildScene reducedMotion={reducedMotion} projection={P.build} /> : null}
            {is('proof') ? (
              <ProofScene open="decisions" reducedMotion={reducedMotion} projection={P.proof} />
            ) : null}
            {is('end') ? (
              <EndScene
                eventCount={DEAD ? null : 47}
                visited={VISITED}
                reducedMotion={reducedMotion}
                projection={P.end}
              />
            ) : null}
            {/*
              Bloom is not decoration here — it is how emissive detail at one
              or two pixels becomes visible at all. The reference's plates read
              as glowing because their lit cells bleed; without it the same
              geometry renders as flat dark slabs, which is exactly what the
              first pass looked like. Threshold is high so only genuinely
              emissive things bloom and the plate bodies never do (§3.7,
              "bloom and volumetrics: restrained").
            */}
            <BloomPass enabled={BLOOM} strength={0.7} threshold={0.5} radius={1.25} />
          </>
        ) : (
          <Bench station={station} reducedMotion={reducedMotion} />
        )}
      </Canvas>

      {isEnter ? (
        <LabelOverlay
          projection={enterProjection}
          anchors={ENTER_ANCHORS}
          maxDistance={120}
          /*
           * NO LEFT GUTTER at station 01, deliberately.
           *
           * Its architecture column is SUPPOSED to sit in the band between the
           * hero and the stack, extending leftward from each plate edge — that
           * is the reference's composition. Declaring a left gutter here made
           * every one of those labels flip to the right and land on the
           * geometry, which is worse than the problem it was solving. The
           * right gutter stays, because the capability satellites genuinely do
           * run off the frame edge without it.
           */
          gutterLeft={0}
          gutterRight={40}
          label="Architecture and capabilities"
        />
      ) : null}
      {isSystems ? (
        <LabelOverlay
          projection={systemsProjection}
          anchors={SYSTEMS_ANCHORS}
          maxDistance={150}
          /* Matches .systems__hero and .systems__column in systems.css. */
          gutterLeft={490}
          gutterRight={390}
          label="The estate"
        />
      ) : null}
      {isDissection ? (
        <LabelOverlay
          projection={dissectionProjection}
          anchors={DISSECTION_ANCHORS}
          maxDistance={170}
          /*
           * No left gutter, for the same reason station 01 has none: the layer
           * column is supposed to sit in the band left of the stack. Declaring
           * one flipped all seven labels onto the slabs.
           */
          gutterLeft={0}
          gutterRight={330}
          label="Architecture layers and tenants"
        />
      ) : null}
      {is('data') ? (
        <LabelOverlay
          projection={P.data}
          anchors={dataAnchors()}
          maxDistance={90}
          gutterLeft={470}
          gutterRight={330}
          label="Request stages"
        />
      ) : null}
      {is('lab') ? (
        <LabelOverlay
          projection={P.lab}
          anchors={labAnchors()}
          maxDistance={130}
          gutterLeft={470}
          gutterRight={330}
          label="Lab zones"
        />
      ) : null}
      {is('live') ? (
        <LabelOverlay
          projection={P.live}
          anchors={liveAnchors(DEAD ? null : 'BOM')}
          maxDistance={160}
          gutterLeft={470}
          gutterRight={330}
          label="Regions and control plane"
        />
      ) : null}
      {is('think') ? (
        <LabelOverlay
          projection={P.think}
          anchors={thinkAnchors()}
          maxDistance={80}
          gutterLeft={0}
          gutterRight={40}
          label="The desk"
        />
      ) : null}
      {is('build') ? (
        <LabelOverlay
          projection={P.build}
          anchors={buildAnchors()}
          maxDistance={130}
          gutterLeft={470}
          gutterRight={330}
          label="The next system"
        />
      ) : null}
      {is('proof') ? (
        <LabelOverlay
          projection={P.proof}
          anchors={proofAnchors()}
          maxDistance={60}
          gutterLeft={470}
          gutterRight={360}
          label="Archive drawers"
        />
      ) : null}
      {is('end') ? (
        <LabelOverlay
          projection={P.end}
          anchors={endAnchors(VISITED)}
          maxDistance={200}
          gutterLeft={470}
          gutterRight={60}
          label="Stations visited"
        />
      ) : null}
      {!isScene ? <LabelOverlay projection={benchProjection} anchors={benchAnchors} /> : null}

      {isEnter ? (
        <EnterOverlay
          edgeRttMs={DEAD ? null : 34}
          edgePop={DEAD ? null : 'BOM'}
          eventCount={DEAD ? 0 : 18}
          tenantRef={DEAD ? null : 'tnt_7f39a2c1'}
          tenantExpiresAt={DEAD ? null : new Date(Date.now() + 22 * 60000).toISOString()}
          source={DEAD ? 'unknown' : 'replay'}
          trace={
            DEAD
              ? null
              : {
                  action: 'records.read',
                  outcome: 'allowed',
                  durationMs: 34,
                  traceId: '7f39a2c188e2',
                  occurredAt: new Date().toISOString(),
                }
          }
          activeStation={station.id}
          onStation={(id) => setStationIndex(STATIONS.findIndex((s) => s.id === id))}
        />
      ) : null}

      {isSystems ? (
        <SystemsOverlay
          source={DEAD ? 'unknown' : 'replay'}
          activeStation={station.id}
          onStation={(id) => setStationIndex(STATIONS.findIndex((s) => s.id === id))}
        />
      ) : null}

      {isDissection ? (
        <DissectionOverlay
          source={DEAD ? 'unknown' : 'replay'}
          activeStation={station.id}
          onStation={(id) => setStationIndex(STATIONS.findIndex((s) => s.id === id))}
          eventCount={DEAD ? 0 : 47}
          slowestSpanMs={DEAD ? null : 82}
          deniedCount={DEAD ? 0 : 3}
          edgePop={DEAD ? null : 'BOM'}
          eventSeries={DEAD ? [] : [3, 5, 4, 8, 6, 11, 9, 14, 12, 17, 15, 19]}
          /*
           * Only the hops this system actually times carry a duration. The
           * reference prints seven confident numbers; six of them describe
           * measurements nothing takes.
           */
          hops={
            DEAD
              ? null
              : [
                  { id: 'client', durationMs: null },
                  { id: 'edge', durationMs: null },
                  { id: 'gateway', durationMs: null },
                  { id: 'service', durationMs: 34 },
                  { id: 'cache', durationMs: null },
                  { id: 'db', durationMs: 22 },
                  { id: 'response', durationMs: null },
                ]
          }
          totalMs={DEAD ? null : 61}
          counts={{ migrations: 4, tests: 14, layers: 7, demonstrations: 5 }}
        />
      ) : null}

      {(() => {
        const base = {
          source: (DEAD ? 'unknown' : 'replay') as 'live' | 'replay' | 'unknown',
          activeStation: station.id,
          onStation: (id: StationId) => setStationIndex(STATIONS.findIndex((s) => s.id === id)),
        };
        if (is('data'))
          return <DataOverlay {...base} hopMs={DEAD ? DEAD_HOPS : HOPS} denied={!DEAD} />;
        if (is('lab'))
          return (
            <LabOverlay
              {...base}
              frameMs={DEAD ? null : 16.8}
              points={4000}
              tier={2}
              active={null}
              frameSeries={DEAD ? [] : FRAME_SERIES}
            />
          );
        if (is('live'))
          return (
            <LiveOverlay
              {...base}
              edgeRttMs={DEAD ? null : 34}
              edgePop={DEAD ? null : 'BOM'}
              events={DEAD ? [] : LIVE_EVENTS}
            />
          );
        if (is('think')) return <ThinkOverlay {...base} />;
        if (is('build')) return <BuildOverlay {...base} />;
        if (is('proof')) return <ProofOverlay {...base} open="decisions" />;
        if (is('end')) return <EndOverlay {...base} visited={DEAD ? [] : VISITED} />;
        return null;
      })()}

      {/*
        The bench's own chrome is hidden while a reference scene is previewed.
        It was drawn on top of the hero in the first render, which made the
        composition impossible to judge — and judging the composition against
        the reference is the entire purpose of this page.
      */}
      <div
        style={{
          position: 'absolute',
          top: '1rem',
          left: '1rem',
          display: isScene ? 'none' : 'grid',
          gap: '0.75rem',
          width: '17rem',
        }}
      >
        <InstrumentPanel
          title="Kit bench — R1"
          tone={PALETTE.amber}
          source="unknown"
          readings={[
            { label: 'Plates', value: String(PLATES) },
            { label: 'Chips', value: String(PLATES * CHIPS_PER_PLATE) },
            { label: 'Conduits', value: String(CONDUITS) },
            { label: 'Station', value: station.reference },
            /* The unknown case, rendered on the panel that documents it. */
            { label: 'Real telemetry', value: null },
          ]}
        >
          <p
            style={{
              margin: '0.75rem 0 0',
              fontSize: '0.625rem',
              lineHeight: 1.5,
              color: 'var(--text-faint)',
            }}
          >
            Synthetic measurements, stated as such. Dev bench — not built, not shipped. The unlit
            plates and chips are the control: they were handed no measurement, so they emit no
            light.
          </p>
        </InstrumentPanel>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
          {STATIONS.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStationIndex(i)}
              style={{
                font: 'inherit',
                fontFamily: 'var(--font-mono, monospace)',
                fontSize: '0.625rem',
                padding: '0.25rem 0.4rem',
                background: i === stationIndex ? 'var(--signal)' : 'transparent',
                color: i === stationIndex ? '#0a0e15' : 'var(--text-muted)',
                border: '1px solid var(--border-strong, #2b3345)',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              {s.index}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setReducedMotion((v) => !v)}
            style={{
              font: 'inherit',
              fontFamily: 'var(--font-mono, monospace)',
              fontSize: '0.625rem',
              padding: '0.25rem 0.5rem',
              background: reducedMotion ? 'var(--pending)' : 'transparent',
              color: reducedMotion ? '#0a0e15' : 'var(--text-muted)',
              border: '1px solid var(--border-strong, #2b3345)',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            REDUCED MOTION {reducedMotion ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}

const container = document.getElementById('root');
if (!container) throw new Error('#root is missing from bench.html');
createRoot(container).render(
  <StrictMode>
    <BenchPage />
  </StrictMode>,
);
