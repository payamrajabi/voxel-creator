import type { Vec3 } from "../core/types";

/**
 * Pure mapping from a tapped cube face to the grid cell where the new cube goes.
 *
 * The 3D scene renders grid voxel (x,y,z) at world (x+0.5, y+0.5, -(z+0.5)) —
 * see `Scene3D`. World X and Y match grid X and Y, but world Z is NEGATED vs
 * grid Z. So a face's world-space normal maps to a grid step of (nx, ny, -nz):
 * the front face (world +Z, toward the camera) steps to a SMALLER grid z, and
 * deeper faces step to larger z. Keeping this sign in one tested place stops it
 * from drifting — the coordinate frame downstream reads is the whole point (§3).
 */

export type Normalish = { x: number; y: number; z: number };

/** Snap a face normal to the dominant world axis as a unit vector. */
export function quantizeNormal(n: Normalish): Vec3 {
  const ax = Math.abs(n.x);
  const ay = Math.abs(n.y);
  const az = Math.abs(n.z);
  if (ax >= ay && ax >= az) return [Math.sign(n.x) || 0, 0, 0];
  if (ay >= az) return [0, Math.sign(n.y) || 0, 0];
  return [0, 0, Math.sign(n.z) || 0];
}

/**
 * Grid cell adjacent to voxel (x,y,z) across the tapped face. World Z is flipped
 * to grid Z, so the normal's z component subtracts.
 */
export function adjacentCell(
  x: number,
  y: number,
  z: number,
  normal: Normalish,
): Vec3 {
  const [nx, ny, nz] = quantizeNormal(normal);
  return [x + nx, y + ny, z - nz];
}

/** Grid column (x,z) under a ground-plane hit at world point (px, pz). */
export function groundCell(px: number, pz: number): [number, number] {
  return [Math.floor(px), Math.floor(-pz)];
}
