// One-off cleanup: tombstone every empty (zero-voxel) character in the DB,
// across ALL accounts. Rows predate the "never save empty" guard added to the
// client (appStore.saveCurrent) and server (api/characters isValidRecord).
//
// Soft-deletes (deleted = true, updated_at bumped) rather than hard-deleting,
// so the removal propagates through the normal sync path to every device that
// already pulled a copy — see persistence/sync.ts `reconcile`.
//
// Run with:  node --env-file=.env.local scripts/delete-empty-characters.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (did you use --env-file=.env.local?)");
  process.exit(1);
}
const sql = neon(url);

const [{ count: before }] = await sql`
  select count(*)::int as count
  from characters
  where deleted = false
    and jsonb_array_length(data -> 'voxels') = 0
`;

if (before === 0) {
  console.log("✓ no empty characters found — nothing to do");
  process.exit(0);
}

await sql`
  update characters
  set deleted = true, updated_at = ${Date.now()}
  where deleted = false
    and jsonb_array_length(data -> 'voxels') = 0
`;

console.log(`✓ tombstoned ${before} empty character(s) across all accounts`);
