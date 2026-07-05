/**
 * Pure reconciliation for local-first sync. Given what a device already has
 * locally and what the server returned, decide the merged set to keep and which
 * records to upload. Last-write-wins by `updatedAt`; a `deleted` record is a
 * tombstone.
 *
 * THE INVARIANT THAT MATTERS MOST (see sync.test.ts): a local record with no
 * strictly-newer server counterpart is NEVER dropped. On a first sync against an
 * empty account, every local character is kept AND queued to upload — so
 * migrating an existing device (e.g. Brooks's characters already on the phone)
 * uploads them and loses nothing. The only thing that removes a local record is
 * an explicit, newer tombstone, and a brand-new account has none.
 */

export type SyncMeta = { id: string; updatedAt: number; deleted?: boolean };

export type Reconciliation<T> = {
  /** The reconciled set to keep locally (includes tombstones; the UI hides them). */
  merged: T[];
  /** Records this device should upload (new here, or newer than the server's copy). */
  toPush: T[];
};

export function reconcile<T extends SyncMeta>(
  local: readonly T[],
  remote: readonly T[],
): Reconciliation<T> {
  const localById = new Map(local.map((r) => [r.id, r]));
  const remoteById = new Map(remote.map((r) => [r.id, r]));
  const ids = new Set<string>([...localById.keys(), ...remoteById.keys()]);

  const merged: T[] = [];
  const toPush: T[] = [];
  for (const id of ids) {
    const l = localById.get(id);
    const r = remoteById.get(id);
    if (l && !r) {
      merged.push(l); // local-only → keep it (never wipe) and upload it
      toPush.push(l);
    } else if (r && !l) {
      merged.push(r); // server-only → adopt (may itself be a tombstone)
    } else if (l && r) {
      if (l.updatedAt > r.updatedAt) {
        merged.push(l); // local edited more recently → keep + upload
        toPush.push(l);
      } else {
        merged.push(r); // server newer or in-sync → take it (propagates remote deletes)
      }
    }
  }
  return { merged, toPush };
}
