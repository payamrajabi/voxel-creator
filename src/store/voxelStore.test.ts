import { describe, it, expect, beforeEach } from "vitest";
import { useVoxelStore } from "./voxelStore";

const s = () => useVoxelStore.getState();

beforeEach(() => s().reset());

describe("voxelStore", () => {
  it("sets and reads a voxel (standalone edit = one undo step)", () => {
    s().setVoxel(1, 2, 3, 5);
    expect(s().getVoxel(1, 2, 3)).toBe(5);
    expect(s().count()).toBe(1);
    expect(s().canUndo()).toBe(true);
    expect(s().undoStack.length).toBe(1);
  });

  it("coalesces a multi-cell stroke into ONE undo step", () => {
    s().transact("stroke", () => {
      s().setVoxel(0, 0, 0, 1);
      s().setVoxel(1, 0, 0, 1);
      s().setVoxel(2, 0, 0, 1);
    });
    expect(s().count()).toBe(3);
    expect(s().undoStack.length).toBe(1); // one gesture, one step
    s().undo();
    expect(s().count()).toBe(0); // whole stroke reverted at once
    s().redo();
    expect(s().count()).toBe(3);
  });

  it("repainting a cell within one stroke undoes to the original color", () => {
    s().setVoxel(0, 0, 0, 4); // pre-existing
    s().transact("stroke", () => {
      s().setVoxel(0, 0, 0, 1);
      s().setVoxel(0, 0, 0, 2); // repaint same cell in the same gesture
    });
    expect(s().getVoxel(0, 0, 0)).toBe(2);
    s().undo();
    expect(s().getVoxel(0, 0, 0)).toBe(4); // back to pre-stroke color, not empty
  });

  it("erase removes a voxel and is undoable", () => {
    s().setVoxel(5, 5, 5, 7);
    s().eraseVoxel(5, 5, 5);
    expect(s().has(5, 5, 5)).toBe(false);
    s().undo();
    expect(s().getVoxel(5, 5, 5)).toBe(7);
  });

  it("a new edit clears the redo stack", () => {
    s().setVoxel(0, 0, 0, 1);
    s().undo();
    expect(s().canRedo()).toBe(true);
    s().setVoxel(9, 9, 9, 2);
    expect(s().canRedo()).toBe(false);
  });

  it("no-op edits create no undo step", () => {
    s().setVoxel(0, 0, 0, 3);
    const steps = s().undoStack.length;
    s().setVoxel(0, 0, 0, 3); // same color
    expect(s().undoStack.length).toBe(steps);
  });

  it("revision increments on change", () => {
    const r0 = s().revision;
    s().setVoxel(0, 0, 0, 1);
    expect(s().revision).toBeGreaterThan(r0);
  });

  it("clearAll is a single undoable step", () => {
    s().transact("build", () => {
      s().setVoxel(0, 0, 0, 1);
      s().setVoxel(1, 0, 0, 1);
    });
    s().clearAll();
    expect(s().count()).toBe(0);
    s().undo();
    expect(s().count()).toBe(2);
  });

  it("bounds reflect the used extent", () => {
    s().setVoxel(2, 3, 4, 1);
    s().setVoxel(5, 1, 0, 1);
    expect(s().bounds()).toEqual({ min: [2, 1, 0], max: [5, 3, 4] });
  });

  it("round-trips through project data", () => {
    s().setVoxel(1, 2, 3, 6);
    s().setVoxel(0, 0, 0, 2);
    const data = s().toProjectData();
    s().reset();
    expect(s().count()).toBe(0);
    s().loadProjectData(data);
    expect(s().count()).toBe(2);
    expect(s().getVoxel(1, 2, 3)).toBe(6);
    expect(s().canUndo()).toBe(false); // loading is not itself undoable
  });
});
