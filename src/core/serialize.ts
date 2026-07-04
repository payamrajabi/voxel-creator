import type { ColorId, GridSize, ProjectData, Voxel } from "./types";
import { fromKey, toKey, type VoxelKey } from "./voxelKey";
import { DEFAULT_GRID_SIZE } from "./coords";

/**
 * Serialize a character to the compact on-device / file shape (`ProjectData`).
 * Voxels are emitted in a deterministic front-to-back, bottom-up order so files
 * and diffs are stable. This same serializer backs autosave and, later, export.
 */
export function serialize(input: {
  name: string;
  gridSize: GridSize;
  voxels: Iterable<[VoxelKey, ColorId]>;
}): ProjectData {
  const voxels: Voxel[] = [];
  for (const [key, c] of input.voxels) {
    const [x, y, z] = fromKey(key);
    voxels.push({ x, y, z, c });
  }
  voxels.sort((a, b) => a.z - b.z || a.y - b.y || a.x - b.x);
  return {
    format: "voxelos-character",
    version: 1,
    name: input.name,
    gridSize: input.gridSize,
    voxels,
  };
}

/** Rebuild the sparse voxel map (and metadata) from a serialized project. */
export function deserialize(data: ProjectData): {
  name: string;
  gridSize: GridSize;
  voxels: Map<VoxelKey, ColorId>;
} {
  const voxels = new Map<VoxelKey, ColorId>();
  for (const v of data.voxels) voxels.set(toKey(v.x, v.y, v.z), v.c);
  return {
    name: data.name ?? "Untitled",
    gridSize: data.gridSize ?? DEFAULT_GRID_SIZE,
    voxels,
  };
}
