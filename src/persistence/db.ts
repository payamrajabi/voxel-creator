import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { ProjectData } from "../core/types";

/**
 * One saved character on-device. `data` is the same `ProjectData` shape the
 * serializer (and, later, export) use — persistence stores exactly what we can
 * hand off. `thumbnail` is a small front-view PNG data URL for the gallery.
 */
export type ProjectRecord = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  data: ProjectData;
  thumbnail: string; // PNG data URL, or "" when the character is empty
  /** Tombstone: kept after delete so the delete syncs, then hidden from the gallery. */
  deleted?: boolean;
};

interface VoxelDBSchema extends DBSchema {
  projects: {
    key: string;
    value: ProjectRecord;
    indexes: { "by-updated": number };
  };
}

const DB_NAME = "voxelos";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VoxelDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<VoxelDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("projects", { keyPath: "id" });
        store.createIndex("by-updated", "updatedAt");
      },
    });
  }
  return dbPromise;
}

/** Saved characters for the gallery (tombstones hidden), most-recent first. */
export async function listProjects(): Promise<ProjectRecord[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("projects", "by-updated");
  return all.reverse().filter((r) => !r.deleted);
}

/** Every stored record, including tombstones — for sync, not the gallery. */
export async function getAllRecords(): Promise<ProjectRecord[]> {
  return (await getDB()).getAll("projects");
}

export async function getProject(
  id: string,
): Promise<ProjectRecord | undefined> {
  return (await getDB()).get("projects", id);
}

export async function putProject(record: ProjectRecord): Promise<void> {
  await (await getDB()).put("projects", record);
}

export async function deleteProject(id: string): Promise<void> {
  await (await getDB()).delete("projects", id);
}
