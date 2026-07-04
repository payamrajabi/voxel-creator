import { create } from "zustand";
import { useVoxelStore } from "./voxelStore";
import { DEFAULT_GRID_SIZE } from "../core/coords";
import { frontThumbnail } from "../persistence/thumbnail";
import {
  deleteProject,
  getProject,
  listProjects,
  putProject,
  type ProjectRecord,
} from "../persistence/db";

export type View = "gallery" | "editor";

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

  init: () => Promise<void>;
  refresh: () => Promise<void>;
  newProject: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  saveCurrent: () => Promise<void>;
  exitToGallery: () => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  removeProject: (id: string) => Promise<void>;
};

export const useAppStore = create<AppState>()((set, get) => ({
  ready: false,
  view: "gallery",
  currentId: null,
  projects: [],

  init: async () => {
    set({ projects: await listProjects(), ready: true });
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
    set({ currentId: id, view: "editor" });
  },

  openProject: async (id) => {
    const rec = await getProject(id);
    if (!rec) return;
    useVoxelStore.getState().loadProjectData(rec.data);
    set({ currentId: id, view: "editor" });
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
  },

  exitToGallery: async () => {
    await get().saveCurrent();
    await get().refresh();
    set({ view: "gallery", currentId: null });
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
  },

  removeProject: async (id) => {
    await deleteProject(id);
    if (get().currentId === id) set({ currentId: null });
    await get().refresh();
  },
}));
