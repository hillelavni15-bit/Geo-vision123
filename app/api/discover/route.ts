import { NextResponse } from "next/server";
import { discoverPlaces, NoPlacesFoundError } from "@/lib/server/discover";
import { getGuestId } from "@/lib/server/guest";
import { aiErrorResponse, jsonError } from "@/lib/server/http";
import { canAfford, charge, ensureUser } from "@/lib/server/users";
import { SEARCH_COST } from "@/lib/types";

export const maxDuration = 90;

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { location?: unknown; description?: unknown } | null;
  const location = typeof body?.location === "string" ? body.location.trim() : "";
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (!location || !description) return jsonError(400, "Enter a location and a description.");
  if (location.length > 120 || description.length > 400) return jsonError(400, "The search is too long.");

  const userId = await getGuestId();
  if (!(await canAfford(userId, SEARCH_COST))) {
    return jsonError(402, `You need ${SEARCH_COST} coins for this search.`, { code: "INSUFFICIENT_CREDITS" });
  }
  const user = await ensureUser(userId);

  try {
    const result = await discoverPlaces(location, description, { withPhotos: user.isPro, signal: req.signal });
    const credits = await charge(userId, SEARCH_COST);
    return NextResponse.json({ result, credits });
  } catch (err) {
    if (err instanceof NoPlacesFoundError) {
      return jsonError(422, "No matching places were found. Try rephrasing your search. You were not charged.");
    }
    return aiErrorResponse(err, "search");
  }
}
