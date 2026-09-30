export type Confidence = "high" | "medium" | "low";

export interface LocationMatch {
  city: string | null;
  region: string | null;
  country: string;
  confidence: Confidence;
  explanation: string;
  clues: string[];
  latitude: number | null;
  longitude: number | null;
}

export interface AnalysisResult {
  id: string;
  status: "identified" | "unknown";
  primaryMatch: LocationMatch;
  /** The primary match first, then alternatives. */
  matches: LocationMatch[];
  /** Advice shown when the location is unknown. */
  guidance: string | null;
}

export interface HistoryItem {
  id: string;
  thumbnailDataUrl: string;
  result: AnalysisResult;
  primaryCity: string | null;
  primaryCountry: string;
  confidence: Confidence;
  createdAt: string;
}

export interface Me {
  credits: number;
  unlimited: boolean;
  isPro: boolean;
  displayName: string | null;
}

export const SEARCH_COST = 20;

export interface WebImage {
  title: string;
  thumbUrl: string;
  /** The Commons page with full size and licence details. */
  pageUrl: string;
  description: string;
  attribution: string;
}

export interface DiscoverPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  description: string;
  matchScore: number;
  placeType: string;
  moodTags: string[];
  distanceKm: number;
  /** Photo URL, only sent to Pro members. */
  imageUrl: string | null;
  /** True when a photo exists but is reserved for Pro. */
  photoLocked: boolean;
}

export interface DiscoverResult {
  locationName: string;
  centerLat: number;
  centerLng: number;
  places: DiscoverPlace[];
}

export interface CompareSide {
  description: string;
  landmarks: string[];
}

export interface CompareResult {
  verdict: "same" | "likely-same" | "different" | "uncertain";
  matchScore: number;
  confidence: Confidence;
  reasoning: string;
  photoA: CompareSide;
  photoB: CompareSide;
  sharedFeatures: string[];
  differences: string[];
}

export interface VisualProfile {
  sceneType: string;
  timeOfDay: string;
  season: string;
  dominantColors: string[];
  elements: string[];
  architecturalStyle: string | null;
  atmosphere: string;
}

export interface SimilarPhoto {
  analysisId: string;
  place: string;
  thumbnailDataUrl: string;
  similarityPct: number;
}

export interface VisualMatches {
  /** False while the visual profile is still being extracted. */
  ready: boolean;
  profile: VisualProfile | null;
  similar: SimilarPhoto[];
}

export function placeLabel(m: Pick<LocationMatch, "city" | "region" | "country">): string {
  return [m.city, m.region, m.country].filter(Boolean).join(", ");
}
