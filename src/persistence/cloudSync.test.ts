import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ProjectData } from "../core/types";

vi.mock("./api", () => ({
  pullCharacters: vi.fn(),
  pushCharacters: vi.fn(),
}));
vi.mock("./db", () => ({
  getAllRecords: vi.fn(),
  putProject: vi.fn(),
}));
vi.mock("./thumbnail", () => ({
  frontThumbnail: vi.fn(() => "regenerated-thumb"),
}));

import { syncNow } from "./cloudSync";
import { pullCharacters, pushCharacters } from "./api";
import { getAllRecords, putProject } from "./db";

const data = (name: string): ProjectData => ({
  format: "voxelos-character",
  version: 1,
  name,
  gridSize: { x: 64, y: 64, z: 64 },
  voxels: [],
});
const local = (id: string, updatedAt: number, extra = {}) => ({
  id,
  name: id,
  data: data(id),
  updatedAt,
  createdAt: updatedAt,
  thumbnail: "local-thumb",
  ...extra,
});
const wire = (id: string, updatedAt: number, extra = {}) => ({
  id,
  name: id,
  data: data(id),
  updatedAt,
  ...extra,
});

beforeEach(() => vi.clearAllMocks());

describe("syncNow", () => {
  it("MIGRATION: uploads every local character when the account is empty, and writes nothing over local", async () => {
    vi.mocked(pullCharacters).mockResolvedValue([]);
    vi.mocked(getAllRecords).mockResolvedValue([local("a", 1), local("b", 2)]);

    await syncNow();

    expect(pushCharacters).toHaveBeenCalledTimes(1);
    const pushed = vi.mocked(pushCharacters).mock.calls[0][0].map((r) => r.id).sort();
    expect(pushed).toEqual(["a", "b"]);
    expect(putProject).not.toHaveBeenCalled(); // nothing removed/overwritten locally
  });

  it("adopts a server-only record locally, regenerating its thumbnail", async () => {
    vi.mocked(pullCharacters).mockResolvedValue([wire("c", 5)]);
    vi.mocked(getAllRecords).mockResolvedValue([]);

    await syncNow();

    expect(putProject).toHaveBeenCalledTimes(1);
    const applied = vi.mocked(putProject).mock.calls[0][0];
    expect(applied.id).toBe("c");
    expect(applied.thumbnail).toBe("regenerated-thumb");
    expect(pushCharacters).not.toHaveBeenCalled();
  });

  it("applies a newer server tombstone (a delete from another device)", async () => {
    vi.mocked(pullCharacters).mockResolvedValue([wire("a", 9, { deleted: true })]);
    vi.mocked(getAllRecords).mockResolvedValue([local("a", 2)]);

    await syncNow();

    const applied = vi.mocked(putProject).mock.calls[0][0];
    expect(applied.deleted).toBe(true);
    expect(applied.thumbnail).toBe(""); // tombstones carry no thumbnail
  });

  it("is offline-safe: if the pull fails, nothing is written or pushed", async () => {
    vi.mocked(pullCharacters).mockRejectedValue(new Error("offline"));
    vi.mocked(getAllRecords).mockResolvedValue([local("a", 1)]);

    await syncNow();

    expect(putProject).not.toHaveBeenCalled();
    expect(pushCharacters).not.toHaveBeenCalled();
  });
});
