"use client";

import { UserButton } from "@clerk/nextjs";
import { useAppStore, type Scope } from "../store/appStore";
import GalleryCard from "./GalleryCard";

const SCOPES: [Scope, string][] = [
  ["mine", "My Characters"],
  ["all", "All Characters"],
];

/**
 * The home screen. A toggle up top switches between "My Characters" (yours, from
 * this device + your account) and "All Characters" (everyone's, read-only). Each
 * card is a live 3D preview that slowly orbits the build (see GalleryCard); tap
 * one to open it in 3D — your own are editable, others' are view-only.
 */
export default function Gallery() {
  const scope = useAppStore((s) => s.scope);
  const setScope = useAppStore((s) => s.setScope);
  const projects = useAppStore((s) => s.projects);
  const allProjects = useAppStore((s) => s.allProjects);
  const loadingAll = useAppStore((s) => s.loadingAll);
  const newProject = useAppStore((s) => s.newProject);

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
          <div className="flex flex-col gap-4">
            {projects.length === 0 && (
              <button
                onClick={() => void newProject()}
                className="flex aspect-video flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/20 text-zinc-400 transition-transform active:scale-95"
              >
                <span className="text-4xl">＋</span>
                <span className="text-sm">Make your first character</span>
              </button>
            )}

            {projects.map((p) => (
              <GalleryCard key={p.id} project={p} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {allProjects.length === 0 && (
              <p className="py-12 text-center text-sm text-zinc-500">
                {loadingAll
                  ? "Loading every character…"
                  : "No characters have been built yet."}
              </p>
            )}

            {allProjects.map((p) => (
              <GalleryCard key={p.id} project={p} readOnly />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
