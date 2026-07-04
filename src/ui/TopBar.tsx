"use client";

import { useEditorStore } from "../store/editorStore";
import { useVoxelStore } from "../store/voxelStore";
import { useAppStore } from "../store/appStore";

/** Compact top bar: title, undo/redo, and the 2D/3D mode toggle. */
export default function TopBar() {
  const canUndo = useVoxelStore((s) => s.undoStack.length > 0);
  const canRedo = useVoxelStore((s) => s.redoStack.length > 0);
  const undo = useVoxelStore((s) => s.undo);
  const redo = useVoxelStore((s) => s.redo);
  const mode = useEditorStore((s) => s.mode);
  const setMode = useEditorStore((s) => s.setMode);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between gap-2 p-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <button
        onClick={() => void useAppStore.getState().exitToGallery()}
        className="pointer-events-auto flex items-center gap-1 rounded-xl bg-zinc-900/70 px-3 py-1.5 text-sm font-semibold backdrop-blur transition-transform active:scale-95"
        aria-label="Back to your characters (saves first)"
      >
        <span className="text-zinc-400">‹</span> Projects
      </button>

      <div className="pointer-events-auto flex items-center gap-1 rounded-xl bg-zinc-900/70 p-1 backdrop-blur">
        <button
          onClick={undo}
          disabled={!canUndo}
          className="rounded-lg px-3 py-1.5 text-base disabled:opacity-30"
          aria-label="Undo"
        >
          ↶
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className="rounded-lg px-3 py-1.5 text-base disabled:opacity-30"
          aria-label="Redo"
        >
          ↷
        </button>
      </div>

      <div className="pointer-events-auto flex overflow-hidden rounded-xl bg-zinc-900/70 text-xs font-medium backdrop-blur">
        {(["2d", "3d"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-3 py-1.5 uppercase ${
              mode === m ? "bg-white text-black" : "text-zinc-300"
            }`}
            title={m === "3d" ? "3D view — orbit your character" : "2D editing"}
          >
            {m}
          </button>
        ))}
      </div>
    </div>
  );
}
