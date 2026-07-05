// Verifies the character SQL against live Neon (jsonb round-trip, last-write-wins,
// tombstones, per-user scoping). Run: node --env-file=.env.local scripts/db-smoke.mjs
// Uses throwaway user/char ids and cleans up after itself.
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL);
const U = `smoke_${Date.now()}`;
const OTHER = `smoke_other_${Date.now()}`;
const id = `char_${Date.now()}`;
const data = (n) => ({ format: "voxelos-character", version: 1, name: n, gridSize: { x: 64, y: 64, z: 64 }, voxels: [{ x: 1, y: 2, z: 3, c: 4 }] });

async function upsert(userId, r) {
  await sql`
    insert into characters (id, user_id, name, data, updated_at, created_at, deleted)
    values (${r.id}, ${userId}, ${r.name}, ${JSON.stringify(r.data)}::jsonb, ${r.updatedAt}, ${r.updatedAt}, ${r.deleted ?? false})
    on conflict (id) do update set
      name = excluded.name, data = excluded.data, updated_at = excluded.updated_at, deleted = excluded.deleted
    where characters.user_id = ${userId} and excluded.updated_at >= characters.updated_at`;
}
const list = (userId) =>
  sql`select id, name, data, updated_at, deleted from characters where user_id = ${userId} order by updated_at asc`;

let ok = true;
const check = (label, cond) => { console.log(`${cond ? "✓" : "✗"} ${label}`); ok = ok && cond; };

try {
  await upsert(U, { id, name: "Robot", data: data("Robot"), updatedAt: 1000 });
  let r = (await list(U))[0];
  check("insert + jsonb parsed to object", r?.name === "Robot" && Array.isArray(r?.data?.voxels) && r.data.voxels.length === 1);

  await upsert(U, { id, name: "STALE", data: data("STALE"), updatedAt: 500 });
  r = (await list(U))[0];
  check("stale update (older updatedAt) is rejected", r?.name === "Robot");

  await upsert(U, { id, name: "Robot2", data: data("Robot2"), updatedAt: 2000 });
  r = (await list(U))[0];
  check("newer update wins", r?.name === "Robot2");

  await upsert(U, { id, name: "Robot2", data: data("Robot2"), updatedAt: 3000, deleted: true });
  r = (await list(U))[0];
  check("tombstone sets deleted", r?.deleted === true);

  await upsert(OTHER, { id, name: "HIJACK", data: data("HIJACK"), updatedAt: 9999 });
  r = (await list(U))[0];
  check("another user cannot overwrite this id (scoping)", r?.name === "Robot2");
  check("other user sees nothing", (await list(OTHER)).length === 0);
} finally {
  await sql`delete from characters where user_id in (${U}, ${OTHER})`;
  console.log("cleaned up");
}
process.exit(ok ? 0 : 1);
