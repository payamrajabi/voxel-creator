# VoxelOS — Build Plan (V1)

Companion to `PRD.md`. This is the phased implementation plan and the reference for
each phase's definition of done. It reflects two decisions locked with the product owner
(see **Locked decisions**) and a trimmed V1 scope.

---

## V1 goal (the finish line)

**Create a full 3D voxel character by painting front-to-back slices, then orbit and
rotate it as a solid character standing on the ground — all inside an installable
iPhone PWA.**

Everything not on the path to that — the export handoff, project gallery, `.vox`,
mirror, fill — is explicitly deferred (see **Deferred past V1**). They are all additive
and do not disturb the core, so deferring them is safe.

**Interpretation of "view in place":** the character stands on the ground grid plane and
the user orbits the camera around it (PRD §8). This is *not* AR / camera passthrough —
that is out of scope and unmentioned in the PRD.

---

## The one idea that drives everything

The PRD's "single source of truth" is the architectural spine, taken literally:

> There is one sparse voxel store. 2D and 3D are **views** over it. Tools are **edit
> commands** against it. Rendering is **derived**. Nothing else owns data.

Every hard part of the app is a place where something might try to own data it shouldn't.
The plan is mostly about **funneling all mutation through one gate** and **deriving
everything else** from the store.

---

## Locked decisions

1. **2D renderer = HTML Canvas 2D; 3D renderer = react-three-fiber.** Two renderers, one
   shared store. Painting stays crisp and simple; 3D risk stays isolated from 2D input.
   The single-source-of-truth guarantee lives in the store, not the renderer.
2. **V1 stops at "rotate a full 3D character."** Persistence-gallery, exports, and
   fast-follow tools are deferred.
3. **Minimal single-character autosave is IN.** So a page reload doesn't nuke work in
   progress. This is *not* the full gallery — just "restore the one character you were
   editing." Cheap, and it uses the same serializer future export will reuse.
4. **Stack corrections vs PRD:** use **Serwist** (`@serwist/next`), not the abandoned
   `next-pwa`; use **react-three-fiber v9** (v8 is incompatible with React 19 / Next 15).
5. **`idb` over Dexie**, diff-based history over snapshots, iPhone-Safari-primary tuning.

---

## The core slab (built and tested before any UI)

Pure, headless, unit-tested modules. This is the most important code in the project.

- **`voxelStore`** — sparse map `"x,y,z" → colorId (0–23)` + cached used-bounds (Zustand).
- **`history`** — a **transactional diff log**, and the *only* sanctioned way to mutate the
  store. A gesture (one paint stroke, one 3D placement, a layer delete) opens a
  transaction, records `{key, prev, next}` diffs, commits **one** undo entry. Dragging
  across 40 cells = one undo step. Tools never touch the map directly. This single rule
  keeps undo/redo correct across both modes forever, and is agonizing to retrofit — so it
  goes in first.
- **`coords`** — **every** coordinate transform in one file: grid↔world, 2D-slice↔grid,
  used-bounds + `suggestedOrigin`. Unit-tested against hand-computed fixtures. (Y-up→Z-up
  for `.vox` lands here later, when `.vox` is un-deferred.)
- **`palette`** — the 24 Perler colors, frozen.
- **`serialize` / `deserialize`** — built here (needed for autosave). The *same* code the
  deferred JSON/`.vox` export will reuse. Validated against the PRD §10.1 schema on day one.

---

## Risk register (ranked, with mitigation)

1. **Undo/redo across both modes** — retired by the `history` gate, built first.
2. **3D face-pick → add adjacent cube** — raycast InstancedMesh → `instanceId` +
   `face.normal`; maintain a deterministic `instanceId → voxelKey` array rebuilt with the
   buffers; quantize normal to ±X/±Y/±Z, step one unit, place if empty & attached. First
   cube attaches to the ground plane. **De-risked by a throwaway spike in Phase 0.**
3. **Tap-vs-drag disambiguation** (unified pointer events) — a small, tested `gesture`
   module classifies a pointer sequence (movement threshold + pointer count) *before*
   committing. #1 source of "placed a cube when I meant to orbit" bugs on touch.
4. **Instance-buffer updates & perf** — rebuild matrix+color buffers only on change; flag
   `needsUpdate`. <20k voxels realistic; no greedy meshing for v1.
5. **r3f + Serwist + App Router SSR** — r3f is client-only (`'use client'` + dynamic import
   `ssr:false`). Proven on a real iPhone at the **end of Phase 0**, not end of project.
6. **Coordinate fidelity** — owned entirely by `coords.ts` + fixtures.

---

## Module layout

```
src/
  core/        coords.ts  palette.ts  voxelKey.ts  serialize.ts  types.ts
  store/       voxelStore.ts  editorStore.ts  history.ts
  input/       gesture.ts            (pointer classification)
  editor2d/    Canvas2D.tsx  onion  scrubber
  editor3d/    Scene3D.tsx  VoxelInstances.tsx  facePick.ts  GroundPlane.tsx
  persistence/ db.ts (idb)  autosave.ts        (minimal single-character)
  ui/          Hotbar  ColorPicker  TopBar  Tools
  app/         layout.tsx  manifest.ts  editor page (client-only)
```

---

## V1 roadmap (critical path)

Each phase follows plan-first / approve-then-build / commit-to-`main`.

| Phase | What | Size | Definition of done |
|---|---|---|---|
| **0 — Scaffold + PWA + 3D proof** | Next 15 · TS · Tailwind · Zustand · **r3f v9** · **Serwist**. `git init` → GitHub → Vercel. **+ face-pick spike.** | M | Live URL; blank r3f canvas renders & orbits; **installable on iPhone home screen** + desktop; spike proves instance raycast → face. |
| **1 — Core model** | `coords` · `palette` · `voxelKey` · `voxelStore` · `history` gate · `serialize`. Pure, unit-tested. No UI. | M | Tests green; build a character in code, undo/redo, serialize→parse round-trips. |
| **2 — 2D painting** | Canvas2D slice + `gesture` input (paint/erase/eyedropper), hotbar + 24-color picker, zoom/pan. Undoable via history gate. | M | Paint/erase a colored image on one layer, pick from 24 colors, zoom/pan; minimal autosave restores on reload. |
| **3 — Layers (depth)** | Depth scrubber, prev/next, add/delete layer, onion-skin. Front-to-back building. | M | Move through depth, build front-to-back, see onion-skin ghosts. |
| **4 — 3D view (the payoff)** | Instanced cubes from store, ground plane, orbit/zoom/pan, 2D⇄3D toggle sharing state. | M | Build across layers, flip to 3D, **orbit a solid cube character on the phone**; toggling modes preserves work. |
| **— ship seam —** | *V1 can ship here.* Phase 5 is the immediate follow. | | |
| **5 — 3D sculpting** | Face-tap-to-add + attach constraint, erase, eyedropper in 3D, tap-sets-2D-layer. Consumes the Phase 0 spike. | M | Add/remove cubes on any visible face; nothing floats. |

---

## Post-V1 roadmap (tracked)

**Shipped since V1:** project **gallery** + thumbnails · **3D sculpting** (Phase 5) ·
hold-to-place **"glass box"** tool · **local-first cloud sync with real accounts**
(Clerk auth + Neon Postgres, deployed on `main`).

**Still open — additive, safe without disturbing the core:**

- [ ] **Clerk production instance.** Auth currently runs on Clerk's *development* instance —
  fine for ~12 kids (100-user cap, $0) but has a dev-mode rough edge and isn't your own
  auth domain. Upgrading is **deferred, gated on a custom domain** (Clerk prod can't run on a
  `*.vercel.app` address). When ready: point a domain at Vercel → create the Clerk production
  instance + your own Google OAuth creds + add Clerk's DNS records → swap `pk_test`/`sk_test`
  → `pk_live` in Vercel → **re-key existing Neon rows dev→prod by email so no characters are
  orphaned.** Only new cost: the domain (~$12/yr). (Full recipe saved in Claude's memory.)
- [ ] **Shared-device multi-user.** IndexedDB isn't user-scoped, so on a shared phone the
  first account to sign in absorbs that device's local characters. Fine under "Brooks signs
  in first"; harden before multiple accounts routinely share one device.
- [ ] **Canonical JSON export** (downstream handoff — logic pre-built in the serializer, only
  the download UI remains) and **`.vox`** export (MagicaVoxel, Y-up→Z-up).
- [ ] **X-mirror** symmetry and **bucket fill** (fast-follow editing tools).

---

## Working conventions (from PRD §14)

Per phase: read existing files → propose plan (files, data-model changes, order, test
approach) → list open questions → estimate size → **wait for approval** → build → commit &
push to `main`. If a plan turns out wrong mid-build, stop and say so.
