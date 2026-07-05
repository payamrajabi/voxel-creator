"use client";

import { UserButton } from "@clerk/nextjs";
import { useAppStore } from "../store/appStore";
import GalleryCard from "./GalleryCard";

/**
 * The home screen: a grid of saved characters, each shown as a live 3D preview
 * that slowly orbits the build (see GalleryCard). Tap a card to open it, tap the
 * name to rename, ＋ New to start another. Kept deliberately simple and
 * finger-friendly.
 */
export default function Gallery() {
  const projects = useAppStore((s) => s.projects);
  const newProject = useAppStore((s) => s.newProject);

  return (
    <main className="h-full w-full overflow-y-auto bg-[#2E2F32] text-zinc-100">
      <div
        className="mx-auto max-w-3xl px-4 pb-16"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Characters</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={() => void newProject()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-transform active:scale-95"
            >
              ＋ New
            </button>
            <UserButton />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {projects.length === 0 && (
            <button
              onClick={() => void newProject()}
              className="col-span-2 flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 text-zinc-400 transition-transform active:scale-95 sm:col-span-3"
            >
              <span className="text-4xl">＋</span>
              <span className="text-sm">Make your first character</span>
            </button>
          )}

          {projects.map((p) => (
            <GalleryCard key={p.id} project={p} />
          ))}
        </div>
      </div>
    </main>
  );
}
