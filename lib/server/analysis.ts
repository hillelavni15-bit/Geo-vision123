import "server-only";
import type { AnalysisResult, Confidence, LocationMatch } from "@/lib/types";
import { openai, parseJsonObject, VISION_MODEL } from "./openai";

export const UNKNOWN_GUIDANCE =
  "We couldn't confidently identify where this photo was taken. Try a clearer photo, one showing recognizable landmarks, signs, architecture, or natural surroundings.";

const SYSTEM_PROMPT = `You are a world-class geolocation analyst. Work out where a photo was taken using only evidence visible in it.

Look for:
- Landmarks, monuments, distinctive skylines and famous buildings
- Text: street signs, shop names, billboards, number plates, and the language and script used
- Architecture: building age, materials, roof shapes, windows and facade details
- Roads: markings, sign shapes and colours, driving side, bollards and poles
- Nature: mountains, coastline, rock, soil colour, plant species, climate and season
- Culture: flags, clothing, vehicles sold in the region, utility and antenna styles

Aim for city-level precision when the evidence allows it. Only claim a location that concrete visual evidence supports. If the photo is generic, blurry, indoor, or could be almost anywhere, report the location as unknown: a confident wrong answer is worse than an honest "unknown".

Reply with JSON only.`;

const USER_PROMPT = `Where was this photo taken? Give up to 3 candidate locations, most likely first.

Reply with exactly this JSON shape:
{
  "status": "identified" | "unknown",
  "primaryMatch": {
    "city": string | null,
    "region": string | null,
    "country": string,
    "confidence": "high" | "medium" | "low",
    "explanation": "2-3 sentences naming the visual evidence behind this answer",
    "clues": ["specific visual clue", ...],
    "latitude": number | null,
    "longitude": number | null
  },
  "matches": [ same shape as primaryMatch, primaryMatch first ]
}

Rules:
- "identified" only when concrete evidence names a real country. Otherwise "unknown".
- For "unknown": country "Unknown", city/region/latitude/longitude null, confidence "low", matches empty.
- List 3 to 8 specific clues for an identified primary match.
- Confidence: high above 80% sure, medium 40-80%, low below 40%.
- Coordinates are the city centre when known, else null. Never invent coordinates for a place you cannot name.`;

const CONFIDENCE: Confidence[] = ["high", "medium", "low"];

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

function coord(v: unknown, limit: number): number | null {
  return typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= limit ? v : null;
}

function isUnknownCountry(country: string | null): boolean {
  return !country || ["unknown", "unidentified", "n/a", "none", "null", "location unknown"].includes(country.toLowerCase());
}

function normalizeMatch(raw: unknown): LocationMatch {
  const m = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const latitude = coord(m.latitude, 90);
  const longitude = coord(m.longitude, 180);
  const hasPair = latitude !== null && longitude !== null;
  return {
    city: str(m.city),
    region: str(m.region),
    country: str(m.country) ?? "",
    confidence: CONFIDENCE.includes(m.confidence as Confidence) ? (m.confidence as Confidence) : "low",
    explanation: str(m.explanation) ?? "",
    clues: Array.isArray(m.clues) ? m.clues.map(str).filter((c): c is string => c !== null).slice(0, 8) : [],
    latitude: hasPair ? latitude : null,
    longitude: hasPair ? longitude : null,
  };
}

function unknownResult(id: string): AnalysisResult {
  const primary: LocationMatch = {
    city: null,
    region: null,
    country: "Unknown",
    confidence: "low",
    explanation: UNKNOWN_GUIDANCE,
    clues: [],
    latitude: null,
    longitude: null,
  };
  return { id, status: "unknown", primaryMatch: primary, matches: [primary], guidance: UNKNOWN_GUIDANCE };
}

/** Validate the model's reply. Anything unusable becomes an explicit "unknown" result. */
export function normalizeAnalysis(id: string, raw: unknown): AnalysisResult {
  if (!raw || typeof raw !== "object") return unknownResult(id);
  const obj = raw as Record<string, unknown>;
  const primary = normalizeMatch(obj.primaryMatch);
  if (obj.status === "unknown" || isUnknownCountry(primary.country)) return unknownResult(id);

  const alternates = (Array.isArray(obj.matches) ? obj.matches : [])
    .map(normalizeMatch)
    .filter((m) => !isUnknownCountry(m.country))
    .filter((m) => !(m.city === primary.city && m.country === primary.country && m.region === primary.region));

  return {
    id,
    status: "identified",
    primaryMatch: primary,
    matches: [primary, ...alternates].slice(0, 3),
    guidance: null,
  };
}

/** Ask the vision model where the photo was taken. */
export async function analyzePhoto(
  id: string,
  imageBase64: string,
  signal?: AbortSignal,
): Promise<AnalysisResult> {
  const response = await openai().chat.completions.create(
    {
      model: VISION_MODEL,
      max_completion_tokens: 3000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: USER_PROMPT },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "high" } },
          ],
        },
      ],
    },
    { signal },
  );
  return normalizeAnalysis(id, parseJsonObject(response.choices[0]?.message?.content));
}
