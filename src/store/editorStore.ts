import { create } from "zustand";
import type { ColorId } from "../core/types";
import { HALF_EXTENT } from "../core/coords";

export type Tool = "paint" | "erase" | "eyedropper";
export type Mode = "2d" | "3d";

/** Keep the active depth-slice inside the centered buildable volume. */
const clampLayer = (z: number) =>
  Math.max(-HALF_EXTENT, Math.min(HALF_EXTENT, Math.floor(z)));

/**
 * Editor UI state — how you're looking at and touching the voxel data. Kept
 * separate from the voxel store (the data itself). `layer` is the active depth-
 * slice (Z, signed) where 2D edits land; it can go negative because the origin
 * is the center of the build volume. The depth scrubber's range is derived from
 * the model's actual Z-extent in `LayerBar`, not tracked here.
 */
export type EditorState = {
  mode: Mode;
  tool: Tool;
  color: ColorId;
  layer: number;
  onionSkin: boolean;

  setMode: (m: Mode) => void;
  setTool: (t: Tool) => void;
  setColor: (c: ColorId) => void;
  setLayer: (z: number) => void;
  nextLayer: () => void;
  prevLayer: () => void;
  toggleOnionSkin: () => void;
};

export const useEditorStore = create<EditorState>()((set) => ({
  mode: "2d",
  tool: "paint",
  color: 11, // Orange — a friendly, visible default
  layer: 0,
  onionSkin: false,

  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setLayer: (z) => set({ layer: clampLayer(z) }),
  nextLayer: () => set((s) => ({ layer: Math.min(HALF_EXTENT, s.layer + 1) })),
  prevLayer: () => set((s) => ({ layer: Math.max(-HALF_EXTENT, s.layer - 1) })),
  toggleOnionSkin: () => set((s) => ({ onionSkin: !s.onionSkin })),
}));
