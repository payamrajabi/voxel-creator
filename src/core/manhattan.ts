import type { ProjectData } from "./types";
import { box, finalize, model, set, type VoxelModel } from "./voxelArt";

/**
 * "Manhattan" — the showpiece system character: a whole voxel city built to the
 * hard edges of the format. It fills the full 64×64×64 editable volume (X/Z the
 * island + rivers, Y the skyline) and `finalize` surface-shells it so the visible
 * result stays under the editor's 32,768-cube render budget — i.e. the largest,
 * most detailed build the app's own limits allow, still openable in the editor
 * and remixable.
 *
 * Everything is deterministic (a position hash, never Math.random) so the city
 * is identical on every build and the feed payload is stable. Layout, south → north
 * along +Z: Battery/Financial District (tall) → Tribeca/Village (low) → Midtown
 * (tall, Empire State + Chrysler) → Central Park (green) → Harlem (low). Rivers
 * wrap both shores; the Brooklyn Bridge crosses the East River downtown.
 */

const C = {
  white: 0, grey: 1, dgrey: 2, black: 3,
  peach: 4, tan: 5, lbrown: 6, brown: 7,
  rust: 8, red: 9, coral: 10, orange: 11,
  cheddar: 12, yellow: 13, kiwi: 14, dgreen: 15,
  tooth: 16, turq: 17, lblue: 18, dblue: 19,
  purple: 20, magenta: 21, pink: 22, bubble: 23,
} as const;

const SIZE = 64; // fills the whole 0..63 grid on every axis
const CX = 31; // island centerline (E–W)
const MAX_Y = 63;

/** Stable per-position hash in [0,1) — deterministic stand-in for randomness. */
function hash01(a: number, b: number, salt = 0): number {
  let h = Math.imul((a + 1) as number, 73856093) ^ Math.imul((b + 1) as number, 19349663) ^ Math.imul(salt + 1, 83492791);
  h = Math.imul(h ^ (h >>> 13), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 16), 0xc2b2ae35);
  return ((h ^ (h >>> 15)) >>> 0) / 4294967296;
}

/** Half-width of the island at north–south position z (tapers at both tips). */
function islandHalf(z: number): number {
  if (z < 2 || z > 61) return -1;
  if (z < 10) return 5 + (z - 2) * 1.7; // Battery tip widening north
  if (z > 55) return 21 - (z - 55) * 2.2; // Harlem taper
  // Gentle bulge on the east side mid-island (approx the real outline).
  return 20 + Math.sin((z - 10) / 45 * Math.PI) * 1.5;
}

function inIsland(x: number, z: number): boolean {
  const hw = islandHalf(z);
  return hw > 0 && Math.abs(x - CX) <= hw;
}

// Central Park: a green rectangle up in the middle-north, no towers.
const PARK = { x0: 24, x1: 39, z0: 43, z1: 57 };
function inPark(x: number, z: number): boolean {
  return x >= PARK.x0 && x <= PARK.x1 && z >= PARK.z0 && z <= PARK.z1;
}

/** Building height for a block, by neighborhood + a shorter waterfront falloff. */
function blockHeight(x: number, z: number, r: number): number {
  const edge = islandHalf(z) - Math.abs(x - CX); // 0 at the shore, larger inland
  const edgeF = Math.min(1, edge / 7);
  let base: number;
  if (z <= 15) base = 28 + r * 30; // Financial District — tall downtown peak
  else if (z >= 27 && z <= 41) base = 24 + r * 34; // Midtown — tallest peak
  else if (z >= 42) base = 6 + r * 8; // Upper/Harlem — low
  else base = 6 + r * 11; // Tribeca/Village — the low valley between the peaks
  return Math.max(4, Math.round(base * (0.45 + 0.55 * edgeF)));
}

const BUILDING_COLORS = [C.grey, C.grey, C.dgrey, C.tan, C.white, C.tooth, C.lbrown];

/** A raised, flat-topped column with a darker roof cap. */
function tower(m: VoxelModel, x: number, z: number, top: number, body: number, roof: number): void {
  box(m, x, 2, z, x, Math.min(MAX_Y, top), z, body);
  set(m, x, Math.min(MAX_Y, top), z, roof); // roof cap for definition
}

export function manhattan(): ProjectData {
  const m = model();
  const blocked = new Set<number>(); // cells owned by landmarks/bridge
  const bkey = (x: number, z: number) => x * SIZE + z;

  // --- Base plane: island ground vs. river water -------------------------
  for (let x = 0; x < SIZE; x++) {
    for (let z = 0; z < SIZE; z++) {
      if (inIsland(x, z)) {
        // Two-layer landmass so the island sits proud of the water.
        const sidewalk = (x + z) % 2 === 0 ? C.grey : C.dgrey;
        set(m, x, 0, z, C.tan);
        set(m, x, 1, z, inPark(x, z) ? (hash01(x, z, 7) > 0.5 ? C.dgreen : C.kiwi) : sidewalk);
      } else {
        // Rippled water, one layer at sea level.
        const w = hash01(x, z, 3);
        set(m, x, 0, z, w > 0.7 ? C.lblue : w > 0.3 ? C.dblue : C.turq);
      }
    }
  }

  // Central Park detail: a reservoir (pond) and a couple of tree clumps.
  box(m, 29, 2, 48, 34, 2, 52, C.turq); // reservoir
  for (const [tx, tz] of [[26, 45], [37, 45], [27, 55], [38, 55], [31, 44]] as const) {
    box(m, tx, 2, tz, tx, 3, tz, C.dgreen);
    set(m, tx, 4, tz, C.kiwi);
  }

  // --- Landmarks (stamped first; their footprints block generic towers) ---
  stampLandmarks(m, blocked, bkey);

  // --- Generic city: one building per block, streets as 1-voxel gaps ------
  const bxP = 6, bzP = 5; // block+street pitch
  const bW = 5, bD = 4; // building footprint inside each block
  for (let bx = 0; bx < SIZE; bx += bxP) {
    for (let bz = 0; bz < SIZE; bz += bzP) {
      const r = hash01(bx, bz, 11);
      const h = blockHeight(bx + bW / 2, bz + bD / 2, r);
      const body = BUILDING_COLORS[Math.floor(hash01(bx, bz, 5) * BUILDING_COLORS.length)];
      const roof = hash01(bx, bz, 9) > 0.5 ? C.dgrey : C.dblue;
      for (let x = bx; x < bx + bW && x < SIZE; x++) {
        for (let z = bz; z < bz + bD && z < SIZE; z++) {
          if (!inIsland(x, z) || inPark(x, z) || blocked.has(bkey(x, z))) continue;
          tower(m, x, z, 2 + h, body, roof);
        }
      }
      // Rooftop water tank — the quintessential NYC mid-rise detail — on the
      // block's interior corner, for shorter buildings only.
      const wx = bx + 1, wz = bz + 1, ry = 2 + h;
      if (h >= 6 && h <= 24 && hash01(bx, bz, 21) > 0.6 && inIsland(wx, wz) && !inPark(wx, wz) && !blocked.has(bkey(wx, wz))) {
        box(m, wx, ry + 1, wz, wx + 1, ry + 2, wz + 1, C.lbrown);
        set(m, wx, ry + 3, wz, C.brown);
        set(m, wx + 1, ry + 3, wz + 1, C.brown);
      }
    }
  }

  // --- Brooklyn Bridge across the East River (east shore, downtown) -------
  stampBridge(m);

  // A few finger piers along the Hudson (west shore) for waterfront texture.
  for (let z = 14; z <= 52; z += 6) {
    const hw = islandHalf(z);
    const shore = Math.round(CX - hw);
    box(m, shore - 3, 1, z, shore - 1, 1, z, C.lbrown);
  }

  return finalize("🗽 Manhattan", m);
}

/** Stamp the hero skyscrapers with recognizable silhouettes. */
function stampLandmarks(m: VoxelModel, blocked: Set<number>, bkey: (x: number, z: number) => number): void {
  const claim = (x0: number, z0: number, x1: number, z1: number) => {
    for (let x = x0; x <= x1; x++) for (let z = z0; z <= z1; z++) blocked.add(bkey(x, z));
  };

  // Empire State Building — setback tower + mast (Midtown).
  {
    const x = 30, z = 34;
    claim(x - 4, z - 4, x + 4, z + 4);
    box(m, x - 4, 2, z - 4, x + 4, 30, z + 4, C.tooth); // wide base
    box(m, x - 3, 2, z - 3, x + 3, 44, z + 3, C.white); // shaft
    box(m, x - 2, 2, z - 2, x + 2, 52, z + 2, C.tooth); // upper setback
    box(m, x - 1, 2, z - 1, x + 1, 58, z + 1, C.white); // observation
    box(m, x, 2, z, x, 63, z, C.grey); // antenna mast
  }

  // Chrysler Building — shaft with a stepped, spired crown (Midtown-east).
  {
    const x = 41, z = 30;
    claim(x - 3, z - 3, x + 3, z + 3);
    box(m, x - 3, 2, z - 3, x + 3, 40, z + 3, C.grey);
    box(m, x - 2, 41, z - 2, x + 2, 45, z + 2, C.cheddar); // crown steps
    box(m, x - 1, 46, z - 1, x + 1, 50, z + 1, C.cheddar);
    box(m, x, 51, z, x, 62, z, C.white); // spire
  }

  // One World Trade Center — tapered square + antenna (Financial District).
  {
    const x = 26, z = 7;
    claim(x - 4, z - 4, x + 4, z + 4);
    box(m, x - 4, 2, z - 4, x + 4, 20, z + 4, C.tooth);
    box(m, x - 3, 2, z - 3, x + 3, 40, z + 3, C.lblue);
    box(m, x - 2, 2, z - 2, x + 2, 56, z + 2, C.tooth);
    box(m, x, 2, z, x, 63, z, C.white); // spire
  }

  // A couple of anonymous supertalls to thicken the Midtown cluster.
  for (const [x, z, top] of [[36, 38, 55], [24, 31, 52], [34, 27, 58]] as const) {
    claim(x - 2, z - 2, x + 2, z + 2);
    box(m, x - 2, 2, z - 2, x + 2, top, z + 2, hash01(x, z, 1) > 0.5 ? C.white : C.grey);
    set(m, x, top + 1, z, C.grey);
  }
}

/** Two gothic towers + deck + suspension cables over the East River. */
function stampBridge(m: VoxelModel): void {
  const z = 9;
  const shore = Math.round(CX + islandHalf(z)); // island edge
  const deckX0 = shore - 1, deckX1 = SIZE - 1; // deck runs island → far shore
  // Deck
  for (let x = deckX0; x <= deckX1; x++) {
    set(m, x, 8, z, C.lbrown);
    set(m, x, 8, z + 1, C.lbrown);
  }
  // Two towers with twin arches
  for (const tx of [deckX0 + 4, deckX1 - 4]) {
    box(m, tx, 1, z, tx, 20, z, C.tan);
    box(m, tx, 1, z + 1, tx, 20, z + 1, C.tan);
    set(m, tx, 10, z, C.dblue); // arch gaps (windows to the sky)
    set(m, tx, 14, z, C.dblue);
  }
  // Cable swag between the two tower tops: high at the towers, sagging mid-span.
  const t0 = deckX0 + 4, t1 = deckX1 - 4, span = t1 - t0;
  for (let x = t0; x <= t1; x++) {
    const u = (x - t0) / span; // 0..1 across the span
    const sag = Math.round(20 - 11 * (1 - 2 * Math.abs(u - 0.5))); // 20 at towers → 9 mid
    set(m, x, sag, z, C.grey);
  }
}
