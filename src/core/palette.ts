import type { ColorId, PaletteEntry } from "./types";

/**
 * The fixed 24-color palette (PRD §5). Perler-inspired solid colors; hex values
 * pulled from the real Perler solids. Order is meaningful — it's the hotbar
 * layout (3 rows of 8: neutrals+skin, warms+greens, cools+pinks). `id` is the
 * 0-based index used everywhere as a voxel's color reference.
 */
export const PALETTE: readonly PaletteEntry[] = Object.freeze([
  // Row 1 — neutrals & skin/wood
  { id: 0, name: "White", hex: "#F1F1F1", perler: "P01" },
  { id: 1, name: "Grey", hex: "#8A8D91", perler: "P17" },
  { id: 2, name: "Dark Grey", hex: "#4D5156", perler: "P92" },
  { id: 3, name: "Black", hex: "#2E2F32", perler: "P18" },
  { id: 4, name: "Peach", hex: "#EEBAB2", perler: "P33" },
  { id: 5, name: "Tan", hex: "#BC9371", perler: "P35" },
  { id: 6, name: "Light Brown", hex: "#815D34", perler: "P21" },
  { id: 7, name: "Brown", hex: "#513931", perler: "P12" },
  // Row 2 — warms & greens
  { id: 8, name: "Rust", hex: "#8C372C", perler: "P20" },
  { id: 9, name: "Red", hex: "#F01820", perler: "P05" },
  { id: 10, name: "Hot Coral", hex: "#FF3851", perler: "P59" },
  { id: 11, name: "Orange", hex: "#ED6120", perler: "P04" },
  { id: 12, name: "Cheddar", hex: "#F1AA0C", perler: "P57" },
  { id: 13, name: "Yellow", hex: "#ECD800", perler: "P03" },
  { id: 14, name: "Kiwi Lime", hex: "#6CBE13", perler: "P61" },
  { id: 15, name: "Dark Green", hex: "#1C753E", perler: "P10" },
  // Row 3 — cools & pinks
  { id: 16, name: "Toothpaste", hex: "#93C8D4", perler: "P58" },
  { id: 17, name: "Turquoise", hex: "#2B89C6", perler: "P62" },
  { id: 18, name: "Light Blue", hex: "#3370C0", perler: "P09" },
  { id: 19, name: "Dark Blue", hex: "#2B3F87", perler: "P08" },
  { id: 20, name: "Purple", hex: "#604089", perler: "P07" },
  { id: 21, name: "Magenta", hex: "#F22A7B", perler: "P38" },
  { id: 22, name: "Pink", hex: "#E44892", perler: "P83" },
  { id: 23, name: "Bubblegum", hex: "#DD669B", perler: "P06" },
]);

/** Number of colors in the palette. */
export const PALETTE_SIZE = PALETTE.length;

/** Hex for a color id, falling back to the first color if out of range. */
export function colorHex(id: ColorId): string {
  return (PALETTE[id] ?? PALETTE[0]).hex;
}

/** True if `id` is a valid palette index. */
export function isValidColorId(id: number): boolean {
  return Number.isInteger(id) && id >= 0 && id < PALETTE.length;
}
