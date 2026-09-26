import { isValidLatLon } from "./geo";

/** What the AI returns when asked where a photo was taken. */
export interface LocationGuess {
  lat: number;
  lon: number;
  country: string;
  region: string;
  city: string;
  placeName: string;
  confidence: "high" | "medium" | "low";
  radiusKm: number;
  clues: string[];
  reasoning: string;
}

export const LOCATION_GUESS_SCHEMA = {
  type: "object",
  properties: {
    lat: { type: "number", description: "Latitude of the best guess, decimal degrees" },
    lon: { type: "number", description: "Longitude of the best guess, decimal degrees" },
    country: { type: "string" },
    region: { type: "string", description: "State / province / district, or empty" },
    city: { type: "string", description: "City or nearest town, or empty" },
    placeName: { type: "string", description: "Specific landmark or street if identifiable, else empty" },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    radiusKm: { type: "number", description: "Rough uncertainty radius around the guess, km" },
    clues: {
      type: "array",
      items: { type: "string" },
      description: "Visual clues used (signs, script, architecture, vegetation, road markings...)",
    },
    reasoning: { type: "string", description: "Short explanation of how the clues lead to the guess" },
  },
  required: ["lat", "lon", "country", "region", "city", "placeName", "confidence", "radiusKm", "clues", "reasoning"],
  additionalProperties: false,
} as const;

export function parseLocationGuess(text: string): LocationGuess {
  const raw = JSON.parse(text) as Partial<LocationGuess>;
  if (!isValidLatLon({ lat: raw.lat, lon: raw.lon })) {
    throw new Error("Model returned invalid coordinates");
  }
  const confidence = raw.confidence === "high" || raw.confidence === "medium" ? raw.confidence : "low";
  return {
    lat: raw.lat as number,
    lon: raw.lon as number,
    country: raw.country ?? "",
    region: raw.region ?? "",
    city: raw.city ?? "",
    placeName: raw.placeName ?? "",
    confidence,
    radiusKm: typeof raw.radiusKm === "number" && raw.radiusKm > 0 ? raw.radiusKm : 50,
    clues: Array.isArray(raw.clues) ? raw.clues.filter((c) => typeof c === "string") : [],
    reasoning: raw.reasoning ?? "",
  };
}
