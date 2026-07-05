"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { segmentAngle, twistDelta, type Pt } from "../input/gesture";

/**
 * Two-finger twist → orbit, like Google Earth. Put two fingers down and rotate
 * them (as if turning a dial); the camera spins around its target by the same
 * angle. One finger no longer orbits — it's reserved for tapping cubes and the
 * long-press box gesture — so OrbitControls' one-finger rotate is turned off in
 * Scene3D and this supplies orbiting instead.
 *
 * Pinch-to-zoom and two-finger pan stay with OrbitControls (both work off the
 * same two fingers); this only adds the azimuth twist, applied by rotating the
 * camera around `controls.target` about the world-up (Y) axis. That composes
 * cleanly with OrbitControls' dolly/pan because its `update()` re-derives the
 * orbit angle from the live camera position every frame — it never fights the
 * position we set here.
 */

// If the spin feels reversed on device, flip this to +1. -1 makes the model
// follow the fingers (twist clockwise → model turns clockwise) — the tactile
// "grab and turn" feel, matching Google Earth.
const ROT_SIGN = -1;

type Controls = { target: THREE.Vector3; enabled: boolean } | null;

/** Rotate `camera` around `target` about the world-up (Y) axis by `angle` rad. */
function orbitAroundTarget(
  camera: THREE.Camera,
  target: THREE.Vector3,
  angle: number,
): void {
  const ox = camera.position.x - target.x;
  const oz = camera.position.z - target.z;
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  camera.position.x = target.x + ox * c - oz * s;
  camera.position.z = target.z + ox * s + oz * c;
  camera.lookAt(target);
}

export default function TwoFingerOrbit({
  inOrbitGesture,
}: {
  inOrbitGesture: RefObject<boolean>;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as Controls;

  useEffect(() => {
    const el = gl.domElement;
    const pts = new Map<number, Pt>();
    let prevAngle: number | null = null;

    // The two active touch points, ordered by pointerId so the angle between
    // them stays consistent as fingers are added or lifted.
    const twoPoints = (): [Pt, Pt] => {
      const ids = Array.from(pts.keys()).sort((a, b) => a - b);
      return [pts.get(ids[0])!, pts.get(ids[1])!];
    };

    const onDown = (e: PointerEvent) => {
      if (pts.size === 0) inOrbitGesture.current = false; // start of a fresh gesture
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      prevAngle = null; // the finger set changed → re-seed the twist on next move
      if (pts.size >= 2) inOrbitGesture.current = true;
    };

    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pts.size !== 2) return; // only a clean two-finger gesture orbits
      inOrbitGesture.current = true;
      const [a, b] = twoPoints();
      const angle = segmentAngle(a, b);
      if (prevAngle === null) {
        prevAngle = angle; // first sample this gesture: nothing to rotate yet
        return;
      }
      const delta = twistDelta(prevAngle, angle);
      prevAngle = angle;
      if (controls?.enabled === false) return; // e.g. mid box-placement
      const target = controls?.target ?? ORIGIN;
      orbitAroundTarget(camera, target, ROT_SIGN * delta);
    };

    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      prevAngle = null;
      // Leave inOrbitGesture set through this release so Scene3D's tap-to-add
      // handlers stand down; it resets on the next fresh (first) finger down.
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    return () => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
    };
  }, [camera, gl, controls, inOrbitGesture]);

  return null;
}

const ORIGIN = new THREE.Vector3();
