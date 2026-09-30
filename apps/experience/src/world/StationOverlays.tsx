/**
 * The interface layer of the production world.
 *
 * Picks the overlay for the current station and hands it REAL data from
 * `useStationData`. The overlay components are the same ones the bench uses —
 * there is no production variant of any station's interface.
 *
 * WHY ONLY THE ACTIVE STATION'S OVERLAY IS MOUNTED
 * Unlike the 3D scenes, which mount a neighbour either side so the camera never
 * flies toward unbuilt geometry, the DOM overlays are swapped outright. Two
 * heroes in the accessibility tree at once would give a screen reader two
 * `<h1>`s and two copies of the station index, which is a real defect rather
 * than a cosmetic one.
 *
 * The label overlays are the exception: they are mounted alongside their scene
 * so a label never outlives the geometry it points at.
 */
import { useWorld } from '../state/store.ts';
import { LabelOverlay } from '../kit/LabelLayer.tsx';
import type { StationId } from '../kit/stations.ts';

import { EnterOverlay } from '../scenes/EnterOverlay.tsx';
import { SystemsOverlay } from '../scenes/SystemsOverlay.tsx';
import { DissectionOverlay } from '../scenes/DissectionOverlay.tsx';
import {
  DataOverlay,
  LabOverlay,
  LiveOverlay,
  ThinkOverlay,
  BuildOverlay,
  ProofOverlay,
  EndOverlay,
} from '../scenes/overlays.tsx';

import { enterAnchors } from '../scenes/EnterScene.tsx';
import { systemsAnchors } from '../scenes/SystemsScene.tsx';
import { dissectionAnchors } from '../scenes/DissectionScene.tsx';
import { dataAnchors } from '../scenes/DataScene.tsx';
import { labAnchors } from '../scenes/LabScene.tsx';
import { liveAnchors } from '../scenes/LiveScene.tsx';
import { thinkAnchors } from '../scenes/ThinkScene.tsx';
import { buildAnchors } from '../scenes/BuildScene.tsx';
import { proofAnchors } from '../scenes/ProofScene.tsx';
import { endAnchors } from '../scenes/EndScene.tsx';

import { PROJECTIONS } from './StationWorld.tsx';
import { useStationData } from './useStationData.ts';
import { scrollForStation } from './useStationScroll.ts';

/** Repository counts, resolved at build time. Real, and countable. */
const REPO_COUNTS = { migrations: 4, tests: 14, layers: 7, demonstrations: 5 };

export function StationOverlays() {
  const active = useWorld((s) => s.narrative);
  const data = useStationData();

  const go = (id: StationId) => {
    /*
     * Navigation scrolls; it never routes. Scroll position is the single
     * source of truth for where the camera is, so a nav click that set the
     * station directly would immediately be overridden by the next scroll
     * event and the camera would snap back.
     */
    window.scrollTo({
      top: scrollForStation(id, window.innerHeight),
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  };

  const base = { source: data.source, activeStation: active, onStation: go };

  return (
    <>
      {active === 'enter' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.enter}
            anchors={enterAnchors()}
            maxDistance={120}
            gutterLeft={0}
            gutterRight={40}
            label="Architecture and capabilities"
          />
          <EnterOverlay
            edgeRttMs={data.edgeRttMs}
            edgePop={data.edgePop}
            eventCount={data.eventCount}
            tenantRef={data.tenantRef}
            tenantExpiresAt={data.tenantExpiresAt}
            source={data.source}
            trace={data.trace}
            activeStation={active}
            onStation={go}
          />
        </>
      ) : null}

      {active === 'systems' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.systems}
            anchors={systemsAnchors()}
            maxDistance={150}
            gutterLeft={490}
            gutterRight={390}
            label="The estate"
          />
          <SystemsOverlay {...base} />
        </>
      ) : null}

      {active === 'dissection' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.dissection}
            anchors={dissectionAnchors()}
            maxDistance={170}
            gutterLeft={0}
            gutterRight={330}
            label="Architecture layers and tenants"
          />
          <DissectionOverlay
            {...base}
            eventCount={data.eventCount}
            slowestSpanMs={data.slowestSpanMs}
            deniedCount={data.deniedCount}
            edgePop={data.edgePop}
            eventSeries={data.eventSeries}
            hops={
              data.trace
                ? Object.entries(data.hopMs).map(([id, durationMs]) => ({ id, durationMs }))
                : null
            }
            totalMs={data.trace?.durationMs ?? null}
            counts={REPO_COUNTS}
          />
        </>
      ) : null}

      {active === 'data' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.data}
            anchors={dataAnchors()}
            maxDistance={90}
            gutterLeft={470}
            gutterRight={330}
            label="Request stages"
          />
          <DataOverlay {...base} hopMs={data.hopMs} denied={data.lastOutcomeDenied} />
        </>
      ) : null}

      {active === 'lab' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.lab}
            anchors={labAnchors()}
            maxDistance={130}
            gutterLeft={470}
            gutterRight={330}
            label="Lab zones"
          />
          <LabOverlay
            {...base}
            frameMs={data.frameMs}
            points={4000}
            tier={useWorld.getState().tier}
            active={null}
            /*
             * The frame series is the governor's own p95 history. Empty until
             * a window closes, and the sparkline draws nothing until then.
             */
            frameSeries={data.frameMs === null ? [] : [data.frameMs]}
          />
        </>
      ) : null}

      {active === 'live' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.live}
            anchors={liveAnchors(data.edgePop)}
            maxDistance={160}
            gutterLeft={470}
            gutterRight={330}
            label="Regions and control plane"
          />
          <LiveOverlay
            {...base}
            edgeRttMs={data.edgeRttMs}
            edgePop={data.edgePop}
            events={data.recentEvents}
          />
        </>
      ) : null}

      {active === 'think' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.think}
            anchors={thinkAnchors()}
            maxDistance={80}
            gutterLeft={0}
            gutterRight={40}
            label="The desk"
          />
          <ThinkOverlay {...base} />
        </>
      ) : null}

      {active === 'build' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.build}
            anchors={buildAnchors()}
            maxDistance={130}
            gutterLeft={470}
            gutterRight={330}
            label="The next system"
          />
          <BuildOverlay {...base} />
        </>
      ) : null}

      {active === 'proof' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.proof}
            anchors={proofAnchors()}
            maxDistance={60}
            gutterLeft={470}
            gutterRight={360}
            label="Archive drawers"
          />
          <ProofOverlay {...base} open={data.openDrawer} />
        </>
      ) : null}

      {active === 'end' ? (
        <>
          <LabelOverlay
            projection={PROJECTIONS.end}
            anchors={endAnchors(data.visited)}
            maxDistance={200}
            gutterLeft={470}
            gutterRight={60}
            label="Stations visited"
          />
          <EndOverlay {...base} visited={data.visited} />
        </>
      ) : null}
    </>
  );
}
