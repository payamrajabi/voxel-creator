"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { useAppStore } from "../store/appStore";
import type { ProjectRecord } from "../persistence/db";

// r3f touches WebGL on mount, so the preview must never be server-rendered.
const CharacterPreview = dynamic(() => import("../editor3d/CharacterPreview"), {
  ssr: false,
});

/** Stable 0–2π phase from the character id, so cards don't all spin in sync. */
function phaseFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return (((h % 360) + 360) % 360) * (Math.PI / 180);
}

/**
 * One gallery card. Shows the static front-view thumbnail as an instant
 * placeholder, then — only while the card is actually on screen — mounts a live
 * orbiting 3D preview on top and fades it in. Mounting lazily (and unmounting
 * when scrolled away) keeps the number of live WebGL contexts small, which
 * iOS Safari strictly caps.
 */
export default function GalleryCard({ project: p }: { project: ProjectRecord }) {
  const openProject = useAppStore((s) => s.openProject);
  const renameProject = useAppStore((s) => s.renameProject);
  const removeProject = useAppStore((s) => s.removeProject);

  const cardRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const hasVoxels = p.data.voxels.length > 0;

  useEffect(() => {
    const el = cardRef.current;
    if (!el || !hasVoxels) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (!entry.isIntersecting) setPreviewReady(false);
      },
      // Mount a little before it scrolls into view so the spin is ready in time.
      { rootMargin: "250px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasVoxels]);

  return (
    <div className="flex flex-col gap-1.5">
      <button
        ref={cardRef}
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
          !hasVoxels && (
            <span className="flex h-full w-full items-center justify-center text-3xl text-zinc-600">
              ▦
            </span>
          )
        )}

        {hasVoxels && inView && (
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${
              previewReady ? "opacity-100" : "opacity-0"
            }`}
          >
            <CharacterPreview
              voxels={p.data.voxels}
              phase={phaseFromId(p.id)}
              onReady={() => setPreviewReady(true)}
            />
          </div>
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
  );
}
