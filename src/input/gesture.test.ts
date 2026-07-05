import { describe, it, expect } from "vitest";
import {
  cellsAlongLine,
  dist,
  isTap,
  midpoint,
  segmentAngle,
  twistDelta,
} from "./gesture";

describe("gesture math", () => {
  it("dist + midpoint", () => {
    expect(dist({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 4, y: 2 })).toEqual({ x: 2, y: 1 });
  });

  it("isTap uses the slop threshold", () => {
    expect(isTap({ x: 0, y: 0 }, { x: 3, y: 3 })).toBe(true); // ~4.2px
    expect(isTap({ x: 0, y: 0 }, { x: 20, y: 0 })).toBe(false);
  });

  it("cellsAlongLine returns a single cell for a point", () => {
    expect(cellsAlongLine(2, 3, 2, 3)).toEqual([[2, 3]]);
  });

  it("cellsAlongLine fills a horizontal run with no gaps", () => {
    expect(cellsAlongLine(0, 0, 3, 0)).toEqual([
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ]);
  });

  it("cellsAlongLine walks a diagonal", () => {
    expect(cellsAlongLine(0, 0, 2, 2)).toEqual([
      [0, 0],
      [1, 1],
      [2, 2],
    ]);
  });

  it("segmentAngle measures the vector between two touch points", () => {
    expect(segmentAngle({ x: 0, y: 0 }, { x: 1, y: 0 })).toBeCloseTo(0);
    expect(segmentAngle({ x: 0, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2);
  });

  it("twistDelta gives the signed rotation of a clockwise (screen) twist", () => {
    // Fingers horizontal, then rotated so the vector tips downward on screen
    // (y grows down) — a clockwise twist as the user sees it. Delta is positive.
    const before = segmentAngle({ x: 200, y: 300 }, { x: 400, y: 300 });
    const after = segmentAngle({ x: 210, y: 250 }, { x: 390, y: 350 });
    expect(twistDelta(before, after)).toBeGreaterThan(0);
  });

  it("twistDelta takes the short way around the ±π wrap", () => {
    // Just past +π vs just before -π are ~0 apart, not ~2π.
    expect(twistDelta(3.0, -3.0)).toBeCloseTo(2 * Math.PI - 6, 5);
    expect(Math.abs(twistDelta(3.0, -3.0))).toBeLessThan(0.3);
    expect(twistDelta(0, 0.1)).toBeCloseTo(0.1);
  });

  it("cellsAlongLine leaves no gaps on a steep fast drag", () => {
    const cells = cellsAlongLine(0, 0, 1, 5);
    // every step moves by at most one cell in each axis (4-ish connectivity)
    for (let i = 1; i < cells.length; i++) {
      const dx = Math.abs(cells[i][0] - cells[i - 1][0]);
      const dy = Math.abs(cells[i][1] - cells[i - 1][1]);
      expect(dx).toBeLessThanOrEqual(1);
      expect(dy).toBeLessThanOrEqual(1);
    }
    expect(cells[0]).toEqual([0, 0]);
    expect(cells[cells.length - 1]).toEqual([1, 5]);
  });
});
