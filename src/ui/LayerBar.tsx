"use client";

import { useEditorStore } from "../store/editorStore";

/** Depth navigation for 2D mode: prev/next, readout, scrubber, onion toggle. */
export default function LayerBar() {
  const layer = useEditorStore((s) => s.layer);
  const layerCount = useEditorStore((s) => s.layerCount);
  const onion = useEditorStore((s) => s.onionSkin);
  const setLayer = useEditorStore((s) => s.setLayer);
  const nextLayer = useEditorStore((s) => s.nextLayer);
  const prevLayer = useEditorStore((s) => s.prevLayer);
  const toggleOnion = useEditorStore((s) => s.toggleOnionSkin);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-20 flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top) + 3.75rem)" }}
    >
      <div className="pointer-events-auto flex items-center gap-1.5 rounded-xl bg-zinc-900/70 px-2 py-1.5 text-xs backdrop-blur">
        <button
          onClick={prevLayer}
          disabled={layer <= 0}
          className="rounded-lg px-2 py-1 disabled:opacity-30"
          aria-label="Previous layer"
        >
          ◀
        </button>
        <span className="min-w-[5rem] text-center tabular-nums text-zinc-200">
          Layer {layer + 1} / {layerCount}
        </span>
        <button
          onClick={nextLayer}
          disabled={layer >= 63}
          className="rounded-lg px-2 py-1 disabled:opacity-30"
          aria-label="Next layer"
        >
          ▶
        </button>
        <input
          type="range"
          min={0}
          max={Math.max(0, layerCount - 1)}
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
