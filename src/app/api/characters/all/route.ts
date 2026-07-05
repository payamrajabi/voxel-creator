import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { listAllCharacters } from "@/server/db";

/**
 * Public gallery feed for "All Characters": every maker's characters, newest
 * first. Requires a Clerk session (the whole app is gated behind sign-in) but is
 * intentionally NOT user-scoped — there are no privacy settings, so any signed-in
 * user sees everyone's characters. Read-only; creating and editing still go
 * through the user-scoped POST /api/characters.
 */
export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const characters = await listAllCharacters();
  return NextResponse.json({ characters });
}
