import { describe, it, expect } from "vitest";
import { manhattan } from "./manhattan";
import { DEFAULT_GRID_SIZE, isInsideGrid } from "./coords";
import { PALETTE_SIZE } from "./palette";

/** The editor's instanced-cube render budget (Scene3D INSTANCE_LIMIT). */
const RENDER_BUDGET = 32768;

describe("manhattan", () => {
  it("fills the full 64³ volume within the render budget", () => {
    const data = manhattan();
    let maxX = 0, maxY = 0, maxZ = 0;
    for (const v of data.voxels) {
      expect(isInsideGrid(v.x, v.y, v.z, DEFAULT_GRID_SIZE)).toBe(true);
      expect(v.c).toBeGreaterThanOrEqual(0);
      expect(v.c).toBeLessThan(PALETTE_SIZE);
      maxX = Math.max(maxX, v.x);
      maxY = Math.max(maxY, v.y);
      maxZ = Math.max(maxZ, v.z);
    }
    // Surface-shelled, so it stays renderable in the editor…
    expect(data.voxels.length).toBeLessThanOrEqual(RENDER_BUDGET);
    // …but still a big, dense build that uses the whole volume.
    expect(data.voxels.length).toBeGreaterThan(20000);
    expect([maxX, maxY, maxZ]).toEqual([63, 63, 63]);
  });

  it("is deterministic (identical geometry every build)", () => {
    expect(manhattan().voxels).toEqual(manhattan().voxels);
  });

  it("comfortably fits the 5MB sync cap", () => {
    const bytes = JSON.stringify(manhattan()).length;
    expect(bytes).toBeLessThan(5_000_000);
  });
});
