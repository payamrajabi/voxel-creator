import { create } from "zustand";
import { useVoxelStore } from "./voxelStore";
import { DEFAULT_GRID_SIZE } from "../core/coords";
import { frontThumbnail } from "../persistence/thumbnail";
import {
  getProject,
  listProjects,
  putProject,
  type ProjectRecord,
} from "../persistence/db";
import { onSyncApplied, scheduleSync, syncNow } from "../persistence/cloudSync";
import { pullAllCharacters } from "../persistence/api";
import type { ProjectData } from "../core/types";

export type View = "gallery" | "editor";

/** Which gallery you're looking at: your own characters, or everyone's. */
export type Scope = "mine" | "all";

/** A character in the public "All Characters" grid. `thumbnail` is rendered
 * on the client from `data` (server records carry none); `data` lets us open it
 * read-only in the 3D viewer. */
export type PublicCharacter = {
  id: string;
  name: string;
  data: ProjectData;
  thumbnail: string;
};

/**
 * App-level navigation + project lifecycle. Orchestrates the voxel store and
 * IndexedDB: which character is open, and moving between the gallery and the
 * editor. The voxel store stays the single source of truth for the *open*
 * character; this layer just loads/saves it and lists the rest.
 */
export type AppState = {
  ready: boolean;
  view: View;
  currentId: string | null;
  projects: ProjectRecord[];
  /** Read-only when viewing someone else's character from "All Characters". */
  readOnly: boolean;

  /** Which gallery is showing, and the fetched public list for "all". */
  scope: Scope;
  allProjects: PublicCharacter[];
  loadingAll: boolean;

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  newProject: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  openRemote: (item: PublicCharacter) => void;
  remixCurrent: () => Promise<void>;
  saveCurrent: () => Promise<void>;
  exitToGallery: () => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
  setScope: (scope: Scope) => void;
  loadAllProjects: () => Promise<void>;
};

export const useAppStore = create<AppState>()((set, get) => ({
  ready: false,
  view: "gallery",
  currentId: null,
  projects: [],
  readOnly: false,
  scope: "mine",
  allProjects: [],
  loadingAll: false,

  init: async () => {
    // Show local characters immediately (works offline), then sync in the
    // background: uploads any local-only characters to the account and pulls
    // down anything from other devices, last-write-wins.
    set({ projects: await listProjects(), ready: true });
    onSyncApplied(() => void get().refresh());
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => scheduleSync());
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden) scheduleSync();
      });
    }
    void syncNow().then(() => get().refresh());
  },

  refresh: async () => {
    set({ projects: await listProjects() });
  },

  newProject: async () => {
    const name = `Character ${get().projects.length + 1}`;
    const id = crypto.randomUUID();
    useVoxelStore.getState().loadProjectData({
      format: "voxelos-character",
      version: 1,
      name,
      gridSize: DEFAULT_GRID_SIZE,
      voxels: [],
    });
    const t = Date.now();
    await putProject({
      id,
      name,
      createdAt: t,
      updatedAt: t,
      data: useVoxelStore.getState().toProjectData(),
      thumbnail: "",
    });
    // A new character is always yours and editable, so land back in "mine".
    set({ currentId: id, view: "editor", readOnly: false, scope: "mine" });
    scheduleSync();
  },

  openProject: async (id) => {
    const rec = await getProject(id);
    if (!rec) return;
    useVoxelStore.getState().loadProjectData(rec.data);
    set({ currentId: id, view: "editor", readOnly: false });
  },

  openRemote: (item) => {
    // Open another maker's character to orbit, not to edit. `currentId: null`
    // keeps autosave and saveCurrent inert, so viewing never writes a copy into
    // your own characters.
    useVoxelStore.getState().loadProjectData(item.data);
    set({ currentId: null, view: "editor", readOnly: true });
  },

  remixCurrent: async () => {
    // "Remix": duplicate the character you're viewing (read-only, currentId
    // null) into your own library and drop into the editor on the copy. Its
    // geometry is already loaded in the voxel store, so we just re-name it,
    // persist a fresh owned record, and flip out of read-only. Autosave then
    // keeps the copy current; sync uploads it like any other of your characters.
    const source = useVoxelStore.getState().toProjectData();
    if (source.voxels.length === 0) return;
    const base = source.name.trim() || "Untitled";
    const name = `${base} (remix)`;
    const id = crypto.randomUUID();
    const t = Date.now();
    const data: ProjectData = { ...source, name };
    useVoxelStore.setState({ name });
    await putProject({
      id,
      name,
      createdAt: t,
      updatedAt: t,
      data,
      thumbnail: frontThumbnail(data),
    });
    set({ currentId: id, view: "editor", readOnly: false, scope: "mine" });
    scheduleSync();
  },

  saveCurrent: async () => {
    const id = get().currentId;
    if (!id) return;
    const existing = await getProject(id);
    const data = useVoxelStore.getState().toProjectData();
    const t = Date.now();
    await putProject({
      id,
      name: data.name,
      createdAt: existing?.createdAt ?? t,
      updatedAt: t,
      data,
      thumbnail: frontThumbnail(data),
    });
    scheduleSync();
  },

  exitToGallery: async () => {
    // saveCurrent is a no-op when read-only (currentId is null), so viewing
    // someone else's character never persists on the way out.
    await get().saveCurrent();
    await get().refresh();
    set({ view: "gallery", currentId: null, readOnly: false });
  },

  renameProject: async (id, rawName) => {
    const name = rawName.trim() || "Untitled";
    const rec = await getProject(id);
    if (!rec) return;
    await putProject({
      ...rec,
      name,
      data: { ...rec.data, name },
      updatedAt: Date.now(),
    });
    if (get().currentId === id) useVoxelStore.setState({ name });
    await get().refresh();
    scheduleSync();
  },

  removeProject: async (id) => {
    // Soft-delete: keep a tombstone (deleted + bumped updatedAt) so the delete
    // syncs to the account and other devices, rather than a local-only removal.
    const rec = await getProject(id);
    if (rec) {
      await putProject({ ...rec, deleted: true, thumbnail: "", updatedAt: Date.now() });
    }
    if (get().currentId === id) set({ currentId: null });
    await get().refresh();
    scheduleSync();
  },

  setScope: (scope) => {
    set({ scope });
    // Fetch everyone's characters fresh each time you switch to "all"; "mine"
    // already lives in `projects` (kept current by sync).
    if (scope === "all") void get().loadAllProjects();
  },

  loadAllProjects: async () => {
    set({ loadingAll: true });
    try {
      const remote = await pullAllCharacters();
      // Server records carry no thumbnail — render a front view from the voxel
      // data, the same way local cards get theirs.
      const allProjects: PublicCharacter[] = remote.map((r) => ({
        id: r.id,
        name: r.name,
        data: r.data,
        thumbnail: frontThumbnail(r.data),
      }));
      set({ allProjects });
    } catch {
      // Offline or signed out — keep whatever was showing, just drop the spinner.
    } finally {
      set({ loadingAll: false });
    }
  },
}));
