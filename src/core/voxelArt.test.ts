import { describe, it, expect } from "vitest";
import { fromKey } from "./voxelKey";
import { PALETTE_SIZE } from "./palette";
import {
  box,
  ellipsoid,
  finalize,
  model,
  set,
  shell,
  sphere,
} from "./voxelArt";

describe("voxelArt primitives", () => {
  it("box fills an inclusive integer range", () => {
    const m = model();
    box(m, 0, 0, 0, 1, 2, 3, 7);
    expect(m.size).toBe(2 * 3 * 4); // inclusive on every axis
    for (const c of m.values()) expect(c).toBe(7);
  });

  it("later writes win on overlap", () => {
    const m = model();
    set(m, 1, 1, 1, 4);
    set(m, 1, 1, 1, 9);
    expect(m.size).toBe(1);
    expect([...m.values()][0]).toBe(9);
  });

  it("sphere is symmetric and bounded by its radius", () => {
    const m = model();
    sphere(m, 0, 0, 0, 3, 1);
    // Corner (3,3,3) is well outside radius 3; the poles are on it.
    expect(m.has("3,3,3")).toBe(false);
    expect(m.has("3,0,0")).toBe(true);
    expect(m.has("0,3,0")).toBe(true);
    expect(m.has("-3,0,0")).toBe(true);
  });

  it("ellipsoid honors per-axis radii", () => {
    const m = model();
    ellipsoid(m, 0, 0, 0, 6, 2, 2, 1);
    expect(m.has("6,0,0")).toBe(true); // reaches far on the long axis
    expect(m.has("0,6,0")).toBe(false); // but not on a short one
  });
});

describe("shell", () => {
  it("drops only fully enclosed voxels", () => {
    const m = model();
    box(m, 0, 0, 0, 2, 2, 2, 5); // solid 3×3×3 = 27 cells
    const s = shell(m);
    expect(s.has("1,1,1")).toBe(false); // the single interior cell is gone
    expect(s.size).toBe(26); // the 26-cell surface remains
  });

  it("keeps thin features (no enclosed cells)", () => {
    const m = model();
    box(m, 0, 0, 0, 9, 0, 0, 5); // a 1-thick line
    expect(shell(m).size).toBe(m.size);
  });
});

describe("finalize", () => {
  it("grounds to the origin and emits a valid, ordered project", () => {
    const m = model();
    sphere(m, 20, 30, 40, 4, 2);
    const data = finalize("Blob", m);

    expect(data.format).toBe("voxelos-character");
    expect(data.name).toBe("Blob");
    expect(data.voxels.length).toBeGreaterThan(0);

    let minX = Infinity, minY = Infinity, minZ = Infinity;
    for (const v of data.voxels) {
      minX = Math.min(minX, v.x);
      minY = Math.min(minY, v.y);
      minZ = Math.min(minZ, v.z);
      expect(v.c).toBeGreaterThanOrEqual(0);
      expect(v.c).toBeLessThan(PALETTE_SIZE);
    }
    expect([minX, minY, minZ]).toEqual([0, 0, 0]); // translated to the corner

    // Canonical z,y,x ordering (same contract as serialize()).
    for (let i = 1; i < data.voxels.length; i++) {
      const a = data.voxels[i - 1], b = data.voxels[i];
      const rank = (v: { x: number; y: number; z: number }) =>
        v.z * 1e6 + v.y * 1e3 + v.x;
      expect(rank(a)).toBeLessThan(rank(b));
    }
  });

  it("can skip shelling when asked (keeps interior cells)", () => {
    const m = model();
    box(m, 0, 0, 0, 4, 4, 4, 3);
    const shelled = finalize("a", m).voxels.length;
    const solid = finalize("a", m, { shell: false }).voxels.length;
    expect(solid).toBe(125);
    expect(shelled).toBeLessThan(solid);
    // Keys are still well-formed either way.
    for (const v of finalize("a", m).voxels) {
      expect(fromKey(`${v.x},${v.y},${v.z}`)).toHaveLength(3);
    }
  });
});
