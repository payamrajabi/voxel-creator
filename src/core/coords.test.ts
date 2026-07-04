import { describe, it, expect } from "vitest";
import type { Bounds } from "./types";
import {
  boundsOfKeys,
  boundsSize,
  computeBounds,
  isInsideGrid,
  suggestedOrigin,
} from "./coords";
import { toKey } from "./voxelKey";

describe("coords", () => {
  it("computeBounds returns null for an empty set", () => {
    expect(computeBounds([])).toBeNull();
  });

  it("computeBounds finds the inclusive min/max", () => {
    const b = computeBounds([
      { x: 12, y: 0, z: 3 },
      { x: 40, y: 47, z: 9 },
      { x: 20, y: 10, z: 5 },
    ]);
    expect(b).toEqual({ min: [12, 0, 3], max: [40, 47, 9] });
  });

  it("suggestedOrigin matches the PRD §10.1 example", () => {
    // bounds min[12,0,3] max[40,47,9]  =>  suggestedOrigin [26,0,6]
    const b: Bounds = { min: [12, 0, 3], max: [40, 47, 9] };
    expect(suggestedOrigin(b)).toEqual([26, 0, 6]);
  });

  it("suggestedOrigin puts Y at the feet (lowest voxel)", () => {
    const b: Bounds = { min: [0, 5, 0], max: [2, 9, 2] };
    expect(suggestedOrigin(b)).toEqual([1, 5, 1]);
  });

  it("boundsOfKeys works over voxel-map keys", () => {
    expect(boundsOfKeys([toKey(1, 1, 1), toKey(3, 0, 5)])).toEqual({
      min: [1, 0, 1],
      max: [3, 1, 5],
    });
  });

  it("boundsSize is inclusive", () => {
    expect(boundsSize({ min: [0, 0, 0], max: [0, 0, 0] })).toEqual([1, 1, 1]);
    expect(boundsSize({ min: [12, 0, 3], max: [40, 47, 9] })).toEqual([
      29, 48, 7,
    ]);
  });

  it("isInsideGrid respects the default 64^3 volume", () => {
    expect(isInsideGrid(0, 0, 0)).toBe(true);
    expect(isInsideGrid(63, 63, 63)).toBe(true);
    expect(isInsideGrid(64, 0, 0)).toBe(false);
    expect(isInsideGrid(-1, 0, 0)).toBe(false);
  });
});
