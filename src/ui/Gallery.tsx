"use client";

import { useAppStore } from "../store/appStore";

/**
 * The home screen: a grid of saved characters with their front-view thumbnails.
 * Tap a card to open it, tap the name to rename, ＋ New to start another. Kept
 * deliberately simple and finger-friendly.
 */
export default function Gallery() {
  const projects = useAppStore((s) => s.projects);
  const newProject = useAppStore((s) => s.newProject);
  const openProject = useAppStore((s) => s.openProject);
  const renameProject = useAppStore((s) => s.renameProject);
  const removeProject = useAppStore((s) => s.removeProject);

  return (
    <main className="h-full w-full overflow-y-auto bg-[#2E2F32] text-zinc-100">
      <div
        className="mx-auto max-w-3xl px-4 pb-16"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-semibold">My Characters</h1>
          <button
            onClick={() => void newProject()}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black transition-transform active:scale-95"
          >
            ＋ New
          </button>
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
            <div key={p.id} className="flex flex-col gap-1.5">
              <button
                onClick={() => void openProject(p.id)}
                className="relative aspect-square overflow-hidden rounded-2xl bg-zinc-800 transition-transform active:scale-95"
              >
                {p.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.thumbnail}
                    alt={p.name}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-3xl text-zinc-600">
                    ▦
                  </span>
                )}
              </button>
              <div className="flex items-center gap-1">
                <input
                  defaultValue={p.name}
                  onBlur={(e) => void renameProject(p.id, e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  }}
                  className="min-w-0 flex-1 rounded-md bg-transparent px-1 py-0.5 text-sm text-zinc-200 outline-none focus:bg-white/10"
                  aria-label="Character name"
                />
                <button
                  onClick={() => {
                    if (confirm(`Delete "${p.name}"? This can't be undone.`))
                      void removeProject(p.id);
                  }}
                  className="rounded-md px-1.5 py-0.5 text-zinc-500 transition-colors active:text-red-400"
                  aria-label={`Delete ${p.name}`}
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
