import type { Vec3 } from "./types";

/** A voxel map key: the string `"x,y,z"` of integer grid coordinates. */
export type VoxelKey = string;

export function toKey(x: number, y: number, z: number): VoxelKey {
  return `${x},${y},${z}`;
}

export function fromKey(key: VoxelKey): Vec3 {
  const parts = key.split(",");
  return [Number(parts[0]), Number(parts[1]), Number(parts[2])];
}
