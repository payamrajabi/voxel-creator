import { create } from "zustand";
import type { Bounds, ColorId, GridSize, ProjectData } from "../core/types";
import { toKey, fromKey, type VoxelKey } from "../core/voxelKey";
import { boundsOfKeys, DEFAULT_GRID_SIZE } from "../core/coords";
import { serialize, deserialize } from "../core/serialize";
import {
  applyChange,
  invertChange,
  newTransaction,
  recordEdit,
  type Transaction,
} from "./history";

/**
 * The single source of truth: a sparse map of placed voxels plus undo/redo
 * state. EVERY mutation flows through the transaction gate (`setVoxel` /
 * `eraseVoxel` inside a `transact`, or as standalone one-shot edits), so undo
 * works uniformly across 2D and 3D and can never be bypassed.
 *
 * Reactivity note: the `voxels` Map is mutated in place for speed, so its
 * reference does not change. Views must subscribe to `revision` (bumped on every
 * data change) to re-render — selecting `voxels` alone will not update.
 */
export type VoxelState = {
  voxels: Map<VoxelKey, ColorId>;
  revision: number;
  name: string;
  gridSize: GridSize;
  undoStack: Transaction[];
  redoStack: Transaction[];
  openTxn: Transaction | null;

  // ---- queries ----
  getVoxel: (x: number, y: number, z: number) => ColorId | undefined;
  has: (x: number, y: number, z: number) => boolean;
  count: () => number;
  bounds: () => Bounds | null;

  // ---- mutation gate (the ONLY way to change voxels) ----
  begin: (label: string) => void;
  setVoxel: (x: number, y: number, z: number, c: ColorId) => void;
  eraseVoxel: (x: number, y: number, z: number) => void;
  commit: () => void;
  /** Run `fn` as one undo step; nested calls join the outer transaction. */
  transact: (label: string, fn: () => void) => void;

  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  clearAll: () => void;

  // ---- persistence bridge ----
  toProjectData: () => ProjectData;
  loadProjectData: (data: ProjectData) => void;
  reset: () => void;
};

export const useVoxelStore = create<VoxelState>()((set, get) => ({
  voxels: new Map(),
  revision: 0,
  name: "Untitled",
  gridSize: DEFAULT_GRID_SIZE,
  undoStack: [],
  redoStack: [],
  openTxn: null,

  getVoxel: (x, y, z) => get().voxels.get(toKey(x, y, z)),
  has: (x, y, z) => get().voxels.has(toKey(x, y, z)),
  count: () => get().voxels.size,
  bounds: () => boundsOfKeys(get().voxels.keys()),

  begin: (label) => {
    if (!get().openTxn) set({ openTxn: newTransaction(label) });
  },

  setVoxel: (x, y, z, c) => {
    const standalone = !get().openTxn;
    if (standalone) get().begin("paint");
    const changed = recordEdit(get().openTxn!, get().voxels, toKey(x, y, z), c);
    if (changed) set({ revision: get().revision + 1 });
    if (standalone) get().commit();
  },

  eraseVoxel: (x, y, z) => {
    const standalone = !get().openTxn;
    if (standalone) get().begin("erase");
    const changed = recordEdit(
      get().openTxn!,
      get().voxels,
      toKey(x, y, z),
      undefined,
    );
    if (changed) set({ revision: get().revision + 1 });
    if (standalone) get().commit();
  },

  commit: () => {
    const txn = get().openTxn;
    if (!txn) return;
    const meaningful = txn.changes.some((c) => c.prev !== c.next);
    if (!meaningful) {
      set({ openTxn: null });
      return;
    }
    set({
      undoStack: [...get().undoStack, txn],
      redoStack: [],
      openTxn: null,
    });
  },

  transact: (label, fn) => {
    if (get().openTxn) {
      fn(); // already inside a transaction — join it, don't nest
      return;
    }
    get().begin(label);
    try {
      fn();
    } finally {
      get().commit();
    }
  },

  undo: () => {
    const stack = get().undoStack;
    if (stack.length === 0) return;
    const txn = stack[stack.length - 1];
    const map = get().voxels;
    for (const ch of txn.changes) applyChange(map, invertChange(ch));
    set({
      undoStack: stack.slice(0, -1),
      redoStack: [...get().redoStack, txn],
      revision: get().revision + 1,
    });
  },

  redo: () => {
    const stack = get().redoStack;
    if (stack.length === 0) return;
    const txn = stack[stack.length - 1];
    const map = get().voxels;
    for (const ch of txn.changes) applyChange(map, ch);
    set({
      redoStack: stack.slice(0, -1),
      undoStack: [...get().undoStack, txn],
      revision: get().revision + 1,
    });
  },

  canUndo: () => get().undoStack.length > 0,
  canRedo: () => get().redoStack.length > 0,

  clearAll: () => {
    const map = get().voxels;
    if (map.size === 0) return;
    get().transact("clear all", () => {
      for (const key of [...map.keys()]) {
        const [x, y, z] = fromKey(key);
        get().eraseVoxel(x, y, z);
      }
    });
  },

  toProjectData: () =>
    serialize({
      name: get().name,
      gridSize: get().gridSize,
      voxels: get().voxels,
    }),

  loadProjectData: (data) => {
    const { name, gridSize, voxels } = deserialize(data);
    set({
      name,
      gridSize,
      voxels,
      revision: get().revision + 1,
      undoStack: [],
      redoStack: [],
      openTxn: null,
    });
  },

  reset: () =>
    set({
      voxels: new Map(),
      revision: get().revision + 1,
      name: "Untitled",
      gridSize: DEFAULT_GRID_SIZE,
      undoStack: [],
      redoStack: [],
      openTxn: null,
    }),
}));
