import { haversineKm, isValidLatLon, type LatLon } from "./geo";

export const MAX_ROUND_SCORE = 5000;
export const ROUNDS_PER_GAME = 5;

/** GeoGuessr-style scoring: 5000 for a perfect guess, decaying exponentially with distance. */
export function scoreForDistance(km: number, scaleKm = 2000): number {
  if (!Number.isFinite(km) || km < 0) return 0;
  if (km < 0.05) return MAX_ROUND_SCORE;
  return Math.round(MAX_ROUND_SCORE * Math.exp(-km / scaleKm));
}

export interface GameRound {
  imageUrl: string;
  answer: LatLon;
  title: string;
  description?: string;
  pageUrl?: string;
}

export interface RoundResult {
  round: GameRound;
  guess: LatLon;
  distanceKm: number;
  score: number;
}

export function evaluateGuess(round: GameRound, guess: LatLon): RoundResult {
  const distanceKm = haversineKm(guess, round.answer);
  return { round, guess, distanceKm, score: scoreForDistance(distanceKm) };
}

// English Wikipedia article titles of well-known places. Coordinates and photos
// come from the Wikipedia REST API at play time.
export const LANDMARKS = [
  "Western_Wall", "Masada", "Bahá'í_World_Centre_buildings", "Dead_Sea", "Old_Jaffa",
  "Eiffel_Tower", "Colosseum", "Sagrada_Família", "Big_Ben", "Neuschwanstein_Castle",
  "Acropolis_of_Athens", "Santorini", "Matterhorn", "Leaning_Tower_of_Pisa", "Brandenburg_Gate",
  "Charles_Bridge", "Hallgrímskirkja", "Saint_Basil's_Cathedral", "Hagia_Sophia", "Petra",
  "Giza_pyramid_complex", "Burj_Khalifa", "Taj_Mahal", "Great_Wall_of_China", "Mount_Fuji",
  "Angkor_Wat", "Marina_Bay_Sands", "Petronas_Towers", "Sydney_Opera_House", "Uluru",
  "Milford_Sound", "Statue_of_Liberty", "Golden_Gate_Bridge", "Grand_Canyon", "Niagara_Falls",
  "CN_Tower", "Chichen_Itza", "Machu_Picchu", "Christ_the_Redeemer_(statue)", "Iguazu_Falls",
  "Perito_Moreno_Glacier", "Table_Mountain", "Victoria_Falls", "Mount_Kilimanjaro", "Moai",
  "Stonehenge", "Alhambra", "Mont-Saint-Michel", "Potala_Palace", "Borobudur",
] as const;

export function pickRandom<T>(items: readonly T[], count: number, random = Math.random): T[] {
  const pool = [...items];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count);
}

interface WikiSummary {
  title?: string;
  description?: string;
  coordinates?: { lat: number; lon: number };
  originalimage?: { source: string; width: number; height: number };
  thumbnail?: { source: string };
  content_urls?: { desktop?: { page?: string } };
}

export function roundFromWikiSummary(s: WikiSummary): GameRound | null {
  const answer = s.coordinates ? { lat: s.coordinates.lat, lon: s.coordinates.lon } : null;
  // Prefer a large thumbnail over the original (originals can be 20+ MB).
  const image = s.thumbnail?.source?.replace(/\/\d+px-/, "/1280px-") ?? s.originalimage?.source;
  if (!isValidLatLon(answer) || !image || !s.title) return null;
  return {
    imageUrl: image,
    answer,
    title: s.title,
    description: s.description,
    pageUrl: s.content_urls?.desktop?.page,
  };
}

export async function fetchLandmarkRound(title: string): Promise<GameRound | null> {
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`);
  if (!res.ok) return null;
  return roundFromWikiSummary((await res.json()) as WikiSummary);
}

/** Build a game from random landmarks, skipping any that lack a photo or coordinates. */
export async function buildLandmarkGame(rounds = ROUNDS_PER_GAME): Promise<GameRound[]> {
  const candidates = pickRandom(LANDMARKS, Math.min(LANDMARKS.length, rounds * 2));
  const results = await Promise.all(candidates.map((t) => fetchLandmarkRound(t).catch(() => null)));
  return results.filter((r): r is GameRound => r !== null).slice(0, rounds);
}
