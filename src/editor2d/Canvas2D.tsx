"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVoxelStore } from "../store/voxelStore";
import { useEditorStore } from "../store/editorStore";
import { colorHex } from "../core/palette";
import { fromKey } from "../core/voxelKey";
import { isInsideGrid } from "../core/coords";
import {
  cellsAlongLine,
  dist,
  midpoint,
  type Pt,
} from "../input/gesture";
import {
  type Camera,
  initialCamera,
  panBy,
  screenToCell,
  screenToWorld,
  worldToScreen,
  zoomAround,
} from "./camera";

/**
 * The 2D depth-slice editor. Renders the active Z-slice as colored cells on a
 * grid (HTML Canvas 2D) and turns pointer input into paint/erase/eyedropper
 * edits on the shared voxel store. Feet are at the bottom (Y up). Two fingers
 * pan + pinch-zoom; wheel zooms; right-click quick-erases.
 */
export default function Canvas2D() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camRef = useRef<Camera | null>(null);
  const dprRef = useRef(1);
  const sizeRef = useRef({ w: 0, h: 0 });
  const rafRef = useRef<number | null>(null);

  const pointers = useRef<Map<number, Pt>>(new Map());
  const pinchRef = useRef<{ dist: number; mid: Pt } | null>(null);
  const stroke = useRef<{
    lastCell: [number, number];
    erasing: boolean;
  } | null>(null);
  const panRef = useRef<{ id: number; last: Pt } | null>(null);
  const spaceDown = useRef(false);

  const localPt = (e: { clientX: number; clientY: number }): Pt => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const cam = camRef.current;
    if (!canvas || !cam) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { w, h } = sizeRef.current;
    const s = cam.scale;
    ctx.setTransform(dprRef.current, 0, 0, dprRef.current, 0, 0);
    ctx.fillStyle = "#2e2f32";
    ctx.fillRect(0, 0, w, h);

    const { layer, onionSkin } = useEditorStore.getState();
    const voxels = useVoxelStore.getState().voxels;

    // Visible cell window (clamped to the 64³ grid), with a 1-cell margin.
    const [wx0] = screenToWorld(cam, 0, 0);
    const [wx1] = screenToWorld(cam, w, 0);
    const [, wyTop] = screenToWorld(cam, 0, 0);
    const [, wyBot] = screenToWorld(cam, 0, h);
    const gx0 = Math.max(0, Math.floor(wx0));
    const gx1 = Math.min(64, Math.ceil(wx1));
    const gy0 = Math.max(0, Math.floor(wyBot));
    const gy1 = Math.min(64, Math.ceil(wyTop));

    const fill = (x: number, y: number, hex: string, alpha: number) => {
      const [sx, sy] = worldToScreen(cam, x, y + 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = hex;
      ctx.fillRect(sx, sy, s, s);
    };
    const visible = (x: number, y: number) =>
      x >= gx0 - 1 && x <= gx1 + 1 && y >= gy0 - 1 && y <= gy1 + 1;

    // Onion-skin ghosts of the adjacent slices (faint), behind the active layer.
    if (onionSkin) {
      for (const [key, c] of voxels) {
        const [x, y, z] = fromKey(key);
        if ((z === layer - 1 || z === layer + 1) && visible(x, y)) {
          fill(x, y, colorHex(c), 0.18);
        }
      }
    }
    // Active-layer cells.
    for (const [key, c] of voxels) {
      const [x, y, z] = fromKey(key);
      if (z === layer && visible(x, y)) fill(x, y, colorHex(c), 1);
    }
    ctx.globalAlpha = 1;

    // Grid (only when zoomed in enough to read).
    if (s >= 6) {
      ctx.lineWidth = 1;
      ctx.strokeStyle = "#3a3f45";
      ctx.beginPath();
      for (let x = gx0; x <= gx1; x++) {
        const [sx] = worldToScreen(cam, x, 0);
        const [, top] = worldToScreen(cam, x, gy1);
        const [, bot] = worldToScreen(cam, x, gy0);
        ctx.moveTo(Math.round(sx) + 0.5, top);
        ctx.lineTo(Math.round(sx) + 0.5, bot);
      }
      for (let y = gy0; y <= gy1; y++) {
        const [left, sy] = worldToScreen(cam, gx0, y);
        const [right] = worldToScreen(cam, gx1, y);
        ctx.moveTo(left, Math.round(sy) + 0.5);
        ctx.lineTo(right, Math.round(sy) + 0.5);
      }
      ctx.stroke();
      // Emphasize the ground line (Y=0) so "feet at the bottom" reads clearly.
      if (gy0 <= 0 && gy1 >= 0) {
        const [left, gy] = worldToScreen(cam, gx0, 0);
        const [right] = worldToScreen(cam, gx1, 0);
        ctx.strokeStyle = "#5b626b";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(left, Math.round(gy) + 0.5);
        ctx.lineTo(right, Math.round(gy) + 0.5);
        ctx.stroke();
      }
    }
  }, []);

  const scheduleDraw = useCallback(() => {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      draw();
    });
  }, [draw]);

  const paintCell = (x: number, y: number, erasing: boolean) => {
    const layer = useEditorStore.getState().layer;
    if (!isInsideGrid(x, y, layer)) return;
    const vs = useVoxelStore.getState();
    if (erasing) vs.eraseVoxel(x, y, layer);
    else vs.setVoxel(x, y, layer, useEditorStore.getState().color);
  };

  const endStroke = () => {
    if (stroke.current) {
      useVoxelStore.getState().commit();
      stroke.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    try {
      canvasRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // pointer id may not be capturable (e.g. synthetic events)
    }
    const p = localPt(e);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size >= 2) {
      endStroke(); // switching to pan/zoom
      panRef.current = null;
      const [a, b] = [...pointers.current.values()];
      pinchRef.current = { dist: dist(a, b), mid: midpoint(a, b) };
      return;
    }

    // Space+drag or middle-mouse → pan.
    if (spaceDown.current || e.button === 1) {
      panRef.current = { id: e.pointerId, last: p };
      return;
    }

    const cam = camRef.current!;
    const [cx, cy] = screenToCell(cam, p.x, p.y);
    const tool = useEditorStore.getState().tool;

    // Right-click → quick-erase.
    if (e.button === 2) {
      useVoxelStore.getState().transact("erase", () => paintCell(cx, cy, true));
      return;
    }
    if (tool === "eyedropper") {
      const c = useVoxelStore.getState().getVoxel(cx, cy, useEditorStore.getState().layer);
      if (c !== undefined) useEditorStore.getState().setColor(c);
      return;
    }
    const erasing = tool === "erase";
    useVoxelStore.getState().begin(erasing ? "erase" : "paint");
    stroke.current = { lastCell: [cx, cy], erasing };
    paintCell(cx, cy, erasing);
    scheduleDraw();
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    const p = localPt(e);
    pointers.current.set(e.pointerId, p);

    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()];
      const nd = dist(a, b);
      const nm = midpoint(a, b);
      const prev = pinchRef.current;
      if (prev) {
        let cam = panBy(
          camRef.current!,
          nm.x - prev.mid.x,
          nm.y - prev.mid.y,
        );
        cam = zoomAround(cam, nm.x, nm.y, prev.dist > 0 ? nd / prev.dist : 1);
        camRef.current = cam;
        scheduleDraw();
      }
      pinchRef.current = { dist: nd, mid: nm };
      return;
    }

    if (panRef.current?.id === e.pointerId) {
      camRef.current = panBy(
        camRef.current!,
        p.x - panRef.current.last.x,
        p.y - panRef.current.last.y,
      );
      panRef.current.last = p;
      scheduleDraw();
      return;
    }

    if (stroke.current) {
      const [cx, cy] = screenToCell(camRef.current!, p.x, p.y);
      const [lx, ly] = stroke.current.lastCell;
      if (lx !== cx || ly !== cy) {
        for (const [x, y] of cellsAlongLine(lx, ly, cx, cy)) {
          paintCell(x, y, stroke.current.erasing);
        }
        stroke.current.lastCell = [cx, cy];
        scheduleDraw();
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // pointer may already be released
    }
    if (pointers.current.size < 2) pinchRef.current = null;
    if (panRef.current?.id === e.pointerId) panRef.current = null;
    endStroke();
  };

  // Resize + DPR handling.
  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const resize = () => {
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (w === 0 || h === 0) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;
      sizeRef.current = { w, h };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (!camRef.current) camRef.current = initialCamera(w, h);
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    resize();
    return () => ro.disconnect();
  }, [draw]);

  // Redraw whenever the voxel data or view settings change.
  useEffect(() => {
    const u1 = useVoxelStore.subscribe(scheduleDraw);
    const u2 = useEditorStore.subscribe(scheduleDraw);
    return () => {
      u1();
      u2();
    };
  }, [scheduleDraw]);

  // Wheel zoom (non-passive so we can preventDefault) + spacebar-pan tracking.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const p = localPt(e);
      camRef.current = zoomAround(
        camRef.current!,
        p.x,
        p.y,
        Math.exp(-e.deltaY * 0.0015),
      );
      scheduleDraw();
    };
    const onKey = (down: boolean) => (e: KeyboardEvent) => {
      if (e.code === "Space") spaceDown.current = down;
    };
    const kd = onKey(true);
    const ku = onKey(false);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [scheduleDraw]);

  return (
    <div ref={wrapRef} className="relative h-full w-full touch-none">
      <canvas
        ref={canvasRef}
        className="block"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onContextMenu={(e) => e.preventDefault()}
      />
    </div>
  );
}
