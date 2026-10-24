import { NextResponse } from "next/server";
import { jsonError } from "@/lib/server/http";
import { commonsPhotos } from "@/lib/server/wikimedia";

/** Freely licensed photos of a named place from Wikimedia Commons. */
export async function GET(req: Request) {
  const location = new URL(req.url).searchParams.get("location")?.trim() ?? "";
  if (!location || location.length > 120 || /^(unknown|location unknown)$/i.test(location)) {
    return jsonError(400, "A known location is required.");
  }
  const images = await commonsPhotos(location, 8);
  return NextResponse.json({ images }, { headers: { "Cache-Control": "public, max-age=86400" } });
}
