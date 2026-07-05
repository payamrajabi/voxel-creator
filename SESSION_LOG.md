# Session Log

Reverse-chronological log of build sessions. Roadmap lives in `BUILD_PLAN.md`;
working conventions in `AGENTS.md` / `CLAUDE.md`.

## 2026-07-05 — 3D drawing, glass-box tool, and cloud sync with accounts

**Built & shipped** (all on `main`, deployed to Vercel):

- **3D sculpting (Phase 5):** tap a cube face to add / erase / eyedrop, tap the ground to
  drop a cube; the color + tool dock now shows in 3D too. `editor3d/facePick.ts` isolates the
  world-normal → grid-cell mapping (world Z is negated vs grid Z). Rendering + picking use
  drei `<Instances>`.
- **Glass-box tool:** long-press in 3D summons a translucent cube that slides on the ground
  and climbs onto stacks; release drops a real block. `editor3d/BoxPlacer.tsx` + `worldPos.ts`.
- **Server-side saving — local-first + cloud sync with real accounts:** Clerk auth (Next 16's
  renamed `src/proxy.ts`), Neon Postgres (`characters` table), user-scoped API
  (`app/api/characters`), and a `persistence/{sync,cloudSync,api}.ts` layer that mirrors
  IndexedDB ↔ cloud (last-write-wins, tombstones, **never wipes local**). First sign-in
  uploads a device's local characters to the account. 63 tests; verified against live Neon +
  curl. **Live: 15 characters across 2 accounts already synced — the migration works.**

**Decided:**

- Backend = **Neon** (not Supabase — dodges ~$10/mo per-project fee; free tier fits → $0).
- Auth = **Clerk** (Google + passkeys); local-first sync kept so it still works offline.
- First-login migration is **fully automatic** (no confirm prompt) → sign in as **Brooks
  first** on the shared phone so his characters attach to the right account.
- **Clerk production instance = DEFERRED**, gated on a custom domain. The dev instance is fine
  for ~12 kids (100-user cap, $0). Full upgrade recipe is in `BUILD_PLAN.md` + Claude memory.

**Open / start here next time:**

- **Clerk production** when a domain exists: domain → prod instance + own Google OAuth + DNS +
  swap to `pk_live` → re-key existing Neon rows dev→prod by email so nothing orphans.
- **Shared-device multi-user** hardening (IndexedDB isn't user-scoped).
- Editor fast-follows: **JSON / `.vox` export**, **X-mirror**, **bucket fill**.
- On-device confirm: sign in as Brooks and watch his characters migrate.

**Note:** a parallel session added live orbiting 3D previews to gallery cards (commit
`2788043`: `CharacterPreview.tsx`, `GalleryCard.tsx`) — reconciled into this session cleanly.
