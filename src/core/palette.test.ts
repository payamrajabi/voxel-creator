import { describe, it, expect } from "vitest";
import { PALETTE, PALETTE_SIZE, colorHex, isValidColorId } from "./palette";

describe("palette", () => {
  it("has exactly 24 entries", () => {
    expect(PALETTE_SIZE).toBe(24);
  });

  it("ids are 0..23 and match the array index", () => {
    PALETTE.forEach((e, i) => expect(e.id).toBe(i));
  });

  it("hex values are well-formed and unique", () => {
    const seen = new Set<string>();
    for (const e of PALETTE) {
      expect(e.hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      const k = e.hex.toUpperCase();
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });

  it("spot-checks known colors from the PRD table", () => {
    expect(PALETTE[0]).toMatchObject({ name: "White", hex: "#F1F1F1" });
    expect(PALETTE[11]).toMatchObject({ name: "Orange", hex: "#ED6120" });
    expect(PALETTE[23]).toMatchObject({ name: "Bubblegum", hex: "#DD669B" });
  });

  it("colorHex + isValidColorId handle range", () => {
    expect(colorHex(11)).toBe("#ED6120");
    expect(colorHex(999)).toBe(PALETTE[0].hex); // out-of-range fallback
    expect(isValidColorId(0)).toBe(true);
    expect(isValidColorId(23)).toBe(true);
    expect(isValidColorId(24)).toBe(false);
    expect(isValidColorId(-1)).toBe(false);
    expect(isValidColorId(1.5)).toBe(false);
  });
});
