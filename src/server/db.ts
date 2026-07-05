import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import type { ProjectData } from "@/core/types";

/**
 * Server-side character storage in Neon (Postgres). The `characters` table holds
 * one row per character, owned by a Clerk `user_id`, with the same `ProjectData`
 * the client serializes. `updated_at` (ms epoch) drives last-write-wins; a
 * `deleted` tombstone lets deletes propagate through sync. Schema lives in
 * scripts/db-init.mjs.
 */

let _sql: NeonQueryFunction<false, false> | null = null;
function db() {
  if (!_sql) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL is not set");
    _sql = neon(url);
  }
  return _sql;
}

export type CharacterRow = {
  id: string;
  name: string;
  data: ProjectData;
  updatedAt: number;
  deleted: boolean;
};

export type IncomingCharacter = CharacterRow & { createdAt?: number };

/** A user's characters changed at/after `since` (ms epoch); oldest-change first. */
export async function listCharacters(
  userId: string,
  since = 0,
): Promise<CharacterRow[]> {
  const rows = await db()`
    select id, name, data, updated_at, deleted
    from characters
    where user_id = ${userId} and updated_at >= ${since}
    order by updated_at asc
  `;
  return rows.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    data: r.data as ProjectData,
    updatedAt: Number(r.updated_at),
    deleted: Boolean(r.deleted),
  }));
}

/**
 * Upsert a batch for one user. Scoped so a user can only touch their own rows,
 * and last-write-wins so a stale push can't clobber a newer server copy.
 */
export async function upsertCharacters(
  userId: string,
  records: IncomingCharacter[],
): Promise<void> {
  const sql = db();
  for (const r of records) {
    await sql`
      insert into characters (id, user_id, name, data, updated_at, created_at, deleted)
      values (
        ${r.id}, ${userId}, ${r.name}, ${JSON.stringify(r.data)}::jsonb,
        ${r.updatedAt}, ${r.createdAt ?? r.updatedAt}, ${r.deleted ?? false}
      )
      on conflict (id) do update set
        name = excluded.name,
        data = excluded.data,
        updated_at = excluded.updated_at,
        deleted = excluded.deleted
      where characters.user_id = ${userId}
        and excluded.updated_at >= characters.updated_at
    `;
  }
}
