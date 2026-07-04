import { describe, it, expect } from "vitest";
import {
  initialCamera,
  screenToCell,
  screenToWorld,
  worldToScreen,
  zoomAround,
} from "./camera";
import type { Camera } from "./camera";

const cam: Camera = { scale: 10, originX: 0, originY: 100 };

describe("2d camera", () => {
  it("worldToScreen flips Y (feet at the bottom)", () => {
    expect(worldToScreen(cam, 0, 0)).toEqual([0, 100]);
    expect(worldToScreen(cam, 1, 1)).toEqual([10, 90]); // +Y is up = smaller py
  });

  it("screenToWorld inverts worldToScreen", () => {
    const [px, py] = worldToScreen(cam, 3.5, 2.25);
    expect(screenToWorld(cam, px, py)).toEqual([3.5, 2.25]);
  });

  it("screenToCell floors to the containing cell", () => {
    expect(screenToCell(cam, 5, 95)).toEqual([0, 0]);
    expect(screenToCell(cam, 15, 85)).toEqual([1, 1]);
  });

  it("zoomAround keeps the focal point fixed", () => {
    const z = zoomAround(cam, 50, 50, 2);
    expect(z.scale).toBe(20);
    const [px, py] = worldToScreen(z, ...screenToWorld(cam, 50, 50));
    expect(px).toBeCloseTo(50);
    expect(py).toBeCloseTo(50);
  });

  it("zoomAround clamps scale to the allowed range", () => {
    expect(zoomAround(cam, 0, 0, 1000).scale).toBeLessThanOrEqual(80);
    expect(zoomAround(cam, 0, 0, 0.0001).scale).toBeGreaterThanOrEqual(4);
  });

  it("initialCamera centers the character area in view", () => {
    const c = initialCamera(400, 800, 22, 32, 8);
    // world (32, 8) should land at the viewport center (200, 400)
    expect(worldToScreen(c, 32, 8)).toEqual([200, 400]);
  });
});
