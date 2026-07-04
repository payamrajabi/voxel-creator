/** Pure, testable gesture math. DOM pointer wiring lives in the canvas. */

export type Pt = { x: number; y: number };

export function dist(a: Pt, b: Pt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

export function midpoint(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Default movement (px) under which a pointer press counts as a tap, not a drag. */
export const TAP_SLOP = 6;

export function isTap(down: Pt, up: Pt, slop: number = TAP_SLOP): boolean {
  return dist(down, up) <= slop;
}

/**
 * Integer grid cells along the line from (x0,y0) to (x1,y1), inclusive
 * (Bresenham). Used so a fast paint drag fills every cell between pointer
 * samples instead of leaving gaps.
 */
export function cellsAlongLine(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): [number, number][] {
  const cells: [number, number][] = [];
  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;
  let x = x0;
  let y = y0;
  for (;;) {
    cells.push([x, y]);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x += sx;
    }
    if (e2 < dx) {
      err += dx;
      y += sy;
    }
  }
  return cells;
}
