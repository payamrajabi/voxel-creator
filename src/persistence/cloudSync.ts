import { getAllRecords, putProject, type ProjectRecord } from "./db";
import { frontThumbnail } from "./thumbnail";
import { reconcile } from "./sync";
import { pullCharacters, pushCharacters, type WireRecord } from "./api";

/**
 * Two-way sync between the device's IndexedDB and the signed-in user's cloud
 * store. Local-first: local edits are the instant source of truth; this mirrors
 * them up and pulls others' changes down, last-write-wins. Server records carry
 * no thumbnail, so applied ones get one regenerated from their voxel data.
 *
 * Never removes local data except when a newer server tombstone says to — so the
 * first sync of a device (e.g. Brooks's existing characters) uploads everything
 * and loses nothing. See `reconcile` for the guarantee.
 */

let running = false;
let pending = false;
let onApplied: (() => void) | null = null;

/** Register a callback fired after sync writes changes into local storage. */
export function onSyncApplied(cb: () => void): void {
  onApplied = cb;
}

function toWire(r: ProjectRecord): WireRecord {
  return {
    id: r.id,
    name: r.name,
    data: r.data,
    updatedAt: r.updatedAt,
    createdAt: r.createdAt,
    deleted: r.deleted ?? false,
  };
}

/** Run a full sync now. Coalesces if one is already in flight. Safe to call often. */
export async function syncNow(): Promise<void> {
  if (running) {
    pending = true;
    return;
  }
  running = true;
  try {
    do {
      pending = false;

      let remote: WireRecord[];
      try {
        remote = await pullCharacters();
      } catch {
        return; // offline or not signed in — a later trigger will retry
      }

      const local = await getAllRecords();
      const { toPush, toApply } = reconcile(local, remote);

      let applied = false;
      for (const r of toApply) {
        const existing = local.find((l) => l.id === r.id);
        await putProject({
          id: r.id,
          name: r.name,
          data: r.data,
          updatedAt: r.updatedAt,
          createdAt: existing?.createdAt ?? r.createdAt ?? r.updatedAt,
          deleted: r.deleted ?? false,
          thumbnail: r.deleted ? "" : frontThumbnail(r.data),
        });
        applied = true;
      }

      if (toPush.length > 0) {
        try {
          await pushCharacters(toPush.map(toWire));
        } catch {
          // couldn't upload right now; local is untouched, retry on next trigger
        }
      }

      if (applied) onApplied?.();
    } while (pending);
  } finally {
    running = false;
  }
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Debounced sync — coalesces a burst of edits into one round-trip. */
export function scheduleSync(delay = 1500): void {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void syncNow(), delay);
}
