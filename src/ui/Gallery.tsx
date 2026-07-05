"use client";

import { UserButton } from "@clerk/nextjs";
import { useAppStore, type Scope } from "../store/appStore";

const SCOPES: [Scope, string][] = [
  ["mine", "My Characters"],
  ["all", "All Characters"],
];

/**
 * The home screen. A toggle up top switches between "My Characters" (yours, from
 * this device + your account) and "All Characters" (everyone's, read-only). Tap
 * a card to open it in 3D — your own are editable, others' are view-only. Kept
 * deliberately simple and finger-friendly.
 */
export default function Gallery() {
  const scope = useAppStore((s) => s.scope);
  const setScope = useAppStore((s) => s.setScope);
  const projects = useAppStore((s) => s.projects);
  const allProjects = useAppStore((s) => s.allProjects);
  const loadingAll = useAppStore((s) => s.loadingAll);
  const newProject = useAppStore((s) => s.newProject);
  const openProject = useAppStore((s) => s.openProject);
  const openRemote = useAppStore((s) => s.openRemote);
  const renameProject = useAppStore((s) => s.renameProject);
  const removeProject = useAppStore((s) => s.removeProject);

  return (
    <main className="h-full w-full overflow-y-auto bg-[#2E2F32] text-zinc-100">
      <div
        className="mx-auto max-w-3xl px-4 pb-16"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1.25rem)" }}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex overflow-hidden rounded-xl bg-black/25 p-0.5 text-sm font-semibold">
            {SCOPES.map(([s, label]) => (
              <button
                key={s}
                onClick={() => setScope(s)}
                className={`rounded-[0.6rem] px-3 py-1.5 transition-colors ${
                  scope === s ? "bg-white text-black" : "text-zinc-400"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
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

        {scope === "mine" ? (
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
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {allProjects.length === 0 && (
              <p className="col-span-2 py-12 text-center text-sm text-zinc-500 sm:col-span-3">
                {loadingAll
                  ? "Loading every character…"
                  : "No characters have been built yet."}
              </p>
            )}

            {allProjects.map((p) => (
              <div key={p.id} className="flex flex-col gap-1.5">
                <button
                  onClick={() => openRemote(p)}
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
                <span
                  className="truncate px-1 py-0.5 text-sm text-zinc-300"
                  title={p.name}
                >
                  {p.name || "Untitled"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
