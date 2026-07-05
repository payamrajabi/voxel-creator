/**
 * Pure reconciliation for local-first sync. Given what a device has locally and
 * what the server returned, decide which local records to upload (`toPush`) and
 * which server records to store locally (`toApply`). Last-write-wins by
 * `updatedAt`; a `deleted` record is a tombstone. Local and server records are
 * different shapes (local carries a thumbnail, server carries none), so the two
 * sides are generic — `toPush` are local objects, `toApply` are server objects.
 *
 * THE INVARIANT THAT MATTERS MOST (see sync.test.ts): a local record with no
 * strictly-newer server counterpart is never touched — it goes into `toPush` and
 * stays on the device. On a first sync against an empty account, every local
 * character uploads and nothing is removed. The only thing that removes a local
 * record is a newer server tombstone, and a fresh account has none.
 */

export type SyncMeta = { id: string; updatedAt: number; deleted?: boolean };

export type Reconciliation<L, R> = {
  /** Local records to upload (new here, or edited more recently than the server). */
  toPush: L[];
  /** Server records to store locally (new, or edited more recently than here). */
  toApply: R[];
};

export function reconcile<L extends SyncMeta, R extends SyncMeta>(
  local: readonly L[],
  remote: readonly R[],
): Reconciliation<L, R> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()]);

  const toPush: L[] = [];
  const toApply: R[] = [];
  for (const id of ids) {
    const l = localById.get(id);
    const r = remoteById.get(id);
    if (l && !r) {
      toPush.push(l); // local-only → keep it (never wipe) and upload
    } else if (r && !l) {
      toApply.push(r); // server-only → adopt (may itself be a tombstone)
    } else if (l && r) {
      if (l.updatedAt > r.updatedAt) toPush.push(l); // edited more recently here
      else if (r.updatedAt > l.updatedAt) toApply.push(r); // edited more recently on server
      // equal updatedAt → already in sync, nothing to do
    }
  }
  return { toPush, toApply };
}
