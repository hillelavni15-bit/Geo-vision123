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

export function placeLabel(m: Pick<LocationMatch, "city" | "region" | "country">): string {
  return [m.city, m.region, m.country].filter(Boolean).join(", ");
}
