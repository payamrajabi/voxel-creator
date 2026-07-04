import { describe, it, expect } from "vitest";
import { toKey, fromKey } from "./voxelKey";

describe("voxelKey", () => {
  it("produces the expected string form", () => {
    expect(toKey(1, 2, 3)).toBe("1,2,3");
  });

  it("round-trips coordinates", () => {
    const cases: [number, number, number][] = [
      [0, 0, 0],
      [26, 0, 6],
      [63, 63, 63],
      [1, 2, 3],
    ];
    for (const [x, y, z] of cases) {
      expect(fromKey(toKey(x, y, z))).toEqual([x, y, z]);
    }
  });
});
