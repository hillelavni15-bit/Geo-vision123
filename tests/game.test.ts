import { describe, expect, it } from "vitest";
import { evaluateGuess, LANDMARKS, MAX_ROUND_SCORE, pickRandom, roundFromWikiSummary, scoreForDistance } from "@/lib/game";

describe("scoreForDistance", () => {
  it("gives full score for an exact guess", () => {
    expect(scoreForDistance(0)).toBe(MAX_ROUND_SCORE);
  });

  it("decreases with distance", () => {
    expect(scoreForDistance(100)).toBeGreaterThan(scoreForDistance(1000));
    expect(scoreForDistance(1000)).toBeGreaterThan(scoreForDistance(5000));
    expect(scoreForDistance(20000)).toBeLessThan(5);
  });

  it("rejects invalid input", () => {
    expect(scoreForDistance(-1)).toBe(0);
    expect(scoreForDistance(NaN)).toBe(0);
  });
});

describe("evaluateGuess", () => {
  it("scores a guess against the answer", () => {
    const round = { imageUrl: "x", title: "Eiffel Tower", answer: { lat: 48.8584, lon: 2.2945 } };
    const r = evaluateGuess(round, { lat: 48.8566, lon: 2.3522 });
    expect(r.distanceKm).toBeLessThan(5);
    expect(r.score).toBeGreaterThanOrEqual(4980);
  });
});

describe("pickRandom", () => {
  it("returns distinct items without mutating the input", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const picked = pickRandom(input, 4);
    expect(picked).toHaveLength(4);
    expect(new Set(picked).size).toBe(4);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("has no duplicate landmarks", () => {
    expect(new Set(LANDMARKS).size).toBe(LANDMARKS.length);
  });
});

describe("roundFromWikiSummary", () => {
  it("builds a round and upsizes the thumbnail", () => {
    const round = roundFromWikiSummary({
      title: "Masada",
      coordinates: { lat: 31.3156, lon: 35.3536 },
      thumbnail: { source: "https://upload.wikimedia.org/a/b/320px-Masada.jpg" },
    });
    expect(round?.imageUrl).toBe("https://upload.wikimedia.org/a/b/1280px-Masada.jpg");
    expect(round?.answer).toEqual({ lat: 31.3156, lon: 35.3536 });
  });

  it("skips pages without coordinates or images", () => {
    expect(roundFromWikiSummary({ title: "X", thumbnail: { source: "a" } })).toBeNull();
    expect(roundFromWikiSummary({ title: "X", coordinates: { lat: 1, lon: 1 } })).toBeNull();
  });
});
