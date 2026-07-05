import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import {
  listCharacters,
  upsertCharacters,
  type IncomingCharacter,
} from "@/server/db";

/**
 * Sync endpoints for the signed-in user's characters.
 *   GET  /api/characters?since=<ms>  → their records changed at/after `since`
 *   POST /api/characters  { records } → upsert a batch (push)
 * Both require a Clerk session; every query is scoped to the caller's user id,
 * so one account can never read or write another's characters.
 */

const MAX_BATCH = 500;
const MAX_DATA_BYTES = 5_000_000;

export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const sinceRaw = Number(req.nextUrl.searchParams.get("since"));
  const since = Number.isFinite(sinceRaw) && sinceRaw > 0 ? sinceRaw : 0;
  const characters = await listCharacters(userId, since);
  return NextResponse.json({ characters });
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const records = (body as { records?: unknown })?.records;
  if (!Array.isArray(records)) {
    return NextResponse.json({ error: "records[] required" }, { status: 400 });
  }

  const clean = records.filter(isValidRecord).slice(0, MAX_BATCH);
  await upsertCharacters(userId, clean);
  return NextResponse.json({ ok: true, count: clean.length });
}

function isValidRecord(r: unknown): r is IncomingCharacter {
  if (!r || typeof r !== "object") return false;
  const o = r as Record<string, unknown>;
  if (
    typeof o.id !== "string" ||
    o.id.length === 0 ||
    o.id.length > 100 ||
    typeof o.name !== "string" ||
    o.name.length > 200 ||
    typeof o.updatedAt !== "number" ||
    !Number.isFinite(o.updatedAt) ||
    (o.deleted !== undefined && typeof o.deleted !== "boolean") ||
    o.data === null ||
    typeof o.data !== "object" ||
    JSON.stringify(o.data).length > MAX_DATA_BYTES
  ) {
    return false;
  }
  // Never store an empty character. A tombstone (deleted) is exempt: its data is
  // irrelevant — it exists only to propagate the delete to other devices.
  if (o.deleted !== true) {
    const voxels = (o.data as { voxels?: unknown }).voxels;
    if (!Array.isArray(voxels) || voxels.length === 0) return false;
  }
  return true;
}
