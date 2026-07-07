"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "../store/appStore";
import { previewAspect } from "../editor3d/previewFraming";
import type { ProjectData } from "../core/types";

/**
 * The minimum a card needs to render + open a character. Satisfied by both a
 * local `ProjectRecord` (My Characters) and a `PublicCharacter` from the "All
 * Characters" feed, so one card serves both grids.
 */
export type GalleryCardItem = {
  id: string;
  name: string;
  data: ProjectData;
  thumbnail: string;
};

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
 * One gallery card: the static front-view thumbnail as an instant placeholder,
 * then — only while the card is actually on screen — a live orbiting 3D preview
 * mounted on top and faded in. Mounting lazily (and unmounting when scrolled
 * away) keeps the number of live WebGL contexts small, which iOS Safari
 * strictly caps.
 *
 * No name or delete affordance: characters are unnamed in the UI, and the only
 * way to delete one is to erase every voxel and leave the editor (see
 * appStore.exitToGallery). `readOnly` cards belong to another maker ("All
 * Characters") and open a view-only 3D orbit instead of the editor.
 */
export default function GalleryCard({
  project: p,
  readOnly = false,
}: {
  project: GalleryCardItem;
  readOnly?: boolean;
}) {
  const openProject = useAppStore((s) => s.openProject);
  const openRemote = useAppStore((s) => s.openRemote);

  const cardRef = useRef<HTMLButtonElement>(null);
  const [inView, setInView] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const hasVoxels = p.data.voxels.length > 0;

  // Shape the card to the build: tall builds get portrait cards, wide/flat ones
  // landscape. Empty characters keep a square placeholder.
  const aspect = useMemo(
    () => (hasVoxels ? previewAspect(p.data.voxels) : 1),
    [hasVoxels, p.data.voxels],
  );

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
    <button
      ref={cardRef}
      onClick={() => (readOnly ? openRemote(p) : void openProject(p.id))}
      style={{ aspectRatio: aspect }}
      className="relative w-full overflow-hidden rounded-2xl bg-zinc-800 transition-transform active:scale-95"
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
  );
}
