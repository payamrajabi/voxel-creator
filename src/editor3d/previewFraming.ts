/**
 * Pure framing math for the gallery's orbiting 3D preview. No three.js here so
 * it can be shared by the card (to pick an aspect ratio) and the canvas (to
 * place the camera) without pulling the r3f bundle into the card.
 *
 * The camera circles the build about the vertical (Y) axis at a fixed downward
 * tilt. Under that orbit the build sweeps a cylinder — radius = half its
 * footprint diagonal, height = its height — which is rotationally symmetric, so
 * a frame that fits the cylinder never clips at any angle. We fit that cylinder
 * and pick a card aspect ratio matching its silhouette, so tall builds get tall
 * cards and wide/flat builds get wide ones.
 */

import type { Voxel } from "../core/types";
import { computeBounds } from "../core/coords";

/** Vertical field of view of the preview camera, in degrees. */
export const FOV = 40;
/** Downward camera tilt: 30° "aerial drone" looking down at the build. */
export const ELEVATION = Math.PI / 6;
/** >1 backs the camera off so the build sits "slightly zoomed out". */
const MARGIN = 1.35;
/** Clamp card shape so extreme builds don't produce absurdly tall/wide cards. */
const MIN_ASPECT = 0.75; // tallest portrait card (w:h ≈ 3:4)
const MAX_ASPECT = 1.7; // widest landscape card

export type Frame = {
  /** World-space point the camera looks at (center of the build). */
  center: [number, number, number];
  /** Straight-line camera distance from that center. */
  dist: number;
  /** Width ÷ height the build wants — use it as the card's aspect ratio. */
  aspect: number;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Center, framing distance, and preferred aspect ratio for a build. */
export function frameFor(voxels: Voxel[]): Frame {
  const b = computeBounds(voxels);
  if (!b) return { center: [0.5, 0.5, -0.5], dist: 6, aspect: 1 };

  // Match the editor's grid→world mapping (Z is negated; cubes are unit-centered).
  const cx = (b.min[0] + b.max[0]) / 2 + 0.5;
  const cy = (b.min[1] + b.max[1]) / 2 + 0.5;
  const cz = -((b.min[2] + b.max[2]) / 2 + 0.5);
  const w = b.max[0] - b.min[0] + 1;
  const h = b.max[1] - b.min[1] + 1;
  const depth = b.max[2] - b.min[2] + 1;

  // Swept-cylinder silhouette as seen at the tilt: it's `2*halfW` wide and
  // `2*halfH` tall on screen, independent of orbit angle.
  const halfW = 0.5 * Math.hypot(w, depth); // horizontal circumradius
  const halfH = 0.5 * h * Math.cos(ELEVATION) + halfW * Math.sin(ELEVATION);

  const aspect = clamp(halfW / halfH, MIN_ASPECT, MAX_ASPECT);

  // Distance so both silhouette axes fit the FOV for this aspect (three.js `fov`
  // is vertical; horizontal follows from aspect). Take whichever axis is tighter.
  const tanV = Math.tan((FOV * Math.PI) / 180 / 2);
  const distV = halfH / tanV;
  const distH = halfW / (tanV * aspect);
  const dist = Math.max(4, Math.max(distV, distH) * MARGIN);

  return { center: [cx, cy, cz], dist, aspect };
}

/** Card aspect ratio (width ÷ height) a build wants — cheap, math only. */
export function previewAspect(voxels: Voxel[]): number {
  return frameFor(voxels).aspect;
}

/** Camera position on the orbit at a given angle. */
export function orbitPos(frame: Frame, angle: number): [number, number, number] {
  const [cx, cy, cz] = frame.center;
  const horiz = frame.dist * Math.cos(ELEVATION);
  const height = frame.dist * Math.sin(ELEVATION);
  return [cx + horiz * Math.cos(angle), cy + height, cz + horiz * Math.sin(angle)];
}
