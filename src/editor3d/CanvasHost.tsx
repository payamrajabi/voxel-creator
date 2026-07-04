"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { Pt } from "../input/gesture";

// react-three-fiber touches WebGL / `window` during render, so the scene must
// never be server-rendered. `ssr: false` is only allowed inside a Client
// Component (Next 16), which is why this thin host exists.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#2e2f32] text-xs text-zinc-500">
      loading 3D…
    </div>
  ),
});

/**
 * Measures its own box and gives the r3f scene a parent with explicit pixel
 * dimensions. Relying on r3f's auto-measure is unreliable when the canvas mounts
 * late (e.g. on a 2D→3D toggle), so we size it ourselves.
 *
 * Also records where each pointer went down (in capture phase, before r3f's
 * raycast handlers run) so the scene can tell a tap-to-edit from an orbit drag.
 */
export default function CanvasHost() {
  const ref = useRef<HTMLDivElement>(null);
  const downRef = useRef<Pt | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="h-full w-full touch-none"
      onPointerDownCapture={(e) => {
        downRef.current = { x: e.clientX, y: e.clientY };
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {size && size.w > 0 && size.h > 0 && (
        <div style={{ width: size.w, height: size.h }}>
          <Scene3D downRef={downRef} />
        </div>
      )}
    </div>
  );
}
