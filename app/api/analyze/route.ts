import { randomUUID } from "node:crypto";
import { after, NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { analyzePhoto } from "@/lib/server/analysis";
import { getGuestId } from "@/lib/server/guest";
import { aiErrorResponse, jsonError } from "@/lib/server/http";
import { canAfford, charge } from "@/lib/server/users";
import { extractVisualProfile, profileVector } from "@/lib/server/visual";
import { SEARCH_COST } from "@/lib/types";

export const maxDuration = 90;

const MAX_IMAGE_CHARS = 8_000_000; // about 6 MB of JPEG
const MAX_THUMBNAIL_CHARS = 300_000;

export async function POST(req: Request) {
  let body: { imageBase64?: unknown; thumbnailDataUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "Invalid request.");
  }
  const { imageBase64, thumbnailDataUrl } = body;
  if (
    typeof imageBase64 !== "string" ||
    imageBase64.length === 0 ||
    imageBase64.length > MAX_IMAGE_CHARS ||
    !imageBase64.startsWith("/9j/") // JPEG signature; the browser always sends JPEG
  ) {
    return jsonError(400, "The image is missing, too large, or not a JPEG.");
  }
  if (
    typeof thumbnailDataUrl !== "string" ||
    !thumbnailDataUrl.startsWith("data:image/jpeg;base64,") ||
    thumbnailDataUrl.length > MAX_THUMBNAIL_CHARS
  ) {
    return jsonError(400, "The thumbnail is missing or too large.");
  }

  const userId = await getGuestId();
  if (!(await canAfford(userId, SEARCH_COST))) {
    return jsonError(402, `You need ${SEARCH_COST} coins for this search.`, { code: "INSUFFICIENT_CREDITS" });
  }

  const id = randomUUID();
  let result;
  try {
    result = await analyzePhoto(id, imageBase64, req.signal);
  } catch (err) {
    return aiErrorResponse(err, "analysis");
  }

  // Charge only after a successful analysis.
  const credits = await charge(userId, SEARCH_COST);

  try {
    await db.insert(schema.analyses).values({
      id,
      userId,
      thumbnailDataUrl,
      result,
      primaryCity: result.primaryMatch.city,
      primaryCountry: result.primaryMatch.country,
      confidence: result.primaryMatch.confidence,
    });
  } catch (err) {
    console.error("saving analysis failed", err);
  }

  // After responding, describe the photo's look so similar photos can be found later.
  if (result.status === "identified") {
    after(async () => {
      try {
        const profile = await extractVisualProfile(imageBase64);
        await db
          .insert(schema.imageFeatures)
          .values({ analysisId: id, userId, profile, vector: profileVector(profile) })
          .onConflictDoNothing();
      } catch (err) {
        console.warn("visual profile failed", err);
      }
    });
  }

  return NextResponse.json({ result, credits });
}
