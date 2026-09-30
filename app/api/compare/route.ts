import { NextResponse } from "next/server";
import { comparePhotos } from "@/lib/server/compare";
import { getGuestId } from "@/lib/server/guest";
import { aiErrorResponse, jsonError } from "@/lib/server/http";
import { canAfford, charge } from "@/lib/server/users";
import { SEARCH_COST } from "@/lib/types";

export const maxDuration = 90;

const MAX_IMAGE_CHARS = 8_000_000;
const isJpeg = (v: unknown): v is string => typeof v === "string" && v.startsWith("/9j/") && v.length <= MAX_IMAGE_CHARS;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { imageA?: unknown; imageB?: unknown } | null;
  if (!isJpeg(body?.imageA) || !isJpeg(body?.imageB)) {
    return jsonError(400, "Both photos are required, as JPEG images under the size limit.");
  }

  const userId = await getGuestId();
  if (!(await canAfford(userId, SEARCH_COST))) {
    return jsonError(402, `You need ${SEARCH_COST} coins for this comparison.`, { code: "INSUFFICIENT_CREDITS" });
  }

  try {
    const result = await comparePhotos(body.imageA, body.imageB, req.signal);
    if (!result) return jsonError(502, "The AI reply couldn't be read. Please try again. You were not charged.");
    const credits = await charge(userId, SEARCH_COST);
    return NextResponse.json({ result, credits });
  } catch (err) {
    return aiErrorResponse(err, "comparison");
  }
}
