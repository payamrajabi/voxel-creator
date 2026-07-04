import Link from "next/link";
import CanvasHost from "@/editor3d/CanvasHost";

export default function Home() {
  return (
    <main className="relative h-full w-full">
      <CanvasHost />
      <div
        className="pointer-events-none absolute left-0 top-0 z-10 p-4"
        style={{ paddingTop: "calc(env(safe-area-inset-top) + 1rem)" }}
      >
        <h1 className="text-sm font-semibold tracking-tight text-zinc-200">
          VoxelOS
        </h1>
        <p className="text-xs text-zinc-400">Phase 0 · scaffold</p>
        <Link
          href="/spike"
          className="pointer-events-auto mt-2 inline-block rounded-md bg-white/10 px-2 py-1 text-xs text-zinc-100 backdrop-blur transition-colors hover:bg-white/20"
        >
          face-pick spike →
        </Link>
      </div>
    </main>
  );
}
