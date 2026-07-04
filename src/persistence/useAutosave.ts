"use client";

import { useEffect } from "react";
import { useVoxelStore } from "../store/voxelStore";
import { useAppStore } from "../store/appStore";

/**
 * Debounced autosave of the open character while editing. Subscribes to voxel
 * changes and writes to IndexedDB `delay` ms after the last edit, so a reload
 * never loses work. Inactive in the gallery or with no project open.
 */
export function useAutosave(delay = 800) {
  const view = useAppStore((s) => s.view);
  const currentId = useAppStore((s) => s.currentId);

  useEffect(() => {
    if (view !== "editor" || !currentId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void useAppStore.getState().saveCurrent();
      }, delay);
    };
    const unsubscribe = useVoxelStore.subscribe(schedule);
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, [view, currentId, delay]);
}
