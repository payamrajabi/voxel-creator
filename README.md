# VoxelOS

A phone-and-desktop web app for building low-resolution voxel (cube) characters:
paint flat depth-slices in 2D, assemble and orbit them as a solid character in 3D.
Installable as a PWA. See [`PRD.md`](PRD.md) for the product spec and
[`BUILD_PLAN.md`](BUILD_PLAN.md) for the phased implementation plan.

**V1 goal:** create a full 3D voxel character and orbit it, on an installable iPhone PWA.

## Stack

- **Next.js 16** (App Router) + **TypeScript** + **Tailwind CSS v4**
- **react-three-fiber v9** + **drei** for the 3D scene (instanced cubes)
- **Zustand** for state, **idb** for on-device persistence (later phase)
- PWA via a manual service worker (`public/sw.js`) + `app/manifest.ts`

## Develop

```bash
npm run dev      # dev server (Turbopack)
npm run build    # production build
npm run lint
node scripts/gen-icons.mjs   # regenerate PWA icons from the inline SVG
```

## Status

- **Phase 0 — scaffold + PWA + 3D proof.** ✅ Blank installable canvas; a demo voxel
  character renders and orbits. `/spike` proves face-pick (tap a cube face → add an
  adjacent cube) ahead of the 3D-sculpting phase.

Routes: `/` (3D canvas), `/spike` (throwaway face-pick prototype).
