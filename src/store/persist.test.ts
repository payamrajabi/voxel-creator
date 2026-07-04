import { describe, it, expect } from "vitest";
import type { ProjectData } from "../core/types";
import {
  AUTOSAVE_KEY,
  clearProject,
  isProjectData,
  loadProject,
  projectFileName,
  saveProject,
  type KeyValueStore,
} from "./persist";

/** A localStorage-shaped stub (the test env is `node`, no real storage). */
function fakeStore(): KeyValueStore & { map: Map<string, string> } {
  const map = new Map<string, string>();
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k)! : null),
    setItem: (k, v) => void map.set(k, v),
    removeItem: (k) => void map.delete(k),
  };
}

const sample: ProjectData = {
  format: "voxelos-character",
  version: 1,
  name: "Brooks Guy",
  gridSize: { x: 64, y: 64, z: 64 },
  voxels: [
    { x: 1, y: 2, z: 0, c: 11 },
    { x: 2, y: 2, z: 0, c: 3 },
  ],
};

describe("persist", () => {
  it("round-trips a project through save/load", () => {
    const store = fakeStore();
    expect(saveProject(sample, store)).toBe(true);
    expect(loadProject(store)).toEqual(sample);
  });

  it("returns null when nothing is saved", () => {
    expect(loadProject(fakeStore())).toBeNull();
  });

  it("returns null (does not throw) on corrupt JSON", () => {
    const store = fakeStore();
    store.map.set(AUTOSAVE_KEY, "{not valid json");
    expect(loadProject(store)).toBeNull();
  });

  it("rejects data with the wrong format or version", () => {
    const store = fakeStore();
    store.map.set(AUTOSAVE_KEY, JSON.stringify({ ...sample, format: "nope" }));
    expect(loadProject(store)).toBeNull();
    store.map.set(AUTOSAVE_KEY, JSON.stringify({ ...sample, version: 2 }));
    expect(loadProject(store)).toBeNull();
  });

  it("rejects data with malformed voxels", () => {
    const store = fakeStore();
    const bad = { ...sample, voxels: [{ x: 1, y: 2, z: 0 }] }; // missing color
    store.map.set(AUTOSAVE_KEY, JSON.stringify(bad));
    expect(loadProject(store)).toBeNull();
  });

  it("clears a saved project", () => {
    const store = fakeStore();
    saveProject(sample, store);
    clearProject(store);
    expect(loadProject(store)).toBeNull();
  });

  it("degrades gracefully when storage is unavailable", () => {
    expect(saveProject(sample, null)).toBe(false);
    expect(loadProject(null)).toBeNull();
    expect(() => clearProject(null)).not.toThrow();
  });

  it("survives a storage that throws (quota / private mode)", () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(saveProject(sample, throwing)).toBe(false);
    expect(loadProject(throwing)).toBeNull();
    expect(() => clearProject(throwing)).not.toThrow();
  });

  describe("isProjectData", () => {
    it("accepts a valid project", () => {
      expect(isProjectData(sample)).toBe(true);
    });
    it("accepts a valid empty project", () => {
      expect(isProjectData({ ...sample, voxels: [] })).toBe(true);
    });
    it("rejects non-objects", () => {
      expect(isProjectData(null)).toBe(false);
      expect(isProjectData("x")).toBe(false);
      expect(isProjectData(42)).toBe(false);
    });
  });

  describe("projectFileName", () => {
    it("slugifies a name", () => {
      expect(projectFileName("Brooks Guy")).toBe("brooks-guy.voxel.json");
    });
    it("strips unsafe characters", () => {
      expect(projectFileName("Sir/Robot #1!")).toBe("sirrobot-1.voxel.json");
    });
    it("falls back for a blank name", () => {
      expect(projectFileName("   ")).toBe("character.voxel.json");
    });
  });
});
