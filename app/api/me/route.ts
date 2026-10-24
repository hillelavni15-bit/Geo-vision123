import { NextResponse } from "next/server";
import { getGuestId } from "@/lib/server/guest";
import { getMe } from "@/lib/server/users";
import { jsonError } from "@/lib/server/http";

export async function GET() {
  try {
    return NextResponse.json(await getMe(await getGuestId()));
  } catch (err) {
    console.error("me failed", err);
    return jsonError(503, "Your account is temporarily unavailable.");
  }
}
