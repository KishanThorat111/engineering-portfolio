/**
 * THE PRODUCTION WORLD. One canvas, ten stations, one take.
 *
 * This is what the dev bench was verifying against. The bench proves a station
 * in isolation; this is the thing a visitor actually sees, and it imports the
 * SAME scene components — there is no second implementation of any station and
 * there must never be one.
 *
 * ONE CANVAS FOR THE LIFE OF THE PAGE (§3.8)
 * The canvas is created once and never unmounted. Moving between stations
 * changes which scenes are mounted inside it and where the camera is; it never
 * recreates the renderer, because tearing down a WebGL context reads as a cut
 * and a cut is the one thing this surface exists not to do.
 *
 * ONLY NEARBY STATIONS ARE MOUNTED
 * Ten scenes at once is ten scenes' worth of geometry for a frame that shows
 * one. Each station declares its neighbours implicitly by index, and the world
 * mounts the current station plus one either side — enough that a camera in
 * flight always has its destination already built, and never more. This is the
 * offscreen-pausing requirement and the reason the frame budget survives
 * having ten stations rather than one.
 *
 * WHY THE OLD `Scene`/`World` IS NO LONGER MOUNTED
 * It rendered the three-plane lattice that stations 01–10 replace. Leaving it
 * running underneath would mean paying for two worlds and showing a hybrid of
 * the old design and the new one, which is exactly what this integration was
 * asked to end. The membrane shader it introduced is retained in
 * `render/shaders.ts` and is still the isolation material.
 */
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { PALETTE } from '../render/shaders.ts';
import { QualityGovernor, initialTier, settingsFor } from '../render/quality.ts';
import { useWorld } from '../state/store.ts';

import { CameraRig } from '../kit/CameraRig.tsx';
import { BloomPass } from '../kit/BloomPass.tsx';
import { STATIONS, stationById, type StationId } from '../kit/stations.ts';
import { createLabelProjection } from '../kit/LabelLayer.tsx';

import { EnterScene } from '../scenes/EnterScene.tsx';
import { SystemsScene } from '../scenes/SystemsScene.tsx';
import { DissectionScene } from '../scenes/DissectionScene.tsx';
import { DataScene } from '../scenes/DataScene.tsx';
import { LabScene } from '../scenes/LabScene.tsx';
import { LiveScene } from '../scenes/LiveScene.tsx';
import { ThinkScene } from '../scenes/ThinkScene.tsx';
import { BuildScene } from '../scenes/BuildScene.tsx';
import { ProofScene } from '../scenes/ProofScene.tsx';
import { EndScene } from '../scenes/EndScene.tsx';
import { useStationData } from './useStationData.ts';

/** One projection per station, created once for the life of the page. */
export const PROJECTIONS: Record<StationId, ReturnType<typeof createLabelProjection>> = {
  enter: createLabelProjection(),
  systems: createLabelProjection(),
  dissection: createLabelProjection(),
  data: createLabelProjection(),
  lab: createLabelProjection(),
  live: createLabelProjection(),
  think: createLabelProjection(),
  build: createLabelProjection(),
  proof: createLabelProjection(),
  end: createLabelProjection(),
};

const ORDER: StationId[] = STATIONS.map((s) => s.id);

/** Feeds the real frame report into the store, so 05 can report it honestly. */
function FrameReporter({ governor }: { governor: QualityGovernor }) {
  const setTier = useWorld((s) => s.setTier);
  const setFrame = useWorld((s) => s.setFrame);
  const last = useRef(0);

  useFrame((_, delta) => {
    governor.sample(delta * 1000);
    const report = governor.report;
    // Push only when the window rolls, not every frame.
    if (report.samples > 0 && report.p95 !== last.current) {
      last.current = report.p95;
      setFrame({ p50: report.p50, p95: report.p95, fps: report.fps });
      if (report.tier !== undefined) setTier(report.tier, report.reason);
    }
  });

  return null;
}

/** Pauses rendering when the tab is hidden. A hidden canvas earns nothing. */
function OffscreenPause() {
  const { invalidate, setFrameloop } = useThree();
  useEffect(() => {
    const onVisibility = () => {
      setFrameloop(document.hidden ? 'never' : 'always');
      if (!document.hidden) invalidate();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [invalidate, setFrameloop]);
  return null;
}

function Stations({ active, reducedMotion }: { active: StationId; reducedMotion: boolean }) {
  const data = useStationData();
  const tier = useWorld((s) => s.tier);
  const quality = useMemo(() => settingsFor(tier), [tier]);

  const index = ORDER.indexOf(active);
  /*
   * Current station plus one either side. A camera in flight always has its
   * destination built before it arrives, and nothing further away is paid for.
   */
  const mounted = useMemo(() => {
    const set = new Set<StationId>();
    for (let i = index - 1; i <= index + 1; i += 1) {
      const id = ORDER[Math.max(0, Math.min(ORDER.length - 1, i))];
      if (id) set.add(id);
    }
    return set;
  }, [index]);

  const cityBlocks = quality.tier === 1 ? 140 : quality.tier === 2 ? 300 : 460;
  const fieldPoints = quality.tier === 1 ? 1200 : quality.tier === 2 ? 3200 : 5200;

  return (
    <>
      {mounted.has('enter') ? (
        <EnterScene
          edgeRttMs={data.edgeRttMs}
          activityByTier={data.activityByLayer}
          packets={data.packets}
          reducedMotion={reducedMotion}
          cityBlocks={cityBlocks}
          maxBeads={quality.maxPackets}
          projection={PROJECTIONS.enter}
        />
      ) : null}

      {mounted.has('systems') ? (
        <SystemsScene
          activityByIsland={data.activityByIsland}
          packets={data.packets}
          reducedMotion={reducedMotion}
          cityBlocks={cityBlocks}
          maxBeads={quality.maxPackets}
          projection={PROJECTIONS.systems}
        />
      ) : null}

      {mounted.has('dissection') ? (
        <DissectionScene
          activityByLayer={data.activityByLayer}
          reducedMotion={reducedMotion}
          cityBlocks={Math.round(cityBlocks * 0.6)}
          projection={PROJECTIONS.dissection}
        />
      ) : null}

      {mounted.has('data') ? (
        <DataScene
          hopMs={data.hopMs}
          denied={data.lastOutcomeDenied}
          reducedMotion={reducedMotion}
          cityBlocks={Math.round(cityBlocks * 0.6)}
          projection={PROJECTIONS.data}
        />
      ) : null}

      {mounted.has('lab') ? (
        <LabScene
          frameMs={data.frameMs}
          activityByZone={data.activityByZone}
          reducedMotion={reducedMotion}
          projection={PROJECTIONS.lab}
          fieldPoints={fieldPoints}
        />
      ) : null}

      {mounted.has('live') ? (
        <LiveScene
          edgeRttMs={data.edgeRttMs}
          edgeGeo={null}
          activityByPlatform={data.activityByIsland}
          packets={data.packets}
          reducedMotion={reducedMotion}
          projection={PROJECTIONS.live}
        />
      ) : null}

      {mounted.has('think') ? (
        <ThinkScene reducedMotion={reducedMotion} projection={PROJECTIONS.think} />
      ) : null}

      {mounted.has('build') ? (
        <BuildScene
          reducedMotion={reducedMotion}
          projection={PROJECTIONS.build}
          packets={data.packets}
        />
      ) : null}

      {mounted.has('proof') ? (
        <ProofScene
          open={data.openDrawer}
          reducedMotion={reducedMotion}
          projection={PROJECTIONS.proof}
        />
      ) : null}

      {mounted.has('end') ? (
        <EndScene
          eventCount={data.eventCount}
          visited={data.visited}
          packets={data.packets}
          reducedMotion={reducedMotion}
          projection={PROJECTIONS.end}
        />
      ) : null}
    </>
  );
}

export function StationWorld() {
  const active = useWorld((s) => s.narrative);
  const reducedMotion = useWorld((s) => s.reducedMotion);
  const tier = useWorld((s) => s.tier);
  const setTier = useWorld((s) => s.setTier);

  const governor = useMemo(() => new QualityGovernor(initialTier(), setTier), [setTier]);
  const quality = useMemo(() => settingsFor(tier), [tier]);
  const station = stationById(active);

  return (
    <Canvas
      camera={{ fov: station.fov, near: 0.1, far: 460 }}
      gl={{
        antialias: quality.antialias,
        powerPreference: 'high-performance',
        // The document behind the canvas is the accessible version of this
        // page; the canvas must not paint over it opaquely on failure.
        alpha: false,
      }}
      dpr={[1, quality.pixelRatio]}
      /*
       * NoToneMapping. This world is emissive-driven and authored in display
       * values; ACES only crushes it, and BloomPass owns the final encode.
       */
      flat
    >
      <color attach="background" args={[PALETTE.dark]} />
      <fog attach="fog" args={[PALETTE.dark, 45, 300]} />
      <ambientLight intensity={0.1} />

      <FrameReporter governor={governor} />
      <OffscreenPause />
      <CameraRig station={station} reducedMotion={reducedMotion} />

      {/*
        Suspense with a null fallback: a station that is still resolving shows
        the world it is already in rather than a loading state. There are no
        loading screens in a continuous take.
      */}
      <Suspense fallback={null}>
        <Stations active={active} reducedMotion={reducedMotion} />
      </Suspense>

      {/* Bloom is the tier-gated effect. Tier 1 renders the scene straight. */}
      <BloomPass
        enabled={quality.bloom}
        strength={0.7}
        threshold={0.5}
        radius={quality.bloomResolutionScale > 0.5 ? 1.4 : 1.1}
      />
    </Canvas>
  );
}

/** Exposed for the render-verification harness. */
export const WORLD_STATION_IDS = ORDER;
export const WORLD_VECTOR = THREE.Vector3;
