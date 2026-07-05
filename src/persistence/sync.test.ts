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
  it("first sync against an empty account keeps ALL local records and queues them to upload (never wipes)", () => {
    const local = [rec("a", 1), rec("b", 2), rec("c", 3)];
    const { merged, toPush } = reconcile(local, []);
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
    expect(toPush.map((r) => r.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("adopts records that only exist on the server", () => {
    const { merged, toPush } = reconcile([], [rec("a", 1)]);
    expect(merged.map((r) => r.id)).toEqual(["a"]);
    expect(toPush).toEqual([]);
  });

  it("last-write-wins: a locally-newer edit is kept and pushed", () => {
    const { merged, toPush } = reconcile([rec("a", 5, "local")], [rec("a", 3, "server")]);
    expect(merged[0].name).toBe("local");
    expect(toPush.map((r) => r.id)).toEqual(["a"]);
  });

  it("last-write-wins: a server-newer edit is taken, nothing pushed", () => {
    const { merged, toPush } = reconcile([rec("a", 3, "local")], [rec("a", 5, "server")]);
    expect(merged[0].name).toBe("server");
    expect(toPush).toEqual([]);
  });

  it("equal timestamps are already in sync: keep, no push", () => {
    const { merged, toPush } = reconcile([rec("a", 4)], [rec("a", 4)]);
    expect(merged).toHaveLength(1);
    expect(toPush).toEqual([]);
  });

  it("a newer server tombstone deletes locally (a delete on another device propagates)", () => {
    const { merged, toPush } = reconcile([rec("a", 2)], [rec("a", 9, "a", true)]);
    expect(merged[0].deleted).toBe(true);
    expect(toPush).toEqual([]);
  });

  it("an older server tombstone does NOT clobber a newer local edit", () => {
    const { merged, toPush } = reconcile([rec("a", 9, "revived")], [rec("a", 2, "a", true)]);
    expect(merged[0].deleted).toBe(false);
    expect(toPush.map((r) => r.id)).toEqual(["a"]);
  });

  it("unions disjoint local and server sets", () => {
    const { merged, toPush } = reconcile([rec("a", 1)], [rec("b", 1)]);
    expect(merged.map((r) => r.id).sort()).toEqual(["a", "b"]);
    expect(toPush.map((r) => r.id)).toEqual(["a"]);
  });
});
