"use client";

import { useMemo } from "react";
import { useEditorStore } from "../store/editorStore";
import { useVoxelStore } from "../store/voxelStore";
import { HALF_EXTENT } from "../core/coords";

/** Depth navigation for 2D mode: prev/next, readout, scrubber, onion toggle. */
export default function LayerBar() {
  const layer = useEditorStore((s) => s.layer);
  const onion = useEditorStore((s) => s.onionSkin);
  const setLayer = useEditorStore((s) => s.setLayer);
  const nextLayer = useEditorStore((s) => s.nextLayer);
  const prevLayer = useEditorStore((s) => s.prevLayer);
  const toggleOnion = useEditorStore((s) => s.toggleOnionSkin);

  // The scrubber spans the depths the character actually uses (plus a little
  // room to grow on each side), recomputed as the model changes. The current
  // layer is always included, so scrubbing past the model extends the range.
  const revision = useVoxelStore((s) => s.revision);
  const [lo, hi] = useMemo(() => {
    const b = useVoxelStore.getState().bounds();
    const minZ = b ? b.min[2] : 0;
    const maxZ = b ? b.max[2] : 0;
    return [
      Math.max(-HALF_EXTENT, Math.min(minZ, layer) - 2),
      Math.min(HALF_EXTENT, Math.max(maxZ, layer) + 2),
    ] as const;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revision, layer]);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top) + 3.75rem)" }}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-zinc-900/70 px-2 py-1.5 text-xs backdrop-blur">
        <button
          onClick={prevLayer}
          disabled={layer <= -HALF_EXTENT}
          className="rounded-lg px-2 py-1 disabled:opacity-30"
          aria-label="Previous layer"
        >
          ◀
        </button>
        <span className="min-w-[5rem] text-center tabular-nums text-zinc-200">
          Depth {layer}
        </span>
        <button
          onClick={nextLayer}
          disabled={layer >= HALF_EXTENT}
          className="rounded-lg px-2 py-1 disabled:opacity-30"
          aria-label="Next layer"
        >
          ▶
        </button>
        <input
          type="range"
          min={lo}
          max={hi}
          value={layer}
          onChange={(e) => setLayer(Number(e.target.value))}
          className="mx-1 hidden w-28 accent-white sm:block"
          aria-label="Depth scrubber"
        />
        <button
          onClick={toggleOnion}
          className={`rounded-lg px-2 py-1 font-medium ${
            onion ? "bg-white text-black" : "text-zinc-300"
          }`}
          title="Onion skin — show adjacent slices"
        >
          Onion
        </button>
      </div>
    </div>
  );
}
