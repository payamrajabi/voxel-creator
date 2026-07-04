import type { ColorId } from "../core/types";
import type { VoxelKey } from "../core/voxelKey";

/**
 * Pure, framework-agnostic diff logic for undo/redo. The store wires these into
 * Zustand, but they operate on a plain Map so they're trivially unit-testable.
 */

/**
 * One reversible edit to a single voxel. `prev`/`next` are the color before and
 * after the edit (undefined = the cell is empty). Undo restores `prev`; redo
 * re-applies `next`.
 */
export type Change = {
  key: VoxelKey;
  prev: ColorId | undefined;
  next: ColorId | undefined;
};

/**
 * A batch of changes committed as one undo step — a single gesture (a paint
 * stroke, one 3D placement, a mirrored pair, a layer clear). `index` maps a key
 * to its slot in `changes` so repeated edits to the same cell within the gesture
 * coalesce into one change rather than stacking (and so undo order never matters,
 * since each key appears at most once).
 */
export type Transaction = {
  label: string;
  changes: Change[];
  index: Map<VoxelKey, number>;
};

export function newTransaction(label: string): Transaction {
  return { label, changes: [], index: new Map() };
}

/** Apply a change to a voxel map (set `next`, or delete when `next` is empty). */
export function applyChange(map: Map<VoxelKey, ColorId>, change: Change): void {
  if (change.next === undefined) map.delete(change.key);
  else map.set(change.key, change.next);
}

/** The inverse of a change (swaps prev/next), used for undo. */
export function invertChange(change: Change): Change {
  return { key: change.key, prev: change.next, next: change.prev };
}

/**
 * Record an intended edit into a transaction and apply it to `map`. Coalesces
 * repeated edits to the same key (keeps the gesture's original `prev`, updates
 * `next`) and drops no-ops. Returns true if the map actually changed.
 */
export function recordEdit(
  txn: Transaction,
  map: Map<VoxelKey, ColorId>,
  key: VoxelKey,
  next: ColorId | undefined,
): boolean {
  const slot = txn.index.get(key);
  if (slot === undefined) {
    const prev = map.get(key);
    if (prev === next) return false; // no-op
    txn.index.set(key, txn.changes.length);
    txn.changes.push({ key, prev, next });
  } else {
    const change = txn.changes[slot];
    if (change.next === next) return false; // already at this value
    change.next = next; // prev stays the gesture's original
  }
  applyChange(map, { key, prev: undefined, next });
  return true;
}
