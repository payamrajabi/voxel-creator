import { create } from "zustand";
import type { ColorId } from "../core/types";

export type Tool = "paint" | "erase" | "eyedropper";
export type Mode = "2d" | "3d";

const MAX_DEPTH = 64;

/**
 * Editor UI state — how you're looking at and touching the voxel data. Kept
 * separate from the voxel store (the data itself). `layer` is the active depth-
 * slice (Z) where 2D edits land; `layerCount` is how many slices the depth
 * scrubber exposes (grows as you build front-to-back).
 */
export type EditorState = {
  mode: Mode;
  tool: Tool;
  color: ColorId;
  layer: number;
  layerCount: number;
  onionSkin: boolean;

  setMode: (m: Mode) => void;
  setTool: (t: Tool) => void;
  setColor: (c: ColorId) => void;
  setLayer: (z: number) => void;
  nextLayer: () => void;
  prevLayer: () => void;
  setLayerCount: (n: number) => void;
  toggleOnionSkin: () => void;
};

export const useEditorStore = create<EditorState>()((set) => ({
  mode: "2d",
  tool: "paint",
  color: 11, // Orange — a friendly, visible default
  layer: 0,
  layerCount: 1,
  onionSkin: false,

  setMode: (mode) => set({ mode }),
  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
  setLayer: (z) =>
    set((s) => {
      const layer = Math.max(0, Math.min(MAX_DEPTH - 1, Math.floor(z)));
      return { layer, layerCount: Math.max(s.layerCount, layer + 1) };
    }),
  nextLayer: () =>
    set((s) => {
      const layer = Math.min(MAX_DEPTH - 1, s.layer + 1);
      return { layer, layerCount: Math.max(s.layerCount, layer + 1) };
    }),
  prevLayer: () => set((s) => ({ layer: Math.max(0, s.layer - 1) })),
  setLayerCount: (n) =>
    set({ layerCount: Math.max(1, Math.min(MAX_DEPTH, Math.floor(n))) }),
  toggleOnionSkin: () => set((s) => ({ onionSkin: !s.onionSkin })),
}));
