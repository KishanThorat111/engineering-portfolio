/**
 * THE CAMERA RIG — one camera, one continuous take.
 *
 * C3, ruled 22 Aug 2026: the visitor moves between the ten stations by flying,
 * never by cutting. This component is the only thing in the project permitted
 * to move the camera, which is what guarantees that — a cut is not something
 * you can accidentally write if there is nowhere to write it.
 *
 * THE CAMERA HAS WEIGHT (§3.8)
 * "Slight lead-in and settle. Never linear. Never snappy. It behaves like a
 * physical rig, not a lerp." Implemented as a GSAP tween on a proxy object with
 * `power2.inOut`, plus a separate, slightly LAGGING tween on the look-at target.
 * The lag is the important part and it is why this is not a lerp: a real rig
 * turns to follow its subject a beat after it starts moving, so the target
 * trails the eye by ~12% of the flight. Without it the move is technically
 * eased and still reads as a slide.
 *
 * REDUCED MOTION IS NOT AN AFTERTHOUGHT HERE
 * A camera flight is the largest possible vestibular trigger on the site.
 * Under `prefers-reduced-motion` the rig does not ease a shorter distance — it
 * does not travel at all. It places the camera at the destination immediately
 * and the world reorganises with opacity instead. §11 requires this to be
 * verified by execution rather than by inspection, so `travelling` is exposed
 * for a test to assert against.
 */
import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import * as THREE from 'three';
import type { Station } from './stations.ts';

export type CameraRigProps = {
  station: Station;
  reducedMotion?: boolean;
  /** Fired when a flight completes, so a beat can be sequenced after arrival. */
  onArrive?: (station: Station) => void;
};

type Pose = {
  px: number;
  py: number;
  pz: number;
  tx: number;
  ty: number;
  tz: number;
  fov: number;
};

export function CameraRig({ station, reducedMotion = false, onArrive }: CameraRigProps) {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera;

  const pose = useRef<Pose>({
    px: station.position[0],
    py: station.position[1],
    pz: station.position[2],
    tx: station.target[0],
    ty: station.target[1],
    tz: station.target[2],
    fov: station.fov,
  });

  /** True while a flight is in progress. Asserted by the reduced-motion test. */
  const travelling = useRef(false);
  const target = useRef(new THREE.Vector3(...station.target));

  useEffect(() => {
    const next = pose.current;
    const [px, py, pz] = station.position;
    const [tx, ty, tz] = station.target;

    if (reducedMotion || station.travelSeconds === 0) {
      /*
       * No tween at all. Note this also covers the first station, whose
       * travelSeconds is 0 — the arrival beat should not open by flying the
       * camera in from nowhere, it should already be there.
       */
      Object.assign(next, { px, py, pz, tx, ty, tz, fov: station.fov });
      travelling.current = false;
      onArrive?.(station);
      return;
    }

    travelling.current = true;

    const eye = gsap.to(next, {
      px,
      py,
      pz,
      fov: station.fov,
      duration: station.travelSeconds,
      ease: 'power2.inOut',
    });

    // The target trails the eye. This is the lead-in and settle.
    const look = gsap.to(next, {
      tx,
      ty,
      tz,
      duration: station.travelSeconds * 1.12,
      ease: 'power2.out',
      onComplete: () => {
        travelling.current = false;
        onArrive?.(station);
      },
    });

    return () => {
      eye.kill();
      look.kill();
      travelling.current = false;
    };
  }, [station, reducedMotion, onArrive]);

  useFrame(() => {
    const { px, py, pz, tx, ty, tz, fov } = pose.current;
    camera.position.set(px, py, pz);
    target.current.set(tx, ty, tz);
    camera.lookAt(target.current);

    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}
