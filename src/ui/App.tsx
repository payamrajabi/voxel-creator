"use client";

import { useEffect } from "react";
import { useAppStore } from "../store/appStore";
import { useAutosave } from "../persistence/useAutosave";
import Editor from "./Editor";
import Gallery from "./Gallery";

/**
 * Top-level shell: boots the project list, then shows either the gallery (home)
 * or the editor for the open character. One client app, no route changes — the
 * PWA doesn't need deep links for v1, and this sidesteps SSR/route edge cases.
 */
export default function App() {
  const ready = useAppStore((s) => s.ready);
  const view = useAppStore((s) => s.view);
  const init = useAppStore((s) => s.init);

  useEffect(() => {
    void init();
  }, [init]);

  useAutosave();

  if (!ready) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
        loading…
      </div>
    );
  }

  return view === "editor" ? <Editor /> : <Gallery />;
}
