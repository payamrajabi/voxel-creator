import { create } from "zustand";
import type { ColorId } from "../core/types";

export type Tool = "paint" | "erase" | "eyedropper";
export type Mode = "2d" | "3d";

/**
 * Editor UI state — how you're looking at and touching the voxel data. Kept
 * separate from the voxel store (the data itself). Both modes read/write the
 * same voxel store; this just tracks the current view + tool + selection.
 */
export type EditorState = {
  mode: Mode;
  tool: Tool;
  color: ColorId;
  /** Active depth-slice; in 2D this Z is where edits land (PRD §3). */
  layer: number;
  onionSkin: boolean;

  setMode: (m: Mode) => void;
  setTool: (t: Tool) => void;
  setColor: (c: ColorId) => void;
  setLayer: (z: number) => void;
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
  setLayer: (layer) => set({ layer: Math.max(0, Math.floor(layer)) }),
  toggleOnionSkin: () => set((s) => ({ onionSkin: !s.onionSkin })),
}));
