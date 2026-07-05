import type { ProjectData } from "./types";
import {
  box,
  capsule,
  domeY,
  ellipsoid,
  finalize,
  model,
  set,
  sphere,
  taperY,
} from "./voxelArt";

/**
 * Built-in "system" characters — a dozen little voxel sculptures the app itself
 * contributes to the public "All Characters" gallery, sprinkled among real
 * makers' work to seed the feed and spark ideas. They aren't stored in the DB or
 * owned by any user; the `/api/characters/all` route blends them into the feed
 * at read time (see `blendSystemCharacters`). Each is generated procedurally from
 * the pure toolkit in voxelArt.ts, so tweaking one is just editing its sculpt.
 *
 * Coordinates use the app's conventions: X right, Y up (feet low), Z back — so
 * facial features and other "front" details are placed at negative Z, nearest
 * the camera.
 */

/** Palette ids by name, for legible sculpting (see core/palette.ts). */
const C = {
  white: 0, grey: 1, dgrey: 2, black: 3,
  peach: 4, tan: 5, lbrown: 6, brown: 7,
  rust: 8, red: 9, coral: 10, orange: 11,
  cheddar: 12, yellow: 13, kiwi: 14, dgreen: 15,
  tooth: 16, turq: 17, lblue: 18, dblue: 19,
  purple: 20, magenta: 21, pink: 22, bubble: 23,
} as const;

// ❤️ — a puffy 3D heart: two top lobes, a tapering point, a little shine.
function heart(): ProjectData {
  const m = model();
  taperY(m, 0, 0, 3, 19, 1, 1, 7, 5, C.red); // body: narrow point → wide top
  ellipsoid(m, -5, 19, 0, 5.5, 5.5, 5, C.red); // left lobe
  ellipsoid(m, 5, 19, 0, 5.5, 5.5, 5, C.red); // right lobe
  ellipsoid(m, -6, 23, -4.5, 2, 1.6, 1.4, C.coral); // shine
  return finalize("❤️ True Heart", m);
}

// 🏝️ — a tiny desert island: water disc, sand mound, a leaning palm.
function island(): ProjectData {
  const m = model();
  taperY(m, 0, 0, 0, 1, 11, 11, 10.5, 10.5, C.tooth); // water
  ellipsoid(m, 0, 2, 0, 8, 3, 8, C.tan); // sand
  ellipsoid(m, -4, 3, 3, 2.5, 1, 2.5, C.cheddar); // sandy highlight
  capsule(m, 1, 3, 0, 4, 15, -1, 1.5, C.lbrown, 1); // trunk (leaning)
  const crown: [number, number, number] = [4, 16, -1];
  const fronds: [number, number, number][] = [
    [-7, 13, -1], [11, 14, 0], [3, 14, -8], [6, 13, 7], [-2, 14, 7], [9, 13, -6],
  ];
  for (const [fx, fy, fz] of fronds) {
    capsule(m, crown[0], crown[1], crown[2], fx, fy, fz, 1.5, C.dgreen, 0.5);
  }
  capsule(m, crown[0], crown[1], crown[2], 6, 15, 3, 1, C.kiwi, 0.4); // bright frond
  sphere(m, 3, 15, -2, 1.2, C.brown); // coconuts
  sphere(m, 5, 15, 0, 1.2, C.brown);
  return finalize("🏝️ Paradise Island", m);
}

// 🐵 — a cheeky little monkey: head, muzzle, ears, body, arms, curling tail.
function monkey(): ProjectData {
  const m = model();
  ellipsoid(m, 0, 8, 0, 5, 6, 4.5, C.lbrown); // body
  ellipsoid(m, 0, 7, -3, 3.2, 4, 2, C.peach); // belly
  ellipsoid(m, 0, 18, 0, 6, 5.5, 5.5, C.lbrown); // head
  sphere(m, -7, 18, 0, 3, C.lbrown); // ears
  sphere(m, 7, 18, 0, 3, C.lbrown);
  sphere(m, -7, 18, -1.5, 1.8, C.peach);
  sphere(m, 7, 18, -1.5, 1.8, C.peach);
  ellipsoid(m, 0, 16.5, -4, 4.2, 3.4, 1.8, C.peach); // muzzle
  ellipsoid(m, 0, 20, -4.5, 3.4, 2.2, 1.2, C.peach); // brow patch
  sphere(m, -2.3, 19, -5.4, 1.2, C.black); // eyes
  sphere(m, 2.3, 19, -5.4, 1.2, C.black);
  set(m, -1, 16, -5.8, C.brown); // nostrils
  set(m, 1, 16, -5.8, C.brown);
  capsule(m, -5, 12, -1, -6.5, 5, -2, 1.6, C.lbrown); // arms
  capsule(m, 5, 12, -1, 6.5, 5, -2, 1.6, C.lbrown);
  capsule(m, -2.5, 3, -1, -3, 0.5, -2, 1.9, C.lbrown); // legs
  capsule(m, 2.5, 3, -1, 3, 0.5, -2, 1.9, C.lbrown);
  capsule(m, 4.5, 6, 3, 9, 13, 4, 1.2, C.lbrown, 0.8); // tail
  return finalize("🐵 Cheeky Monkey", m);
}

// 🧠 — a knobbly pink brain: two hemispheres, a fissure, a brainstem.
function brain(): ProjectData {
  const m = model();
  const centers: [number, number, number][] = [
    [-3.5, 16, 0],
    [3.5, 16, 0],
  ];
  for (const [hx, hy, hz] of centers) {
    ellipsoid(m, hx, hy, hz, 5.3, 6, 7, C.pink);
  }
  // Gyri: little bumps stippled over each hemisphere (skipping the midline so the
  // central fissure survives). Deterministic angles — no randomness.
  for (const [hx, hy, hz] of centers) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      for (let b = -1; b <= 1; b++) {
        const phi = b * 0.7;
        const bx = hx + Math.cos(phi) * Math.cos(a) * 5.3;
        const by = hy + Math.sin(phi) * 5.5;
        const bz = hz + Math.cos(phi) * Math.sin(a) * 6.8 - 0.5;
        if (Math.abs(bx) < 2) continue; // keep the midline groove clear
        const col = (a * 4 + b) % 2 === 0 ? C.bubble : C.magenta;
        sphere(m, bx, by, bz, 1.7, col);
      }
    }
  }
  capsule(m, 0, 6, 2, 0, 12, 2, 1.6, C.bubble); // brainstem
  return finalize("🧠 Big Brain", m);
}

// 🌹 — a red rose: layered petals on a leafy green stem.
function rose(): ProjectData {
  const m = model();
  capsule(m, 0, 0, 1, 0, 20, 0, 1, C.dgreen); // stem
  ellipsoid(m, -4, 8, 1, 3, 1.2, 2, C.dgreen); // leaves
  ellipsoid(m, 4, 12, 1, 3, 1.2, 2, C.kiwi);
  ellipsoid(m, 0, 20, 0, 3, 2.5, 3, C.dgreen); // calyx
  sphere(m, 0, 24, 0, 3, C.red); // bud
  const ring1 = 6;
  for (let i = 0; i < ring1; i++) {
    const a = (i / ring1) * Math.PI * 2;
    ellipsoid(m, Math.cos(a) * 4, 23.5, Math.sin(a) * 4, 2.4, 3, 2.4, i % 2 ? C.red : C.coral);
  }
  const ring2 = 8;
  for (let i = 0; i < ring2; i++) {
    const a = (i / ring2) * Math.PI * 2 + 0.35;
    ellipsoid(m, Math.cos(a) * 6, 22.5, Math.sin(a) * 6, 2.6, 2.3, 2.6, i % 2 ? C.red : C.coral);
  }
  return finalize("🌹 One Red Rose", m);
}

// 🐙 — a bulbous octopus with big eyes and eight curling tentacles.
function octopus(): ProjectData {
  const m = model();
  ellipsoid(m, 0, 18, 0, 6.5, 7.5, 6.5, C.purple); // mantle
  ellipsoid(m, 0, 24, -1, 3, 2, 3, C.magenta); // top sheen
  sphere(m, -3, 19, -6, 2.2, C.white); // eyes
  sphere(m, 3, 19, -6, 2.2, C.white);
  sphere(m, -3, 18.5, -7, 1.1, C.black);
  sphere(m, 3, 18.5, -7, 1.1, C.black);
  const legs = 8;
  for (let i = 0; i < legs; i++) {
    const a = (i / legs) * Math.PI * 2;
    const bx = Math.cos(a) * 4, bz = Math.sin(a) * 4;
    const mx = Math.cos(a) * 8, mz = Math.sin(a) * 8;
    const tx = Math.cos(a) * 10, tz = Math.sin(a) * 10;
    capsule(m, bx, 12, bz, mx, 5, mz, 2, C.purple, 1.2);
    capsule(m, mx, 5, mz, tx, 1, tz, 1.2, C.purple, 0.5);
    sphere(m, (bx + mx) / 2, 8, (bz + mz) / 2, 0.7, C.pink); // suckers
  }
  return finalize("🐙 Inky the Octopus", m);
}

// 🍒 — two cherries joined at the stem, with a leaf.
function cherries(): ProjectData {
  const m = model();
  sphere(m, -4, 5, 0, 4, C.red);
  sphere(m, 4, 4, 1, 4, C.red);
  sphere(m, -5.5, 7, -2.5, 1.1, C.coral); // shine
  sphere(m, 2.5, 6, -1.5, 1.1, C.coral);
  const jx = 1, jy = 20, jz = 0; // stem junction
  capsule(m, -4, 8.5, 0, jx, jy, jz, 0.8, C.lbrown);
  capsule(m, 4, 7.5, 1, jx, jy, jz, 0.8, C.lbrown);
  ellipsoid(m, 4, 20, 0, 3.5, 1.2, 2.2, C.dgreen); // leaf
  return finalize("🍒 Cherry Twins", m);
}

// ⚡ — a big Pikachu: chubby body, long black-tipped ears, red cheeks, bolt tail.
function pikachu(): ProjectData {
  const m = model();
  ellipsoid(m, 0, 10, 0, 7, 8, 6, C.yellow); // body
  ellipsoid(m, 0, 22, 0, 8.5, 7.5, 7.5, C.yellow); // head
  capsule(m, -5, 28, 0, -9, 39, -1, 2.6, C.yellow, 1.6); // ears
  capsule(m, 5, 28, 0, 9, 39, -1, 2.6, C.yellow, 1.6);
  capsule(m, -8, 35, -0.8, -9, 39, -1, 2, C.black, 1.3); // black ear tips
  capsule(m, 8, 35, -0.8, 9, 39, -1, 2, C.black, 1.3);
  sphere(m, -4, 24, -7, 2.2, C.black); // eyes
  sphere(m, 4, 24, -7, 2.2, C.black);
  sphere(m, -4.6, 25, -8, 0.8, C.white);
  sphere(m, 3.4, 25, -8, 0.8, C.white);
  ellipsoid(m, -6.5, 20, -5.5, 2.6, 2.6, 1.5, C.red); // cheeks
  ellipsoid(m, 6.5, 20, -5.5, 2.6, 2.6, 1.5, C.red);
  set(m, 0, 22, -8, C.black); // nose
  capsule(m, -1.6, 20.4, -7.6, 0, 20, -7.8, 0.5, C.black); // mouth
  capsule(m, 1.6, 20.4, -7.6, 0, 20, -7.8, 0.5, C.black);
  box(m, -3, 13, 5, 3, 14, 6, C.brown); // back stripes
  box(m, -3, 16, 5, 3, 17, 6, C.brown);
  capsule(m, -6, 10, -2, -8, 6, -3, 1.8, C.yellow); // arms
  capsule(m, 6, 10, -2, 8, 6, -3, 1.8, C.yellow);
  ellipsoid(m, -3.5, 2, -2, 2.5, 2, 3.5, C.yellow); // feet
  ellipsoid(m, 3.5, 2, -2, 2.5, 2, 3.5, C.yellow);
  // Lightning-bolt tail: a flat jagged slab off the back (Z≈5–7), rising right.
  box(m, 5, 5, 5, 9, 8, 7, C.brown); // brown base
  box(m, 8, 7, 5, 14, 11, 7, C.yellow);
  box(m, 8, 10, 5, 11, 16, 7, C.yellow);
  box(m, 8, 15, 5, 16, 19, 7, C.yellow);
  box(m, 13, 18, 5, 16, 25, 7, C.yellow);
  return finalize("⚡ Big Pikachu", m);
}

// 🍄 — a classic red toadstool with white spots and a plump stem.
function mushroom(): ProjectData {
  const m = model();
  taperY(m, 0, 0, 2, 13, 4, 4, 3.2, 3.2, C.white); // stem
  ellipsoid(m, 0, 3, 0, 4.4, 2.5, 4.4, C.white); // rounded base
  domeY(m, 0, 12, 0, 9, 7, 9, C.red); // cap
  const spots: [number, number, number][] = [
    [0, 20, -6], [-5, 17, -4], [5, 17, -4], [-3, 15, -7], [4, 15, -6], [0, 16, -8],
  ];
  for (const [sx, sy, sz] of spots) ellipsoid(m, sx, sy, sz, 1.8, 1.1, 1.8, C.white);
  return finalize("🍄 Toadstool", m);
}

// 🚀 — a rocket: white body, red nose and fins, a window, a flame plume.
function rocket(): ProjectData {
  const m = model();
  taperY(m, 0, 0, 6, 26, 3.5, 3.5, 3.2, 3.2, C.white); // body
  taperY(m, 0, 0, 26, 33, 3.2, 3.2, 0.4, 0.4, C.red); // nose cone
  sphere(m, 0, 22, -3, 2.2, C.turq); // window
  sphere(m, 0, 22, -3.4, 1.3, C.tooth);
  // Three triangular fins flaring at the base (right, left, back).
  const fin = (dirX: number, dirZ: number) => {
    for (let h = 0; h <= 7; h++) {
      const reach = Math.round(6 * (1 - h / 7));
      for (let r = 3; r <= 3 + reach; r++) {
        if (dirZ === 0) box(m, dirX * r, 4 + h, -1, dirX * r, 4 + h, 1, C.red);
        else box(m, -1, 4 + h, dirZ * r, 1, 4 + h, dirZ * r, C.red);
      }
    }
  };
  fin(1, 0);
  fin(-1, 0);
  fin(0, 1);
  taperY(m, 0, 0, 0, 6, 0.6, 0.6, 3.2, 3.2, C.orange); // flame
  taperY(m, 0, 0, 1, 5, 0.4, 0.4, 1.9, 1.9, C.yellow);
  return finalize("🚀 Blast Off", m);
}

// ⭐ — a plump five-pointed gold star.
function star(): ProjectData {
  const m = model();
  const cx = 0, cy = 12, cz = 0;
  ellipsoid(m, cx, cy, cz, 3.5, 3.5, 2.6, C.cheddar);
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5; // first point straight up
    capsule(m, cx, cy, cz, cx + Math.cos(a) * 9, cy + Math.sin(a) * 9, cz, 3, C.cheddar, 0.4);
  }
  ellipsoid(m, cx, cy, cz - 1.5, 2, 2, 1.2, C.yellow); // core sheen
  return finalize("⭐ Gold Star", m);
}

// 🐸 — a smiling frog with big bulging eyes and webbed feet.
function frog(): ProjectData {
  const m = model();
  ellipsoid(m, 0, 6, 0, 7, 5, 6, C.kiwi); // body
  ellipsoid(m, 0, 4, -3, 4.5, 3, 2.5, C.white); // belly
  sphere(m, -4, 12, -1, 3, C.kiwi); // eye mounds
  sphere(m, 4, 12, -1, 3, C.kiwi);
  sphere(m, -4, 13, -2.5, 1.8, C.white);
  sphere(m, 4, 13, -2.5, 1.8, C.white);
  sphere(m, -4, 13, -3.4, 0.9, C.black);
  sphere(m, 4, 13, -3.4, 0.9, C.black);
  capsule(m, -5, 4, -5.5, 5, 4, -5.5, 0.8, C.dgreen); // smile
  set(m, -5, 5, -5, C.dgreen); // upturned corners
  set(m, 5, 5, -5, C.dgreen);
  ellipsoid(m, -5, 1, -4, 3, 1.3, 3, C.kiwi); // front feet
  ellipsoid(m, 5, 1, -4, 3, 1.3, 3, C.kiwi);
  for (const s of [-1, 1]) {
    for (const t of [-1.6, 0, 1.6]) set(m, s * 5 + t, 1, -6, C.dgreen); // toes
  }
  return finalize("🐸 Ribbit", m);
}

export type SystemCharacter = {
  id: string;
  name: string;
  data: ProjectData;
  updatedAt: number;
};

/** Fixed base time so the built-ins have stable, non-"now" timestamps. */
const SYSTEM_EPOCH = 1_767_225_600_000; // 2026-01-01T00:00:00Z

const BUILDERS: (() => ProjectData)[] = [
  heart, island, monkey, brain, rose, octopus,
  cherries, pikachu, mushroom, rocket, star, frog,
];

/**
 * The dozen built-in characters, generated once at module load. Ids are stable
 * (`system-<slug>`) so they never collide with real UUID-keyed rows.
 */
export const SYSTEM_CHARACTERS: SystemCharacter[] = BUILDERS.map((build, i) => {
  const data = build();
  const slug = data.name.replace(/[^a-z]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return {
    id: `system-${slug || i}`,
    name: data.name,
    data,
    updatedAt: SYSTEM_EPOCH + i,
  };
});

type FeedItem = { id: string; name: string; data: ProjectData; updatedAt: number };

/**
 * Sprinkle the system characters evenly through the real feed rather than
 * clumping them at the top. Both lists keep their own order; system items are
 * spaced proportionally, and real items win ties so the freshest user work still
 * leads. With no real characters yet, the feed is just the built-ins.
 */
export function blendSystemCharacters<T extends FeedItem>(real: T[], system: T[]): T[] {
  const out: T[] = [];
  let ri = 0, si = 0;
  const R = real.length, S = system.length;
  while (ri < R || si < S) {
    const rFrac = R === 0 ? 1 : ri / R;
    const sFrac = S === 0 ? 1 : si / S;
    if (si < S && (ri >= R || sFrac < rFrac)) out.push(system[si++]);
    else out.push(real[ri++]);
  }
  return out;
}
