import { describe, it, expect } from "vitest";
import { DEFAULT_GRID_SIZE } from "./coords";
import { PALETTE_SIZE } from "./palette";
import { isInsideGrid } from "./coords";
import {
  SYSTEM_CHARACTERS,
  blendSystemCharacters,
  type SystemCharacter,
} from "./systemCharacters";

describe("SYSTEM_CHARACTERS", () => {
  it("is a dozen sculptures plus Manhattan and Claude, all well-formed", () => {
    expect(SYSTEM_CHARACTERS).toHaveLength(14);
    const ids = new Set(SYSTEM_CHARACTERS.map((s) => s.id));
    expect(ids.size).toBe(14); // unique
    for (const s of SYSTEM_CHARACTERS) {
      expect(s.id.startsWith("system-")).toBe(true);
      expect(s.name.trim().length).toBeGreaterThan(0);
      expect(s.data.format).toBe("voxelos-character");
      expect(s.data.voxels.length).toBeGreaterThan(0);
    }
  });

  it("keeps every voxel inside the grid with a valid color", () => {
    for (const s of SYSTEM_CHARACTERS) {
      for (const v of s.data.voxels) {
        expect(isInsideGrid(v.x, v.y, v.z, DEFAULT_GRID_SIZE)).toBe(true);
        expect(v.c).toBeGreaterThanOrEqual(0);
        expect(v.c).toBeLessThan(PALETTE_SIZE);
      }
    }
  });

  it("is generated deterministically (stable across builds)", () => {
    // Ids and voxel counts shouldn't drift between module evaluations.
    const counts = SYSTEM_CHARACTERS.map((s) => s.data.voxels.length);
    expect(counts.every((n) => n > 0)).toBe(true);
    expect(SYSTEM_CHARACTERS.map((s) => s.id)).toEqual([
      "system-manhattan",
      "system-true-heart",
      "system-paradise-island",
      "system-cheeky-monkey",
      "system-big-brain",
      "system-one-red-rose",
      "system-inky-the-octopus",
      "system-cherry-twins",
      "system-big-pikachu",
      "system-toadstool",
      "system-blast-off",
      "system-gold-star",
      "system-ribbit",
      "system-claude",
    ]);
  });
});

describe("blendSystemCharacters", () => {
  const mk = (id: string): SystemCharacter => ({
    id,
    name: id,
    data: { format: "voxelos-character", version: 1, name: id, gridSize: DEFAULT_GRID_SIZE, voxels: [] },
    updatedAt: 0,
  });

  it("keeps everything and preserves each list's order", () => {
    const real = [mk("r0"), mk("r1"), mk("r2"), mk("r3")];
    const system = [mk("s0"), mk("s1")];
    const out = blendSystemCharacters(real, system);
    expect(out).toHaveLength(6);
    expect(out.filter((x) => x.id.startsWith("r")).map((x) => x.id)).toEqual([
      "r0", "r1", "r2", "r3",
    ]);
    expect(out.filter((x) => x.id.startsWith("s")).map((x) => x.id)).toEqual([
      "s0", "s1",
    ]);
  });

  it("leads with real work and sprinkles system items (never clumps at top)", () => {
    const real = Array.from({ length: 8 }, (_, i) => mk(`r${i}`));
    const system = Array.from({ length: 4 }, (_, i) => mk(`s${i}`));
    const out = blendSystemCharacters(real, system).map((x) => x.id[0]);
    expect(out[0]).toBe("r"); // freshest user work stays on top
    // System items are spread out, not consecutive at the front.
    expect(out.slice(0, 3).filter((c) => c === "s").length).toBeLessThanOrEqual(1);
  });

  it("returns just the system characters when there are no real ones", () => {
    const system = [mk("s0"), mk("s1"), mk("s2")];
    expect(blendSystemCharacters([], system).map((x) => x.id)).toEqual([
      "s0", "s1", "s2",
    ]);
  });

  it("returns just the real characters when there is no system art", () => {
    const real = [mk("r0"), mk("r1")];
    expect(blendSystemCharacters(real, []).map((x) => x.id)).toEqual(["r0", "r1"]);
  });
});
