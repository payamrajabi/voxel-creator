import { describe, it, expect } from "vitest";
import { quantizeNormal, adjacentCell, groundCell } from "./facePick";

describe("quantizeNormal", () => {
  it("snaps a noisy normal to its dominant world axis", () => {
    expect(quantizeNormal({ x: 0.02, y: 0.99, z: -0.01 })).toEqual([0, 1, 0]);
    expect(quantizeNormal({ x: -0.9, y: 0.1, z: 0.2 })).toEqual([-1, 0, 0]);
    expect(quantizeNormal({ x: 0, y: 0, z: 1 })).toEqual([0, 0, 1]);
    expect(quantizeNormal({ x: 0, y: -1, z: 0 })).toEqual([0, -1, 0]);
  });
});

describe("adjacentCell", () => {
  it("steps up/down/left/right straight through in grid space", () => {
    expect(adjacentCell(5, 3, 2, { x: 0, y: 1, z: 0 })).toEqual([5, 4, 2]);
    expect(adjacentCell(5, 3, 2, { x: 0, y: -1, z: 0 })).toEqual([5, 2, 2]);
    expect(adjacentCell(5, 3, 2, { x: 1, y: 0, z: 0 })).toEqual([6, 3, 2]);
    expect(adjacentCell(5, 3, 2, { x: -1, y: 0, z: 0 })).toEqual([4, 3, 2]);
  });
  it("flips world Z to grid Z: the front face (world +Z) goes to a smaller z", () => {
    expect(adjacentCell(5, 3, 2, { x: 0, y: 0, z: 1 })).toEqual([5, 3, 1]);
    expect(adjacentCell(5, 3, 2, { x: 0, y: 0, z: -1 })).toEqual([5, 3, 3]);
  });
  it("steps into negative space when adding past the origin", () => {
    expect(adjacentCell(0, 0, 0, { x: -1, y: 0, z: 0 })).toEqual([-1, 0, 0]);
    expect(adjacentCell(0, 0, 0, { x: 0, y: -1, z: 0 })).toEqual([0, -1, 0]);
    // world +Z (front) face at the origin steps to a negative grid z
    expect(adjacentCell(0, 0, 0, { x: 0, y: 0, z: 1 })).toEqual([0, 0, -1]);
  });
});

describe("groundCell", () => {
  it("maps a world floor hit to its grid column (z un-negated)", () => {
    expect(groundCell(5.5, -0.5)).toEqual([5, 0]);
    expect(groundCell(0.2, -3.9)).toEqual([0, 3]);
    expect(groundCell(63.9, -63.1)).toEqual([63, 63]);
  });
  it("maps hits on the far side of the origin to negative columns", () => {
    expect(groundCell(-0.5, 0.5)).toEqual([-1, -1]);
    expect(groundCell(-4.2, 2.7)).toEqual([-5, -3]);
  });
});
