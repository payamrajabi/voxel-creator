import type { Bounds, GridSize, Vec3 } from "./types";
import { fromKey, type VoxelKey } from "./voxelKey";

/**
 * Coordinate conventions (PRD §3) — the contract the downstream pipeline reads.
 *   X = left/right (+X to the character's right)
 *   Y = up/down    (+Y up, Y=0 = feet)
 *   Z = front/back (Z=0 = front-most slice, increasing into the body)
 *   forward = -Z   (character faces the default camera)
 */
export const CONVENTIONS = {
  axes: "X-right, Y-up, Z-back",
  up: "+Y",
  forward: "-Z",
  originRule:
    "footprint center at feet: X,Z centered on used bounds; Y at lowest used voxel",
} as const;

/**
 * Half-extent of the buildable volume. The origin (0,0,0) is the CENTER, so
 * valid cells run [-HALF_EXTENT, HALF_EXTENT] on every axis — you build up,
 * down, left, right, forward and back from the origin, not out of one corner.
 * Sparse storage means the empty volume is free; the real ceiling on a scene is
 * the rendered-cube cap in `Scene3D` (INSTANCE_LIMIT), not this bound. Bump this
 * one constant to grow the reachable space.
 */
export const HALF_EXTENT = 512;

/**
 * Nominal grid span recorded in saved files' `gridSize` metadata. The editor
 * gates edits on {@link HALF_EXTENT} (centered), not on this — it exists only so
 * the on-device/file format keeps a size field. Centered span = 2·half + 1.
 */
export const DEFAULT_GRID_SIZE: GridSize = {
  x: HALF_EXTENT * 2 + 1,
  y: HALF_EXTENT * 2 + 1,
  z: HALF_EXTENT * 2 + 1,
};

/** Inclusive min/max extent of a set of points, or null if the set is empty. */
export function computeBounds(
  points: Iterable<{ x: number; y: number; z: number }>,
): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  let any = false;
  for (const p of points) {
    any = true;
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.z < minZ) minZ = p.z;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
    if (p.z > maxZ) maxZ = p.z;
  }
  if (!any) return null;
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

function* pointsFromKeys(keys: Iterable<VoxelKey>) {
  for (const k of keys) {
    const [x, y, z] = fromKey(k);
    yield { x, y, z };
  }
}

/** Bounds of a set of voxel-map keys. */
export function boundsOfKeys(keys: Iterable<VoxelKey>): Bounds | null {
  return computeBounds(pointsFromKeys(keys));
}

/** Dimensions (inclusive) of a bounds box: [width, height, depth]. */
export function boundsSize(b: Bounds): Vec3 {
  return [
    b.max[0] - b.min[0] + 1,
    b.max[1] - b.min[1] + 1,
    b.max[2] - b.min[2] + 1,
  ];
}

/**
 * Origin for export: footprint center at the feet (PRD §3). X,Z at the center
 * of the used bounds; Y at the lowest used voxel. May be fractional when a span
 * has even index-length — that's the true center; downstream applies it as-is.
 */
export function suggestedOrigin(bounds: Bounds): Vec3 {
  const [minX, minY, minZ] = bounds.min;
  const [maxX, , maxZ] = bounds.max;
  return [(minX + maxX) / 2, minY, (minZ + maxZ) / 2];
}

/**
 * True if the cell is within the buildable volume — a cube centered on the
 * origin, [-HALF_EXTENT, HALF_EXTENT] inclusive on every axis. Used to keep
 * edits (in 2D and 3D) inside the reachable space.
 */
export function isInsideGrid(x: number, y: number, z: number): boolean {
  return (
    x >= -HALF_EXTENT &&
    x <= HALF_EXTENT &&
    y >= -HALF_EXTENT &&
    y <= HALF_EXTENT &&
    z >= -HALF_EXTENT &&
    z <= HALF_EXTENT
  );
}
