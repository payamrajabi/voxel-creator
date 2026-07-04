import type { ProjectData } from "../core/types";

/**
 * On-device persistence for the current character. The whole point: work must
 * survive closing, reloading, or being evicted by iOS — the store is in-memory
 * only, so without this a character disappears the moment the tab does.
 *
 * We store the compact `ProjectData` shape (the same thing export/import uses),
 * not the live store, so the on-disk format is stable and versioned.
 */
export const AUTOSAVE_KEY = "voxelos:autosave:v1";

/**
 * The slice of the Web Storage API we depend on. Declaring it lets tests inject
 * a fake (the test env is `node`, which has no `localStorage`).
 */
export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

/** Real localStorage when available; null under SSR, private mode, or tests. */
function defaultStore(): KeyValueStore | null {
  try {
    if (typeof localStorage !== "undefined") return localStorage;
  } catch {
    // Touching localStorage can throw outright (Safari private mode, blocked
    // cookies). Treat that as "no storage" rather than crashing the app.
  }
  return null;
}

function isVoxelLike(o: unknown): boolean {
  if (!o || typeof o !== "object") return false;
  const v = o as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number" &&
    typeof v.c === "number"
  );
}

/**
 * Structural guard so corrupt, truncated, or outdated saved data can never
 * crash a load — anything that doesn't match is treated as "no save".
 */
export function isProjectData(value: unknown): value is ProjectData {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  if (v.format !== "voxelos-character") return false;
  if (v.version !== 1) return false;
  if (typeof v.name !== "string") return false;
  const g = v.gridSize as Record<string, unknown> | undefined;
  if (
    !g ||
    typeof g.x !== "number" ||
    typeof g.y !== "number" ||
    typeof g.z !== "number"
  ) {
    return false;
  }
  return Array.isArray(v.voxels) && v.voxels.every(isVoxelLike);
}

/** Persist a character. Returns false (never throws) if storage is unavailable. */
export function saveProject(
  data: ProjectData,
  store: KeyValueStore | null = defaultStore(),
): boolean {
  if (!store) return false;
  try {
    store.setItem(AUTOSAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    // Quota exceeded or storage disabled — nothing to do but avoid crashing.
    return false;
  }
}

/** Load the saved character, or null if there is none / it's unreadable. */
export function loadProject(
  store: KeyValueStore | null = defaultStore(),
): ProjectData | null {
  if (!store) return null;
  let raw: string | null;
  try {
    raw = store.getItem(AUTOSAVE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return isProjectData(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/** Forget the saved character (used when starting fresh). */
export function clearProject(store: KeyValueStore | null = defaultStore()): void {
  if (!store) return;
  try {
    store.removeItem(AUTOSAVE_KEY);
  } catch {
    // ignore
  }
}

/** A filesystem-friendly filename for an exported character. */
export function projectFileName(name: string): string {
  const base =
    name
      .trim()
      .replace(/[^a-z0-9-_ ]/gi, "")
      .replace(/\s+/g, "-")
      .toLowerCase() || "character";
  return `${base}.voxel.json`;
}
