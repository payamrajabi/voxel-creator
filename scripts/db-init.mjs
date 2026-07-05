// One-off schema setup. Run with:  node --env-file=.env.local scripts/db-init.mjs
// Safe to re-run (CREATE ... IF NOT EXISTS).
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set (did you use --env-file=.env.local?)");
  process.exit(1);
}
const sql = neon(url);

await sql`
  create table if not exists characters (
    id          text primary key,
    user_id     text not null,
    name        text not null,
    data        jsonb not null,
    updated_at  bigint not null,
    created_at  bigint not null,
    deleted     boolean not null default false
  )
`;
await sql`
  create index if not exists characters_user_updated
  on characters (user_id, updated_at)
`;

const [{ count }] = await sql`select count(*)::int as count from characters`;
console.log(`✓ characters table ready (${count} rows)`);
