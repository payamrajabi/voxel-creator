import { describe, it, expect } from "vitest";
import { reconcile, type SyncMeta } from "./sync";

type Rec = SyncMeta & { name: string };
const rec = (id: string, updatedAt: number, name = id, deleted = false): Rec => ({
  id,
  updatedAt,
  name,
  deleted,
});

describe("reconcile", () => {
  it("first sync against an empty account uploads ALL local records and applies nothing (never wipes)", () => {
    const local = [rec("a", 1), rec("b", 2), rec("c", 3)];
    const { toPush, toApply } = reconcile(local, []);
    expect(toPush.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
    expect(toApply).toEqual([]);
  });

  it("adopts records that only exist on the server", () => {
    const { toPush, toApply } = reconcile([], [rec("a", 1)]);
    expect(toApply.map((r) => r.id)).toEqual(["a"]);
    expect(toPush).toEqual([]);
  });

  it("last-write-wins: a locally-newer edit is pushed, not applied", () => {
    const { toPush, toApply } = reconcile([rec("a", 5, "local")], [rec("a", 3, "server")]);
    expect(toPush.map((r) => r.name)).toEqual(["local"]);
    expect(toApply).toEqual([]);
  });

  it("last-write-wins: a server-newer edit is applied, not pushed", () => {
    const { toPush, toApply } = reconcile([rec("a", 3, "local")], [rec("a", 5, "server")]);
    expect(toApply.map((r) => r.name)).toEqual(["server"]);
    expect(toPush).toEqual([]);
  });

  it("equal timestamps are already in sync: neither pushed nor applied", () => {
    const { toPush, toApply } = reconcile([rec("a", 4)], [rec("a", 4)]);
    expect(toPush).toEqual([]);
    expect(toApply).toEqual([]);
  });

  it("a newer server tombstone is applied (a delete on another device propagates)", () => {
    const { toApply } = reconcile([rec("a", 2)], [rec("a", 9, "a", true)]);
    expect(toApply).toHaveLength(1);
    expect(toApply[0].deleted).toBe(true);
  });

  it("an older server tombstone does NOT clobber a newer local edit", () => {
    const { toPush, toApply } = reconcile([rec("a", 9, "revived")], [rec("a", 2, "a", true)]);
    expect(toPush.map((r) => r.name)).toEqual(["revived"]);
    expect(toApply).toEqual([]);
  });

  it("handles disjoint local and server sets", () => {
    const { toPush, toApply } = reconcile([rec("a", 1)], [rec("b", 1)]);
    expect(toPush.map((r) => r.id)).toEqual(["a"]);
    expect(toApply.map((r) => r.id)).toEqual(["b"]);
  });
});
