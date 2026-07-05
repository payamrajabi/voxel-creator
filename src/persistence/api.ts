import type { ProjectData } from "../core/types";

/**
 * Thin client for the sync API. Requests are same-origin, so the Clerk session
 * cookie rides along automatically — no token handling needed here.
 */

export type WireRecord = {
  id: string;
  name: string;
  data: ProjectData;
  updatedAt: number;
  createdAt?: number;
  deleted?: boolean;
};

/** All of the signed-in user's server records (including tombstones). */
export async function pullCharacters(): Promise<WireRecord[]> {
  const res = await fetch("/api/characters", { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`pull failed: ${res.status}`);
  const body = (await res.json()) as { characters?: WireRecord[] };
  return body.characters ?? [];
}

/** One character in the public "All Characters" feed (read-only, all makers). */
export type PublicRecord = {
  id: string;
  name: string;
  data: ProjectData;
  updatedAt: number;
};

/** Every maker's characters for the public gallery — not user-scoped. */
export async function pullAllCharacters(): Promise<PublicRecord[]> {
  const res = await fetch("/api/characters/all", {
    headers: { accept: "application/json" },
  });
  if (!res.ok) throw new Error(`pull all failed: ${res.status}`);
  const body = (await res.json()) as { characters?: PublicRecord[] };
  return body.characters ?? [];
}

/** Upload a batch of local records. */
export async function pushCharacters(records: WireRecord[]): Promise<void> {
  if (records.length === 0) return;
  const res = await fetch("/api/characters", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) throw new Error(`push failed: ${res.status}`);
}
