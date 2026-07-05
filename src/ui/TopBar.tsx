"use client";

import { ArrowUUpLeft, ArrowUUpRight, X } from "@phosphor-icons/react/dist/ssr";
import { useVoxelStore } from "../store/voxelStore";
import { useAppStore } from "../store/appStore";

/** Frosted, iOS-style circular button used across the editor chrome. */
const circle =
  "pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full " +
  "border border-white/10 bg-zinc-900/60 text-white shadow-lg backdrop-blur-xl " +
  "transition active:scale-90";

/** Top corners: close (left) and undo/redo (right). Icon-only. */
export default function TopBar() {
  const canUndo = useVoxelStore((s) => s.undoStack.length > 0);
  const canRedo = useVoxelStore((s) => s.redoStack.length > 0);
  const undo = useVoxelStore((s) => s.undo);
  const redo = useVoxelStore((s) => s.redo);

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3"
      style={{ paddingTop: "calc(env(safe-area-inset-top) + 0.5rem)" }}
    >
      <button
        onClick={() => void useAppStore.getState().exitToGallery()}
        className={circle}
        aria-label="Close — back to your projects"
      >
        <X size={22} weight="bold" />
      </button>

      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          disabled={!canUndo}
          className={`${circle} disabled:opacity-30 disabled:active:scale-100`}
          aria-label="Undo"
        >
          <ArrowUUpLeft size={22} weight="bold" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo}
          className={`${circle} disabled:opacity-30 disabled:active:scale-100`}
          aria-label="Redo"
        >
          <ArrowUUpRight size={22} weight="bold" />
        </button>
      </div>
    </div>
  );
}
