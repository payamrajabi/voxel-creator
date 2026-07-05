"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { segmentAngle, twistDelta, TAP_SLOP, type Pt } from "../input/gesture";

/**
 * Custom touch camera controls, tuned so one finger stays free for editing:
 *
 *  - Two-finger twist  → orbit left/right (azimuth), Google-Earth style: rotate
 *    two fingers like a dial and the camera spins around its target by the same
 *    angle.
 *  - One-finger drag   → tilt up/down (polar): swipe down to look from overhead,
 *    swipe up to drop back to a side-on view. Only vertical movement tilts, so
 *    horizontal one-finger drags don't spin the view (that's the twist's job).
 *
 * A one-finger *tap* still places/erases cubes and a one-finger *long-press*
 * still summons the glass box — tilt only kicks in once the finger has clearly
 * dragged (past the tap slop), so those aren't disturbed.
 *
 * Pinch-to-zoom and two-finger pan stay with OrbitControls (its own one-finger
 * rotate is turned off in Scene3D). Everything here works by moving the camera
 * around `controls.target`; it composes with OrbitControls' dolly/pan because
 * its `update()` re-derives the orbit angles from the live camera position every
 * frame, so it never fights the position we set. (Named for its original
 * two-finger-only role; it now owns the one-finger tilt too.)
 */

// If a gesture feels reversed on device, flip its sign. Defaults make the view
// follow the fingers ("grab and turn"): twist clockwise → model turns clockwise;
// swipe down → tilt toward a top-down view.
const ROT_SIGN = -1;
const TILT_SIGN = -1;

// A full screen-height one-finger drag sweeps this much polar angle.
const TILT_RADIANS_PER_SCREEN = Math.PI;
// Keep the tilt off the exact poles (gimbal flip) and above the ground plane:
// from near-overhead down to a level side-on view.
const MIN_PHI = 0.12; // ~7° off straight-down (top view)
const MAX_PHI = Math.PI / 2; // horizontal (side view)

type Controls = { target: THREE.Vector3; enabled: boolean } | null;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

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

/** Tilt `camera` by `dPhi` rad, changing the polar angle (pitch) but keeping the
 *  orbit radius and azimuth. Clamped to [MIN_PHI, MAX_PHI]. */
function tiltCamera(
  camera: THREE.Camera,
  target: THREE.Vector3,
  dPhi: number,
): void {
  const ox = camera.position.x - target.x;
  const oy = camera.position.y - target.y;
  const oz = camera.position.z - target.z;
  const radius = Math.hypot(ox, oy, oz);
  if (radius === 0) return;
  const theta = Math.atan2(ox, oz); // azimuth (three.js Spherical convention)
  const phi = clamp(Math.acos(clamp(oy / radius, -1, 1)) + dPhi, MIN_PHI, MAX_PHI);
  const sinPhi = Math.sin(phi);
  camera.position.x = target.x + radius * sinPhi * Math.sin(theta);
  camera.position.y = target.y + radius * Math.cos(phi);
  camera.position.z = target.z + radius * sinPhi * Math.cos(theta);
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
    let prevAngle: number | null = null; // two-finger twist reference
    let singleStart: Pt | null = null; // where a one-finger drag began
    let tilting = false; // one-finger drag has passed the tap slop

    // The two active touch points, ordered by pointerId so the angle between
    // them stays consistent as fingers are added or lifted.
    const twoPoints = (): [Pt, Pt] => {
      const ids = Array.from(pts.keys()).sort((a, b) => a - b);
      return [pts.get(ids[0])!, pts.get(ids[1])!];
    };

    const targetOf = () => controls?.target ?? ORIGIN;
    const controlsBusy = () => controls?.enabled === false; // e.g. mid box-placement

    const onDown = (e: PointerEvent) => {
      if (pts.size === 0) inOrbitGesture.current = false; // start of a fresh gesture
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      // The finger set changed → re-seed both gestures on the next move.
      prevAngle = null;
      tilting = false;
      singleStart = pts.size === 1 ? { x: e.clientX, y: e.clientY } : null;
      if (pts.size >= 2) inOrbitGesture.current = true;
    };

    const onMove = (e: PointerEvent) => {
      const p = pts.get(e.pointerId);
      if (!p) return;
      const prevY = p.y;
      p.x = e.clientX;
      p.y = e.clientY;

      // One finger → tilt (polar), once it's clearly a drag and not a tap.
      if (pts.size === 1) {
        if (singleStart === null) {
          singleStart = { x: p.x, y: p.y };
          return;
        }
        if (!tilting) {
          if (Math.hypot(p.x - singleStart.x, p.y - singleStart.y) <= TAP_SLOP) return;
          tilting = true; // this frame's delta is small, so no jump
        }
        if (controlsBusy()) return;
        const height = el.clientHeight || 1;
        const dPhi = TILT_SIGN * ((p.y - prevY) / height) * TILT_RADIANS_PER_SCREEN;
        tiltCamera(camera, targetOf(), dPhi);
        return;
      }

      // Two fingers → twist (azimuth).
      if (pts.size !== 2) return;
      inOrbitGesture.current = true;
      const [a, b] = twoPoints();
      const angle = segmentAngle(a, b);
      if (prevAngle === null) {
        prevAngle = angle; // first sample this gesture: nothing to rotate yet
        return;
      }
      const delta = twistDelta(prevAngle, angle);
      prevAngle = angle;
      if (controlsBusy()) return;
      orbitAroundTarget(camera, targetOf(), ROT_SIGN * delta);
    };

    const onUp = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      prevAngle = null;
      tilting = false;
      singleStart = null; // a remaining finger re-seeds on its next move
      // inOrbitGesture is left set through this release so Scene3D's tap-to-add
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
