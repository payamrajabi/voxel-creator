import type { ProjectData } from "../core/types";
import { colorHex } from "../core/palette";

/**
 * A small front-view PNG for gallery cards: the front-most (lowest Z) color of
 * each (x,y) column, centered on a square. Pure client-side canvas work; returns
 * "" for an empty character or outside the browser. Y is flipped so feet sit at
 * the bottom.
 */
export function frontThumbnail(data: ProjectData, size = 160): string {
  if (typeof document === "undefined" || data.voxels.length === 0) return "";

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const front = new Map<string, { z: number; c: number }>();
  for (const v of data.voxels) {
    if (v.x < minX) minX = v.x;
    if (v.x > maxX) maxX = v.x;
    if (v.y < minY) minY = v.y;
    if (v.y > maxY) maxY = v.y;
    const key = `${v.x},${v.y}`;
    const cur = front.get(key);
    if (!cur || v.z < cur.z) front.set(key, { z: v.z, c: v.c });
  }

  const cols = maxX - minX + 1;
  const rows = maxY - minY + 1;
  const pad = 10;
  const cell = Math.max(1, Math.floor((size - pad * 2) / Math.max(cols, rows)));
  const gridW = cols * cell;
  const gridH = rows * cell;
  const offX = Math.floor((size - gridW) / 2);
  const offY = Math.floor((size - gridH) / 2);

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.fillStyle = "#2e2f32";
  ctx.fillRect(0, 0, size, size);
  for (const [key, { c }] of front) {
    const [x, y] = key.split(",").map(Number);
    const px = offX + (x - minX) * cell;
    const py = offY + (maxY - y) * cell; // flip Y: feet at the bottom
    ctx.fillStyle = colorHex(c);
    ctx.fillRect(px, py, cell, cell);
  }
  return canvas.toDataURL("image/png");
}
