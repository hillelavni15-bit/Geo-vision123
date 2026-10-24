import "server-only";
import { haversineKm } from "@/lib/geo";
import type { DiscoverPlace, DiscoverResult } from "@/lib/types";
import { fetchJson, mapLimit } from "./fetch-json";
import { openai, parseJsonObject, VISION_MODEL } from "./openai";
import { wikipediaPhoto } from "./wikimedia";

const PLACE_TYPES = [
  "landmark",
  "park",
  "street",
  "historic",
  "nature",
  "cafe",
  "market",
  "viewpoint",
  "neighborhood",
  "waterfront",
  "other",
];

const SYSTEM_PROMPT = `You are a location scout with deep knowledge of real places worldwide. Given an area and a mood, recommend real, specific places inside that area that match.

- Only real places that exist on a map. Never invent places.
- Every place must be inside the requested area, never a same-named place elsewhere.
- Use the official name as it appears on OpenStreetMap or Google Maps, not a nickname.
- Mix famous landmarks with lesser-known local spots.
Reply with JSON only.`;

function userPrompt(location: string, description: string) {
  return `Area: "${location}"
Looking for: "${description}"

Return 12-15 places, best matches first, in exactly this JSON shape:
{
  "locationName": "full name of the area, e.g. Paris, Île-de-France, France",
  "centerLat": number,
  "centerLng": number,
  "places": [
    {
      "name": "map-searchable place name",
      "address": "short address or district",
      "latitude": number,
      "longitude": number,
      "description": "2-3 vivid sentences on why it matches and what it looks and feels like",
      "matchScore": integer 0-100 (80+ excellent, 50-79 good, below 50 partial),
      "placeType": one of ${PLACE_TYPES.join(", ")},
      "moodTags": ["2-5 short evocative tags, e.g. cinematic, golden hour, cobblestone"]
    }
  ]
}`;
}

interface AiPlace {
  name?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  description?: unknown;
  matchScore?: unknown;
  placeType?: unknown;
  moodTags?: unknown;
}

interface AiReply {
  locationName?: unknown;
  centerLat?: unknown;
  centerLng?: unknown;
  places?: AiPlace[];
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const text = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/** Geocode the searched area with Nominatim: a centre plus a radius sized to the area. */
async function geocodeArea(location: string) {
  const hits = await fetchJson<{ lat: string; lon: string; display_name: string; boundingbox?: string[] }[]>(
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(location)}`,
  );
  const hit = hits?.[0];
  if (!hit) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  let radiusKm = 50;
  const box = hit.boundingbox?.map(Number);
  if (box?.length === 4 && box.every(Number.isFinite)) {
    const [south, north, west, east] = box;
    radiusKm = Math.max((haversineKm(south, west, north, east) / 2) * 1.4, 15);
  }
  return { lat, lng, name: hit.display_name, radiusKm };
}

/** Geocode one place with Photon, biased toward the area's centre. */
async function geocodePlace(query: string, lat: number, lng: number) {
  const data = await fetchJson<{ features?: { geometry?: { coordinates?: [number, number] } }[] }>(
    `https://photon.komoot.io/api/?limit=1&lat=${lat}&lon=${lng}&q=${encodeURIComponent(query)}`,
    5000,
  );
  const coords = data?.features?.[0]?.geometry?.coordinates;
  if (!coords || !Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return null;
  return { lat: coords[1], lng: coords[0] };
}

export class NoPlacesFoundError extends Error {}

/**
 * Find real places matching a mood. The model proposes names; geocoders provide
 * the pins, because model coordinates are often slightly wrong.
 */
export async function discoverPlaces(
  location: string,
  description: string,
  options: { withPhotos: boolean; signal?: AbortSignal },
): Promise<DiscoverResult> {
  const [reply, area] = await Promise.all([
    openai()
      .chat.completions.create(
        {
          model: VISION_MODEL,
          max_completion_tokens: 4000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt(location, description) },
          ],
        },
        { signal: options.signal },
      )
      .then((r) => parseJsonObject(r.choices[0]?.message?.content) as AiReply | null),
    geocodeArea(location),
  ]);

  const candidates = (reply?.places ?? []).filter((p) => text(p?.name) && num(p?.latitude) !== null && num(p?.longitude) !== null);
  if (!candidates.length) throw new NoPlacesFoundError();

  const locationName = area?.name ?? text(reply?.locationName) ?? location;
  const centerLat = area?.lat ?? num(reply?.centerLat) ?? (candidates[0].latitude as number);
  const centerLng = area?.lng ?? num(reply?.centerLng) ?? (candidates[0].longitude as number);
  const radiusKm = area?.radiusKm ?? 300;
  const context = locationName.split(",").slice(0, 2).join(",").trim();

  // Nominatim allows about one request a second, so it is used once for the area;
  // Photon handles the per-place lookups in small parallel batches.
  const pins = await mapLimit(candidates, 6, (p) => geocodePlace(`${text(p.name)}, ${context}`, centerLat, centerLng));

  const places: DiscoverPlace[] = [];
  candidates.forEach((p, i) => {
    const name = text(p.name)!;
    let lat = p.latitude as number;
    let lng = p.longitude as number;
    const pin = pins[i];
    const pinTrusted = pin !== null && haversineKm(centerLat, centerLng, pin.lat, pin.lng) <= radiusKm;
    if (pinTrusted) {
      lat = pin.lat;
      lng = pin.lng;
    }
    const distanceKm = haversineKm(centerLat, centerLng, lat, lng);
    // Neither the geocoder nor the model puts it anywhere near the area: likely made up.
    if (!pinTrusted && distanceKm > radiusKm * 2.5) return;

    const type = text(p.placeType)?.toLowerCase() ?? "other";
    places.push({
      id: `${i}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name,
      address: text(p.address) ?? context,
      latitude: lat,
      longitude: lng,
      description: text(p.description) ?? `A place in ${context} matching your search.`,
      matchScore: Math.max(0, Math.min(100, Math.round(num(p.matchScore) ?? 50))),
      placeType: PLACE_TYPES.includes(type) ? type : "other",
      moodTags: Array.isArray(p.moodTags) ? p.moodTags.map(text).filter((t): t is string => t !== null).slice(0, 5) : [],
      distanceKm: Math.round(distanceKm * 100) / 100,
      imageUrl: null,
      photoLocked: false,
    });
  });
  if (!places.length) throw new NoPlacesFoundError();

  places.sort((a, b) => b.matchScore - a.matchScore);
  const top = places.slice(0, 15);

  // Real photos for the best ten, looked up in parallel. Only Pro members receive them.
  const photos = await Promise.all(top.slice(0, 10).map((p) => wikipediaPhoto(p.name).catch(() => null)));
  photos.forEach((url, i) => {
    if (!url) return;
    if (options.withPhotos) top[i].imageUrl = url;
    else top[i].photoLocked = true;
  });

  return { locationName, centerLat, centerLng, places: top };
}
