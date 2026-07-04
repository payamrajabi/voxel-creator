/**
 * 2D canvas camera: maps between world cells and screen pixels. Pure + testable.
 *
 * World coords are grid cells with Y up (Y=0 = feet at the bottom, per PRD §3).
 * A world point (wx, wy) maps to screen px (originX + wx*scale, originY - wy*scale)
 * — note the Y flip, since screen pixels grow downward. `scale` is CSS px per cell.
 */
export type Camera = { scale: number; originX: number; originY: number };

export const MIN_SCALE = 4; // fully zoomed out (~all 64 cells visible on phone)
export const MAX_SCALE = 80; // fully zoomed in

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export function worldToScreen(
  cam: Camera,
  wx: number,
  wy: number,
): [number, number] {
  return [cam.originX + wx * cam.scale, cam.originY - wy * cam.scale];
}

export function screenToWorld(
  cam: Camera,
  px: number,
  py: number,
): [number, number] {
  return [(px - cam.originX) / cam.scale, (cam.originY - py) / cam.scale];
}

/** The integer grid cell under a screen pixel. */
export function screenToCell(
  cam: Camera,
  px: number,
  py: number,
): [number, number] {
  const [wx, wy] = screenToWorld(cam, px, py);
  return [Math.floor(wx), Math.floor(wy)];
}

export function panBy(cam: Camera, dx: number, dy: number): Camera {
  return { ...cam, originX: cam.originX + dx, originY: cam.originY + dy };
}

/** Zoom by `factor` around a screen focal point, keeping that point fixed. */
export function zoomAround(
  cam: Camera,
  px: number,
  py: number,
  factor: number,
): Camera {
  const newScale = clamp(cam.scale * factor, MIN_SCALE, MAX_SCALE);
  const [wx, wy] = screenToWorld(cam, px, py);
  return {
    scale: newScale,
    originX: px - wx * newScale,
    originY: py + wy * newScale,
  };
}

/** Initial camera: centered on the character area, zoomed so ~cellsVisible fit. */
export function initialCamera(
  cssW: number,
  cssH: number,
  cellsVisible: number = 22,
  centerX: number = 32,
  centerY: number = 8,
): Camera {
  const scale = clamp(
    Math.min(cssW, cssH) / cellsVisible,
    MIN_SCALE,
    MAX_SCALE,
  );
  return {
    scale,
    originX: cssW / 2 - centerX * scale,
    originY: cssH / 2 + centerY * scale,
  };
}
