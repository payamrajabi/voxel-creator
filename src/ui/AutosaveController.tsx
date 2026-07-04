"use client";

import { useEffect } from "react";
import { useVoxelStore } from "../store/voxelStore";
import { loadProject, saveProject } from "../store/persist";

/** How long to wait after the last edit before writing an autosave. */
const DEBOUNCE_MS = 500;

/**
 * Keeps the current character on the device. Mounted once at the root (like the
 * service worker), it:
 *   1. rehydrates the last session on load, and
 *   2. writes an autosave shortly after every edit — and immediately whenever
 *      the app is backgrounded or closed.
 *
 * iOS Safari does not reliably fire `beforeunload`; `visibilitychange` and
 * `pagehide` are the dependable signals, and the write is synchronous so it
 * lands before the tab is frozen or evicted from memory.
 */
export default function AutosaveController() {
  useEffect(() => {
    // Restore BEFORE subscribing, so replaying the saved character doesn't
    // trigger a redundant save, and the empty initial store can never overwrite
    // a good autosave.
    const saved = loadProject();
    if (saved && saved.voxels.length > 0) {
      useVoxelStore.getState().loadProjectData(saved);
    }

    let timer: ReturnType<typeof setTimeout> | null = null;

    const flush = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      saveProject(useVoxelStore.getState().toProjectData());
    };

    const unsubscribe = useVoxelStore.subscribe(() => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    });

    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);

    return () => {
      flush();
      unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, []);

  return null;
}
