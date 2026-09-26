import { describe, expect, it } from "vitest";
import { parseLocationGuess } from "@/lib/locate";

const valid = {
  lat: 41.9,
  lon: 12.49,
  country: "Italy",
  region: "Lazio",
  city: "Rome",
  placeName: "Colosseum",
  confidence: "high",
  radiusKm: 1,
  clues: ["אמפיתיאטרון רומי"],
  reasoning: "הקולוסיאום",
};

describe("parseLocationGuess", () => {
  it("parses a valid response", () => {
    expect(parseLocationGuess(JSON.stringify(valid))).toEqual(valid);
  });

  it("rejects out-of-range coordinates", () => {
    expect(() => parseLocationGuess(JSON.stringify({ ...valid, lat: 120 }))).toThrow();
  });

  it("normalises unexpected values", () => {
    const g = parseLocationGuess(JSON.stringify({ ...valid, confidence: "certain", radiusKm: -3, clues: [1, "x"] }));
    expect(g.confidence).toBe("low");
    expect(g.radiusKm).toBe(50);
    expect(g.clues).toEqual(["x"]);
  });

  it("throws on non-JSON", () => {
    expect(() => parseLocationGuess("not json")).toThrow(SyntaxError);
  });
});
