import { describe, it, expect } from "vitest";
import {
  applyChange,
  invertChange,
  newTransaction,
  recordEdit,
} from "./history";
import { toKey } from "../core/voxelKey";

describe("history diff logic", () => {
  it("records a new edit and applies it to the map", () => {
    const map = new Map<string, number>();
    const txn = newTransaction("t");
    expect(recordEdit(txn, map, toKey(0, 0, 0), 5)).toBe(true);
    expect(map.get("0,0,0")).toBe(5);
    expect(txn.changes).toEqual([{ key: "0,0,0", prev: undefined, next: 5 }]);
  });

  it("coalesces repeated edits to the same cell into one change", () => {
    const map = new Map<string, number>();
    const txn = newTransaction("t");
    recordEdit(txn, map, toKey(1, 1, 1), 2);
    recordEdit(txn, map, toKey(1, 1, 1), 7); // repaint same cell
    expect(txn.changes.length).toBe(1);
    expect(txn.changes[0]).toEqual({ key: "1,1,1", prev: undefined, next: 7 });
    expect(map.get("1,1,1")).toBe(7);
  });

  it("drops no-ops (same value already present)", () => {
    const map = new Map<string, number>([["0,0,0", 3]]);
    const txn = newTransaction("t");
    expect(recordEdit(txn, map, toKey(0, 0, 0), 3)).toBe(false);
    expect(txn.changes.length).toBe(0);
  });

  it("invertChange swaps prev/next", () => {
    expect(invertChange({ key: "k", prev: 1, next: 2 })).toEqual({
      key: "k",
      prev: 2,
      next: 1,
    });
  });

  it("applyChange deletes the cell when next is empty", () => {
    const map = new Map<string, number>([["k", 9]]);
    applyChange(map, { key: "k", prev: 9, next: undefined });
    expect(map.has("k")).toBe(false);
  });
});
