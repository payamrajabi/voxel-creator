import { create } from "zustand";
import type { ColorId } from "../core/types";

export type Tool = "paint" | "erase" | "eyedropper";

/**
 * Editor UI state — the active tool and color for touching the voxel data.
 * Kept separate from the voxel store (the data itself). The app is always in
 * 3D: you build by tapping faces and by long-press-dragging cubes onto the
 * scene, so there's no view mode or depth-slice concept to track here anymore.
 */
export type EditorState = {
  tool: Tool;
  color: ColorId;

  setTool: (t: Tool) => void;
  setColor: (c: ColorId) => void;
};

export const useEditorStore = create<EditorState>()((set) => ({
  tool: "paint",
  color: 11, // Orange — a friendly, visible default

  setTool: (tool) => set({ tool }),
  setColor: (color) => set({ color }),
}));
