import type { ColorId, ProjectData } from "./types";
import { DEFAULT_GRID_SIZE } from "./coords";
import { serialize } from "./serialize";
import { fromKey, toKey, type VoxelKey } from "./voxelKey";

/**
 * A tiny procedural voxel-sculpting toolkit — pure, no three.js, no DOM — used
 * to author the built-in "system" characters in code (see systemCharacters.ts).
 *
 * Everything writes into a sparse `VoxelModel` (a map keyed by "x,y,z"); later
 * writes win on overlap, so shapes are layered painter-style. Coordinates follow
 * the app's conventions (X right, Y up with feet low, Z back with the front slice
 * nearest the camera), and may be fractional/negative while building — `finalize`
 * grounds the result to non-negative integer cells with the feet at Y=0.
 */

export type VoxelModel = Map<VoxelKey, ColorId>;

export function model(): VoxelModel {
  return new Map();
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Paint one cell (snapped to the grid). Later writes win. */
export function set(m: VoxelModel, x: number, y: number, z: number, c: ColorId): void {
  m.set(toKey(Math.round(x), Math.round(y), Math.round(z)), c);
}

/** Solid axis-aligned box between two inclusive corners. */
export function box(
  m: VoxelModel,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  c: ColorId,
): void {
  const ax = Math.round(Math.min(x0, x1)), bx = Math.round(Math.max(x0, x1));
  const ay = Math.round(Math.min(y0, y1)), by = Math.round(Math.max(y0, y1));
  const az = Math.round(Math.min(z0, z1)), bz = Math.round(Math.max(z0, z1));
  for (let x = ax; x <= bx; x++)
    for (let y = ay; y <= by; y++)
      for (let z = az; z <= bz; z++) m.set(toKey(x, y, z), c);
}

/** Solid ellipsoid centered at (cx,cy,cz) with per-axis radii. */
export function ellipsoid(
  m: VoxelModel,
  cx: number, cy: number, cz: number,
  rx: number, ry: number, rz: number,
  c: ColorId,
): void {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
  const z0 = Math.floor(cz - rz), z1 = Math.ceil(cz + rz);
  for (let x = x0; x <= x1; x++) {
    const dx = (x - cx) / rx;
    for (let y = y0; y <= y1; y++) {
      const dy = (y - cy) / ry;
      for (let z = z0; z <= z1; z++) {
        const dz = (z - cz) / rz;
        if (dx * dx + dy * dy + dz * dz <= 1.0001) m.set(toKey(x, y, z), c);
      }
    }
  }
}

/** Solid sphere — an ellipsoid with equal radii. */
export function sphere(
  m: VoxelModel,
  cx: number, cy: number, cz: number,
  r: number,
  c: ColorId,
): void {
  ellipsoid(m, cx, cy, cz, r, r, r, c);
}

/**
 * A thick, optionally tapering segment (capsule) from p0 to p1: spheres of
 * radius `r0`→`r1` stamped along the line. Great for stems, limbs, tentacles.
 */
export function capsule(
  m: VoxelModel,
  x0: number, y0: number, z0: number,
  x1: number, y1: number, z1: number,
  r0: number,
  c: ColorId,
  r1: number = r0,
): void {
  const len = Math.hypot(x1 - x0, y1 - y0, z1 - z0);
  const steps = Math.max(1, Math.ceil(len * 2));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    sphere(m, lerp(x0, x1, t), lerp(y0, y1, t), lerp(z0, z1, t), lerp(r0, r1, t), c);
  }
}

/**
 * A vertical elliptical column whose cross-section tapers with height — the
 * workhorse for trunks, rocket bodies, teardrop bodies and the like. Cross
 * sections are ellipses in the XZ plane; radii lerp from bottom to top.
 */
export function taperY(
  m: VoxelModel,
  cx: number, cz: number,
  yBot: number, yTop: number,
  rxBot: number, rzBot: number,
  rxTop: number, rzTop: number,
  c: ColorId,
): void {
  const yb = Math.round(yBot), yt = Math.round(yTop);
  for (let y = yb; y <= yt; y++) {
    const t = yt === yb ? 0 : (y - yb) / (yt - yb);
    const rx = lerp(rxBot, rxTop, t);
    const rz = lerp(rzBot, rzTop, t);
    if (rx <= 0 || rz <= 0) continue;
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    const z0 = Math.floor(cz - rz), z1 = Math.ceil(cz + rz);
    for (let x = x0; x <= x1; x++) {
      const dx = (x - cx) / rx;
      for (let z = z0; z <= z1; z++) {
        const dz = (z - cz) / rz;
        if (dx * dx + dz * dz <= 1.0001) m.set(toKey(x, y, z), c);
      }
    }
  }
}

/**
 * Upper half of an ellipsoid, sitting on the plane Y=`cyBase` (a flat-bottomed
 * dome). Used for things like a mushroom cap or an igloo shell.
 */
export function domeY(
  m: VoxelModel,
  cx: number, cyBase: number, cz: number,
  rx: number, ry: number, rz: number,
  c: ColorId,
): void {
  const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
  const z0 = Math.floor(cz - rz), z1 = Math.ceil(cz + rz);
  for (let x = x0; x <= x1; x++) {
    const dx = (x - cx) / rx;
    for (let z = z0; z <= z1; z++) {
      const dz = (z - cz) / rz;
      for (let h = 0; h <= Math.ceil(ry); h++) {
        const dy = h / ry;
        if (dx * dx + dy * dy + dz * dz <= 1.0001) {
          m.set(toKey(Math.round(x), Math.round(cyBase + h), Math.round(z)), c);
        }
      }
    }
  }
}

/**
 * Keep only surface voxels: drop any cell whose six face-neighbors are all
 * filled. An opaque orbit camera never sees enclosed interior cells, so this is
 * visually lossless yet shrinks the serialized payload several-fold.
 */
export function shell(m: VoxelModel): VoxelModel {
  const out: VoxelModel = new Map();
  for (const [k, c] of m) {
    const [x, y, z] = fromKey(k);
    const enclosed =
      m.has(toKey(x + 1, y, z)) &&
      m.has(toKey(x - 1, y, z)) &&
      m.has(toKey(x, y + 1, z)) &&
      m.has(toKey(x, y - 1, z)) &&
      m.has(toKey(x, y, z + 1)) &&
      m.has(toKey(x, y, z - 1));
    if (!enclosed) out.set(k, c);
  }
  return out;
}

/** Translate a model so its minimum cell sits at the origin (feet at Y=0). */
function ground(m: VoxelModel): VoxelModel {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  for (const k of m.keys()) {
    const [x, y, z] = fromKey(k);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (z < minZ) minZ = z;
  }
  if (!Number.isFinite(minX)) return m;
  const out: VoxelModel = new Map();
  for (const [k, c] of m) {
    const [x, y, z] = fromKey(k);
    out.set(toKey(x - minX, y - minY, z - minZ), c);
  }
  return out;
}

/**
 * Turn a sculpted model into a serializable `ProjectData`: shell it to its
 * visible surface, ground it to the origin, and emit voxels in canonical order.
 */
export function finalize(
  name: string,
  m: VoxelModel,
  opts: { shell?: boolean } = {},
): ProjectData {
  const surface = opts.shell === false ? m : shell(m);
  return serialize({
    name,
    gridSize: DEFAULT_GRID_SIZE,
    voxels: ground(surface),
  });
}
