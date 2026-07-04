# VoxelOS — Product Requirements Document (v1)

*Working name: VoxelOS. Rename freely; it is used only as a placeholder here.*

---

## 1. One-liner

A phone-and-desktop web app for building low-resolution voxel (cube) characters by painting flat layers in 2D and assembling them in 3D, then exporting the finished geometry and colors as clean data that a separate 3D game pipeline turns into characters that walk around.

This app's job stops at **shape + color + coordinate conventions.** Rigging, animation, and anything that makes the character move happen downstream, not here.

---

## 2. The core mental model (read this first)

There is **one single source of truth**: a set of colored cubes (voxels) sitting in a 3D grid. Everything else is just a way of looking at or editing that same set.

- **2D mode** edits **one depth-slice at a time.** The canvas is the front view of the character (like looking at its face). You draw the front-most slice first, then step one unit deeper and draw what sits behind it, and so on. Think of building a relief sculpture from front to back.
- **3D mode** shows **all slices combined** as a solid cube character you can orbit around, and lets you add or remove cubes on any visible surface.

Both modes read and write the same voxel set, so they are always in sync. Switching modes never converts or copies data; it just changes how you see and touch it.

**Why depth-slicing and not stacking upward:** it matches a portrait phone canvas (you see the character's front, full-height) and it is intuitive to draw a silhouette first and fill in behind it. A "layer" here means a depth-slice, not a floor.

---

## 3. Coordinate system and conventions (the part the downstream depends on)

This must be exact and never drift, because "the next thing" consumes it.

- **X** = left/right. `+X` is to the character's right-hand side on screen.
- **Y** = up/down. `+Y` is up. **`Y = 0` is the feet** (bottom), increasing upward.
- **Z** = front/back. **`Z = 0` is the front-most slice** (the first layer you draw), increasing as you go deeper into the body.
- **Facing / forward = `-Z`.** The character looks toward the viewer in the default 3D camera. (This matches the glTF / three.js right-handed convention, so downstream tools agree with us for free.)
- **Origin for export** = center of the character's footprint at ground level: X and Z centered on the used bounds, Y at the lowest used voxel. This is written into the export as a `suggestedOrigin` so downstream can place the character's feet at world zero.

**Editor convenience:** in 2D mode, the active layer index equals the Z coordinate directly (layer 0 → Z 0). Layers are purely an editing aid. The export contains no notion of "layers" at all; it is a flat list of voxels in the coordinate frame above. This clean separation is intentional.

---

## 4. Canvas size and zoom

- **Maximum grid:** 64 (X) × 64 (Y) × 64 (Z). Cubes are uniform (same size on every axis).
- **Storage is sparse:** only placed voxels are stored, so an almost-empty 64³ volume is cheap. This is what keeps a big grid fast.
- **Initial zoom:** the camera/canvas opens zoomed in so roughly a 20–24 unit region is visible (64 cells across a phone would be too small to tap). The user pinches or scrolls **out** to reach the full 64, and pans when zoomed in.
- Depth up to 64 is generous; most characters use far less. If we later want to nudge performance or simplicity, depth is the one number to lower.

---

## 5. The palette (24 colors, Perler-inspired)

Fixed set of 24 rich solid colors spanning neutrals, skin/wood tones, and a full spectral range. Solid only, **no opacity.** Hex values are pulled from the real Perler solids so the look stays authentic. Perler codes are included as reference only.

Displayed in the bottom hotbar as **3 rows of 8** on mobile (flexible on desktop: 2 rows of 12 or a single row). Suggested row grouping below (neutrals + skin, then warms + greens, then cools + pinks).

**Row 1 — neutrals & skin/wood**

| # | Name | Hex | Perler |
|---|------|-----|--------|
| 1 | White | `#F1F1F1` | P01 |
| 2 | Grey | `#8A8D91` | P17 |
| 3 | Dark Grey | `#4D5156` | P92 |
| 4 | Black | `#2E2F32` | P18 |
| 5 | Peach | `#EEBAB2` | P33 |
| 6 | Tan | `#BC9371` | P35 |
| 7 | Light Brown | `#815D34` | P21 |
| 8 | Brown | `#513931` | P12 |

**Row 2 — warms & greens**

| # | Name | Hex | Perler |
|---|------|-----|--------|
| 9 | Rust | `#8C372C` | P20 |
| 10 | Red | `#F01820` | P05 |
| 11 | Hot Coral | `#FF3851` | P59 |
| 12 | Orange | `#ED6120` | P04 |
| 13 | Cheddar | `#F1AA0C` | P57 |
| 14 | Yellow | `#ECD800` | P03 |
| 15 | Kiwi Lime | `#6CBE13` | P61 |
| 16 | Dark Green | `#1C753E` | P10 |

**Row 3 — cools & pinks**

| # | Name | Hex | Perler |
|---|------|-----|--------|
| 17 | Toothpaste (Teal) | `#93C8D4` | P58 |
| 18 | Turquoise | `#2B89C6` | P62 |
| 19 | Light Blue | `#3370C0` | P09 |
| 20 | Dark Blue | `#2B3F87` | P08 |
| 21 | Purple | `#604089` | P07 |
| 22 | Magenta | `#F22A7B` | P38 |
| 23 | Pink | `#E44892` | P83 |
| 24 | Bubblegum | `#DD669B` | P06 |

**Hotbar behavior** (mirrors Freeform's color control): the currently selected color shows as the active swatch. Tapping the active swatch opens the full 24-color picker; tapping any swatch selects it and closes the picker. The chosen color is what every paint action places.

---

## 6. Tools

Core (v1):

- **Paint:** place the active color. In 2D, tap or drag across cells to paint a stroke. In 3D, tap a visible cube face to add a cube on that face (see 3D mode).
- **Erase:** remove a voxel. A mode toggle, plus long-press (touch) / right-click (mouse) as a quick-erase shortcut.
- **Eyedropper:** tap a voxel to set the active color to that voxel's color. Works in both modes.
- **Clear:** clear the current layer, or clear the whole character (with confirm).
- **Undo / redo:** global history across all edits in both modes.

Fast-follow (later phase, high value for characters):

- **Mirror (X-axis symmetry):** a toggle that mirrors every edit across the character's centerline, so symmetric characters are half the work.
- **Fill (bucket):** flood-fill a contiguous same-color region within the current 2D layer.

---

## 7. 2D mode (layer editing)

- Canvas shows the **active depth-slice** as a flat grid of colored squares on a visible grid.
- **Layer navigation:** previous / next buttons and a depth **scrubber/slider** (needed since depth can be up to 64), with a readout like `Layer 3 / 12`.
- **Add layer / delete layer.** Deleting a layer removes that whole slice's voxels (with confirm if non-empty).
- **Onion-skinning (toggle):** show the immediately adjacent slice(s) as faint ghosts so you can align features front-to-back.
- **Zoom & pan:** pinch / scroll to zoom, two-finger drag / spacebar-drag to pan when zoomed in.
- Painting and erasing here write directly to the shared voxel set at `(x, y, activeLayer)`.

---

## 8. 3D mode (assembly & sculpting)

- Renders the entire voxel set as solid cubes. A subtle **ground grid plane** shows orientation and gives the first cube something to attach to.
- **Camera:** one-finger drag / left-drag to orbit, pinch / scroll to zoom, two-finger drag / right-drag to pan.
- **Add a cube:** tap a visible **face** of an existing cube; a new cube appears adjacent on that face's outward direction, in the active color. New cubes must attach to an existing cube or the ground plane, so nothing floats disconnected.
- **Remove a cube:** in erase mode (or long-press / right-click), tap a cube to delete it.
- **Eyedropper** works here too.
- **Optional nicety:** tapping a cube can set the 2D active layer to that cube's Z, so switching back to 2D lands you on the slice you were just touching.

---

## 9. Persistence

- **Local-first, on-device.** Store multiple characters in **IndexedDB** (via a small wrapper such as `idb` or Dexie). No account needed for v1.
- **Project gallery:** a home screen listing saved characters, each with a **thumbnail** (a rendered snapshot of the front or a 3D pose), plus create / rename / duplicate / delete.
- **Autosave** on edit.
- **Import / export project file:** download a character as JSON and re-import it, so work can be backed up or moved between devices.
- Cloud sync (e.g. Supabase) is a clean future addition consistent with the rest of the portfolio, but explicitly **out of scope for v1.**

---

## 10. Export (the handoff to the next thing)

Two exports. **JSON is the real handoff.** `.vox` is a convenience for opening in standard voxel tools.

### 10.1 Canonical character JSON (required)

```json
{
  "format": "voxelos-character",
  "version": 1,
  "name": "Little Guy",
  "gridSize": { "x": 64, "y": 64, "z": 64 },
  "bounds": { "min": [12, 0, 3], "max": [40, 47, 9] },
  "conventions": {
    "axes": "X-right, Y-up, Z-back",
    "up": "+Y",
    "forward": "-Z",
    "originRule": "footprint center at feet: X,Z centered on used bounds; Y at lowest used voxel",
    "suggestedOrigin": [26, 0, 6]
  },
  "palette": [
    { "id": 0, "name": "White", "hex": "#F1F1F1", "perler": "P01" }
    // ...all 24 entries
  ],
  "voxels": [
    { "x": 26, "y": 0, "z": 6, "c": 7 }
    // c references palette id; keeps the list compact
  ]
}
```

Notes for the implementer:
- `voxels` are in **grid indices** in the coordinate frame from Section 3. Downstream applies `suggestedOrigin` and the up/forward axes to place the character.
- `c` is the palette id (0–23). The palette is embedded so the file is self-contained.
- `bounds` is the actual used extent, so downstream can size/center without scanning.

### 10.2 MagicaVoxel `.vox` (fast-follow, secondary)

- Export the same voxels as a MagicaVoxel `.vox` file (256³ / 256-palette format), mapping our 24 colors to palette slots 1–24.
- MagicaVoxel is **Z-up**; translate our Y-up to its Z-up on write and document the mapping in code comments. This unlocks importing into Blender, Unity, Unreal, etc. for anyone who wants a meshing/rigging path outside our own pipeline.

`.glb` mesh export is **out of scope for v1** (noted as a future option).

---

## 11. Tech stack

- **Next.js (App Router) + TypeScript.**
- **react-three-fiber** (`@react-three/fiber`) + **`@react-three/drei`** for the 3D scene.
- **Tailwind CSS** for UI.
- **Zustand** for state (voxel store, active tool/color, layer, undo-redo). Lightweight and plays well with react-three-fiber.
- **IndexedDB** via `idb` or Dexie for persistence.
- **PWA:** installable on iPhone home screen and desktop, offline-capable (manifest + service worker; `next-pwa` or a manual setup).
- **Deploy:** Vercel, GitHub auto-deploy, push to `main`.
- **Input:** use unified **pointer events** so touch (iPhone) and mouse (desktop) share one code path.

**Performance guidance:**
- Render cubes with an **instanced mesh** (drei `<Instances>` / `THREE.InstancedMesh`) so thousands of cubes are one draw call.
- Face-tap detection uses raycasting against the instanced mesh (`instanceId` on the hit) to find which cube and which face was tapped.
- Greedy meshing is not needed for v1 editing; instancing is enough. It can be revisited later if `.glb` export is added.

---

## 12. Layout / UX

- **Mobile:** portrait. The canvas is effectively the whole screen. The **hotbar docks at the bottom** (3 rows of 8 swatches) with the active-color control and the tool buttons. A compact top bar holds mode toggle (2D / 3D), layer controls (in 2D), undo/redo, and a menu (save, export, back to gallery).
- **Desktop:** responsive. Same canvas-first layout; the palette and tools can move to a side panel or a wider bottom bar, and hover states apply.
- Mode toggle (2D ⇄ 3D) is always one tap away and never destroys work.

---

## 13. Non-goals for v1 (explicitly out of scope)

- Rigging, skeletons, animation, or "walking" (all downstream).
- Rounded-bead rendering or a "press to flatten" step (we build straight to cubes).
- Opacity / transparency / materials beyond flat solid color.
- Accounts, cloud sync, multiplayer, or sharing.
- `.glb` mesh export.
- Physical Perler pegboard / iron-on pattern output.

---

## 14. How to build this with Claude Code

Follow the plan-first convention on **every phase**:

1. Read the relevant existing files first.
2. Propose the plan: files to create/modify, data-model changes, order of operations, and how it will be tested.
3. List any open questions or decisions needed.
4. Estimate size: small (one file), medium (a few files), or large (a milestone).
5. **Wait for approval before implementing.** If the plan turns out wrong mid-build, **stop and say so** rather than silently rewriting it.
6. After each approved phase: commit and push directly to `main` (no branches).

### Suggested phase order

- **Phase 0 — Scaffold.** Next.js + react-three-fiber + Tailwind + Zustand + PWA shell. Deploys to Vercel; a blank canvas renders on phone and desktop.
- **Phase 1 — 2D painting (single layer).** Voxel data model + embedded 24-color palette; grid canvas; paint / erase / eyedropper; bottom hotbar with tap-to-open picker; zoom and pan.
- **Phase 2 — Layers.** Depth-slice stacking; add/delete/navigate layers; depth scrubber; onion-skinning.
- **Phase 3 — 3D view.** Assemble the voxel set as instanced cubes; orbit / zoom / pan; the 2D ⇄ 3D mode toggle with shared state.
- **Phase 4 — 3D sculpting.** Tap-face-to-add with the attach constraint; erase; eyedropper in 3D.
- **Phase 5 — Persistence.** IndexedDB store; project gallery with thumbnails; autosave; import/export project JSON.
- **Phase 6 — Export.** Canonical character JSON (Section 10.1) with conventions and palette; download.
- **Phase 7 — Fast-follow.** X-mirror symmetry; fill/bucket; `.vox` export.

### Definition of done (per phase, at a glance)

- **P0:** live URL renders a blank canvas on iPhone and desktop; installable.
- **P1:** can paint and erase a colored image on one layer, pick from 24 colors, zoom/pan.
- **P2:** can move through depth layers, build front-to-back, see onion-skin ghosts.
- **P3:** 3D view shows the combined character; orbit works; toggling modes preserves work.
- **P4:** can add and remove cubes directly in 3D on any visible face; nothing floats.
- **P5:** characters persist across reloads; gallery with thumbnails; can export/import a project file.
- **P6:** export produces valid JSON matching the schema, with correct bounds, origin, and axes.
- **P7:** mirror halves symmetric work; bucket fills regions; `.vox` opens correctly in MagicaVoxel.

---

## 15. Data-model summary (quick reference)

- **Voxel store (in memory + saved):** sparse map keyed by `"x,y,z"` → palette id (0–23). Sparse = empty space is free.
- **Palette:** fixed array of 24 `{ id, name, hex, perler }`.
- **Project:** `{ id, name, createdAt, updatedAt, gridSize, voxels, thumbnail }`.
- **Editing rule:** 2D writes at `(x, y, activeLayer)`; 3D writes at the computed adjacent cell on a tapped face. Both mutate the one shared store; undo/redo wraps all mutations.
