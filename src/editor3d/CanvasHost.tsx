"use client";

import dynamic from "next/dynamic";

// react-three-fiber touches WebGL / `window` during render, so the scene must
// never be server-rendered. `ssr: false` is only allowed inside a Client
// Component (Next 16), which is why this thin host exists.
const Scene3D = dynamic(() => import("./Scene3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-[#2e2f32] text-xs text-zinc-500">
      loading 3D…
    </div>
  ),
});

export default function CanvasHost() {
  return (
    <div className="h-full w-full touch-none">
      <Scene3D />
    </div>
  );
}
