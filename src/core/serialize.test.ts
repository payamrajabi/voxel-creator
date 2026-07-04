import { describe, it, expect } from "vitest";
import { serialize, deserialize } from "./serialize";
import { toKey } from "./voxelKey";
import { DEFAULT_GRID_SIZE } from "./coords";

describe("serialize", () => {
  it("produces the canonical project shape", () => {
    const map = new Map([[toKey(1, 2, 3), 5]]);
    const data = serialize({
      name: "Guy",
      gridSize: DEFAULT_GRID_SIZE,
      voxels: map,
    });
    expect(data.format).toBe("voxelos-character");
    expect(data.version).toBe(1);
    expect(data.name).toBe("Guy");
    expect(data.voxels).toEqual([{ x: 1, y: 2, z: 3, c: 5 }]);
  });

  it("round-trips a voxel map exactly", () => {
    const map = new Map([
      [toKey(0, 0, 0), 1],
      [toKey(3, 1, 2), 4],
      [toKey(0, 5, 0), 2],
    ]);
    const back = deserialize(
      serialize({ name: "n", gridSize: DEFAULT_GRID_SIZE, voxels: map }),
    );
    expect(back.voxels).toEqual(map);
    expect(back.name).toBe("n");
    expect(back.gridSize).toEqual(DEFAULT_GRID_SIZE);
  });

  it("emits voxels in deterministic z,y,x order", () => {
    const map = new Map([
      [toKey(1, 0, 1), 1],
      [toKey(0, 0, 0), 1],
      [toKey(0, 1, 0), 1],
    ]);
    const data = serialize({
      name: "n",
      gridSize: DEFAULT_GRID_SIZE,
      voxels: map,
    });
    expect(data.voxels).toEqual([
      { x: 0, y: 0, z: 0, c: 1 },
      { x: 0, y: 1, z: 0, c: 1 },
      { x: 1, y: 0, z: 1, c: 1 },
    ]);
  });
});
