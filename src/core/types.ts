/** Core data types shared across the app. Pure, no dependencies. */

/** Palette color id, 0–23 (index into the fixed palette). */
export type ColorId = number;

/** A single voxel: integer grid coordinates + palette color id. */
export type Voxel = { x: number; y: number; z: number; c: ColorId };

export type Vec3 = [number, number, number];

export type GridSize = { x: number; y: number; z: number };

/** Inclusive min/max of the used voxel extent (per PRD §10.1 `bounds`). */
export type Bounds = { min: Vec3; max: Vec3 };

export type PaletteEntry = {
  id: ColorId;
  name: string;
  hex: string;
  /** Reference only — the real Perler bead code. */
  perler: string;
};

/**
 * On-device / file representation of a character. This is the compact shape
 * used by autosave and project import/export. Derived data (bounds, origin)
 * is recomputed from `voxels`, never stored. The full downstream export
 * (PRD §10.1, with conventions + embedded palette) is built on top of this
 * in a later phase.
 */
export type ProjectData = {
  format: "voxelos-character";
  version: 1;
  name: string;
  gridSize: GridSize;
  voxels: Voxel[];
};
