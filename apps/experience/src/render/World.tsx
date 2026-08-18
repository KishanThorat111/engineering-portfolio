/**
 * The world: three planes, tenant volumes, packets, and the membrane.
 *
 * §2.3 — "a volumetric lattice with three planes — edge, application, data —
 * with real depth and scale." Everything drawn here is derived from events that
 * actually arrived. There is no ambient traffic, no decorative motion, and no
 * object that exists because the frame looked empty without it.
 */
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import * as THREE from 'three';
import { COPY } from '../content/copy.ts';
import { ringPosition, useWorld, type Packet } from '../state/store.ts';
import type { QualitySettings } from './quality.ts';
import {
  PALETTE,
  latticeFragment,
  latticeVertex,
  membraneFragment,
  membraneVertex,
  packetFragment,
  packetVertex,
  volumeFragment,
  volumeVertex,
} from './shaders.ts';

const PLANES = [
  { key: 'edge', y: 6.5, label: COPY.planes.edge },
  { key: 'application', y: 0, label: COPY.planes.application },
  { key: 'data', y: -6.5, label: COPY.planes.data },
] as const;

const dark = new THREE.Color(PALETTE.dark);
const green = new THREE.Color(PALETTE.green);
const amber = new THREE.Color(PALETTE.amber);
const cyan = new THREE.Color(PALETTE.isolationCyan);
const muted = new THREE.Color(PALETTE.muted);

/* ------------------------------------------------------------------ */

function Lattice({ quality }: { quality: QualitySettings }) {
  const uniforms = useMemo(
    () => ({
      uColour: { value: muted.clone() },
      /*
       * The lattice is the one thing in this world that is always true.
       *
       * It was drawn at 0.13 alpha and then hazed by the atmosphere below,
       * which measured out at 4.3% of the viewport painted — indistinguishable
       * from a blank page, and the reason an idle system read as a broken one.
       * The three planes are real architecture, not telemetry, so drawing them
       * so they can actually be seen states nothing that is not the case.
       *
       * What stays event-driven is everything that CARRIES a measurement:
       * volumes brighten on real load, packets exist only for real events. The
       * structure is visible at rest; the activity is still earned.
       */
      uOpacity: { value: 0.26 },
      // Reach further before fading, so the world has depth instead of a
      // small lit patch surrounded by black.
      uFadeNear: { value: 22 },
      uFadeFar: { value: 74 },
    }),
    [],
  );

  return (
    <group>
      {PLANES.map((plane) => (
        <group key={plane.key} position={[0, plane.y, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[70, 70, 1, 1]} />
            <shaderMaterial
              vertexShader={latticeVertex}
              fragmentShader={latticeFragment}
              uniforms={uniforms}
              transparent
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          {/*
            Typography rendered IN the world (§3.5): text is part of the
            machine, not a layer on top of it. Monospace, muted, small enough
            to be structure rather than signage.
          */}
          <Text
            /*
             * THIS `font` IS WHY THE SCENE RENDERS AT ALL.
             *
             * Without it, troika resolves glyphs through
             * cdn.jsdelivr.net/gh/lojjic/unicode-font-resolver — a cross-origin
             * fetch that this origin's `connect-src 'self'` refuses. The Text
             * then suspends forever, and because the Canvas wraps the world in
             * <Suspense fallback={null}>, ONE unresolved child renders the
             * entire scene as nothing. In production that looked like a broken
             * page with no error: WebGL fine, canvas present, zero pixels.
             *
             * Self-hosted and same-origin, so it satisfies both connect-src and
             * font-src.
             *
             * WOFF v1, NOT the woff2 the pages use. troika 0.52 contains the
             * string "woff2" but its parser rejects the format at runtime with
             * "woff2 fonts not supported" — a grep said yes and the browser said
             * no, which is why this is the format the engine actually reads
             * rather than the one it appears to mention.
             */
            font="/live/fonts/inter-latin-400-normal.woff"
            position={[-16, 0.35, -16]}
            rotation={[-Math.PI / 2, 0, 0]}
            fontSize={0.62}
            color={PALETTE.muted}
            anchorX="left"
            anchorY="middle"
            fillOpacity={0.55}
            letterSpacing={0.18}
            // Disabled: the label is decoration-free structure and does not
            // need to occlude anything.
            depthOffset={-1}
          >
            {plane.label}
          </Text>
        </group>
      ))}
      {quality.atmosphere ? <Atmosphere /> : null}
    </group>
  );
}

/**
 * Haze, faked with two large soft billboards rather than raymarched.
 *
 * §3.7 wants light to scatter so distance reads as haze, "restrained". A
 * volumetric pass would cost more than everything else in the frame combined
 * and buy a difference nobody would name. This is the restraint the dossier
 * asked for, implemented as such.
 */
function Atmosphere() {
  return (
    <group>
      {[-9, 9].map((y) => (
        <mesh key={y} position={[0, y, -18]}>
          <planeGeometry args={[90, 40]} />
          <meshBasicMaterial
            color={PALETTE.dark}
            transparent
            /*
             * 0.55 did not read as haze, it read as a lid. These planes are
             * dark, so at that strength they erased the lattice behind them and
             * the world went black. Softened until distance still recedes but
             * the structure survives the trip.
             */
            opacity={0.28}
            depthWrite={false}
            blending={THREE.NormalBlending}
          />
        </mesh>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------------ */

const volumeGeometry = new THREE.IcosahedronGeometry(0.62, 1);

function Volumes({ quality }: { quality: QualitySettings }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const volumes = useWorld((s) => s.volumes);
  const reducedMotion = useWorld((s) => s.reducedMotion);

  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uDark: { value: dark.clone() } }), []);

  const capacity = quality.maxVolumes;
  const buffers = useMemo(
    () => ({
      tint: new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3),
      load: new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1),
      self: new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1),
    }),
    [capacity],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tintColour = useMemo(() => new THREE.Color(), []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    uniforms.uTime.value += delta;

    const now = performance.now();
    const list = [...volumes.values()].slice(0, capacity);
    mesh.count = list.length;

    const total = Math.max(list.length, 8);
    for (let i = 0; i < list.length; i += 1) {
      const volume = list[i];
      if (!volume) continue;

      const [x, y, z] = ringPosition(volume.slot, total, 9.5);
      dummy.position.set(x, y, z);

      /*
       * BRIGHTNESS IS LOAD (§3.6), and it decays on real elapsed time since the
       * volume's last real event. Nothing pulses on a timer: a tenant that has
       * done nothing for a minute is genuinely dark, which is the whole point of
       * the world being readable at a glance.
       */
      const sinceEvent = now - volume.lastEventAt;
      const recency = Math.exp(-sinceEvent / 6_000);
      const load = Math.min(1, recency * (0.35 + Math.min(volume.eventCount, 12) * 0.06));

      const scale = 1 + load * 0.16;
      dummy.scale.setScalar(scale);
      // Reduced motion: no drift. The volume sits still and reads by brightness.
      dummy.rotation.set(0, reducedMotion ? 0 : uniforms.uTime.value * 0.05 + volume.slot, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Green means working. A volume that has been denied carries amber —
      // caution, never cyan: cyan is the boundary itself, not a state a tenant
      // can be in.
      tintColour.copy(volume.deniedCount > 0 ? amber : green);
      buffers.tint.setXYZ(i, tintColour.r, tintColour.g, tintColour.b);
      buffers.load.setX(i, load);
      buffers.self.setX(i, volume.isSelf ? 1 : 0);
    }

    mesh.instanceMatrix.needsUpdate = true;
    buffers.tint.needsUpdate = true;
    buffers.load.needsUpdate = true;
    buffers.self.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[volumeGeometry, undefined, capacity]} frustumCulled={false}>
      <shaderMaterial
        attach="material"
        vertexShader={volumeVertex}
        fragmentShader={volumeFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-instanceColorTint"
        args={[buffers.tint.array as Float32Array, 3]}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-instanceLoad"
        args={[buffers.load.array as Float32Array, 1]}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-instanceSelf"
        args={[buffers.self.array as Float32Array, 1]}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */

const packetGeometry = new THREE.SphereGeometry(0.085, 8, 6);

function Packets({ quality }: { quality: QualitySettings }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const packets = useWorld((s) => s.packets);
  const retire = useWorld((s) => s.retirePackets);
  const reducedMotion = useWorld((s) => s.reducedMotion);

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  const capacity = quality.maxPackets;

  const buffers = useMemo(
    () => ({
      progress: new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1),
      unmeasured: new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1),
      tint: new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3),
    }),
    [capacity],
  );

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const from = useMemo(() => new THREE.Vector3(), []);
  const to = useMemo(() => new THREE.Vector3(), []);
  const at = useMemo(() => new THREE.Vector3(), []);
  const lastRetire = useRef(0);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    uniforms.uTime.value += delta;

    const now = performance.now();
    if (now - lastRetire.current > 500) {
      lastRetire.current = now;
      retire(now, capacity);
    }

    const live = packets.slice(-capacity);
    mesh.count = live.length;

    for (let i = 0; i < live.length; i += 1) {
      const packet = live[i] as Packet;

      /*
       * PACKET SPEED IS LATENCY. `travelMs` came from the event's real measured
       * duration (store.ts), so a slow request genuinely looks slow. Nothing
       * here eases for prettiness — the progress is linear in real time, which
       * is what makes the reading truthful.
       */
      const elapsed = now - packet.bornAt;
      const progress = reducedMotion ? 1 : Math.min(elapsed / packet.travelMs, 1.2);

      // Enters at the edge plane, arrives at its volume in the application
      // plane: the request lifecycle, not a decorative arc.
      const [tx, ty, tz] = ringPosition(
        packet.toSlot,
        Math.max(useWorld.getState().volumes.size, 8),
        9.5,
      );
      to.set(tx, ty, tz);
      from.set(tx * 0.35, PLANES[0].y, tz * 0.35);

      at.lerpVectors(from, to, Math.min(progress, 1));
      // A slight sag toward the data plane mid-flight, so the path reads as
      // three-dimensional rather than a straight screen-space line.
      at.y -= Math.sin(Math.min(progress, 1) * Math.PI) * 1.1;

      dummy.position.copy(at);
      dummy.scale.setScalar(packet.outcome === 'denied' ? 1.35 : 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // Denied packets carry the boundary colour, because a denial IS the
      // boundary acting. Everything else is green.
      tint.copy(packet.outcome === 'denied' ? cyan : green);
      buffers.tint.setXYZ(i, tint.r, tint.g, tint.b);
      buffers.progress.setX(i, progress);
      buffers.unmeasured.setX(i, packet.unmeasured ? 1 : 0);
    }

    mesh.instanceMatrix.needsUpdate = true;
    buffers.tint.needsUpdate = true;
    buffers.progress.needsUpdate = true;
    buffers.unmeasured.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[packetGeometry, undefined, capacity]} frustumCulled={false}>
      <shaderMaterial
        attach="material"
        vertexShader={packetVertex}
        fragmentShader={packetFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-instanceProgress"
        args={[buffers.progress.array as Float32Array, 1]}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-instanceUnmeasured"
        args={[buffers.unmeasured.array as Float32Array, 1]}
      />
      <instancedBufferAttribute
        attach="geometry-attributes-instanceTint"
        args={[buffers.tint.array as Float32Array, 3]}
      />
    </instancedMesh>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The isolation membrane. Invisible until struck.
 *
 * The flare is driven by `lastDenialAt` — a real policy denial that arrived
 * from the control plane. It is not a hover state, not a proximity effect, and
 * not on a timer. §3.6: the membrane flare IS the policy denial.
 */
function Membrane() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const lastDenialAt = useWorld((s) => s.lastDenialAt);
  const reducedMotion = useWorld((s) => s.reducedMotion);
  const breakOut = useWorld((s) => s.breakOut);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uFlare: { value: 0 }, uCyan: { value: cyan.clone() } }),
    [],
  );

  useFrame((_, delta) => {
    uniforms.uTime.value += delta;

    /*
     * The locked choreography wins when it is running (§2.5).
     *
     * P4 drove the flare from an envelope over `lastDenialAt`. P5 adds the
     * authored timeline, which holds — and a hold is exactly what an envelope
     * over elapsed time cannot express. The envelope remains as the fallback
     * for denials that arrive over the socket from OTHER tenants, which are
     * real refusals the visitor did not cause and which should register without
     * hijacking the camera.
     */
    if (breakOut.flare > 0.001) {
      uniforms.uFlare.value = breakOut.flare;
      return;
    }

    if (lastDenialAt === null) {
      uniforms.uFlare.value = 0;
      return;
    }
    const since = performance.now() - lastDenialAt;

    /*
     * SLOW, STOP, HOLD, RESUME — §2.5's locked choreography, in one envelope.
     * A fast attack to full, a HOLD where nothing changes, then a long release.
     * The hold is the part that makes it memorable and it is the part an easing
     * curve would smooth away, so it is written explicitly.
     */
    let flare: number;
    if (reducedMotion) {
      // Reduced motion collapses the choreography to presence/absence. The
      // information — that a denial happened — survives; the movement does not.
      flare = since < 900 ? 1 : 0;
    } else if (since < 140) {
      flare = since / 140;
    } else if (since < 620) {
      flare = 1;
    } else {
      flare = Math.max(0, 1 - (since - 620) / 1400);
    }
    uniforms.uFlare.value = flare;
    if (materialRef.current) materialRef.current.needsUpdate = false;
  });

  return (
    <mesh>
      <sphereGeometry args={[13.6, 48, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={membraneVertex}
        fragmentShader={membraneFragment}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */

export function World({ quality }: { quality: QualitySettings }) {
  const setFrame = useWorld((s) => s.setFrame);
  const assembly = useWorld((s) => s.assembly);
  const groupRef = useRef<THREE.Group>(null);

  /*
   * The cold open assembles the geometry out of the dark (§2.2), paced by the
   * visitor's REAL measured handshake. Scale and opacity only — nothing is
   * created or destroyed, so the take stays continuous.
   */
  useFrame(() => {
    const group = groupRef.current;
    if (!group) return;
    const eased = Math.max(0.0001, assembly);
    group.scale.setScalar(0.82 + eased * 0.18);
    group.visible = assembly > 0.01;
  });

  // The world is lit from within (§3.7): no sun, no key light. The only
  // ambient term is a whisper so unlit back-faces are not pure black.
  useEffect(() => {
    setFrame({ p50: 0, p95: 0, fps: 0 });
  }, [setFrame]);

  return (
    <>
      <ambientLight intensity={0.08} />
      <group ref={groupRef}>
        <Lattice quality={quality} />
        <Volumes quality={quality} />
        <Packets quality={quality} />
        <Membrane />
      </group>
    </>
  );
}
