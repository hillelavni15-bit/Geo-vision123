import "server-only";
import type { VisualProfile } from "@/lib/types";
import { openai, parseJsonObject } from "./openai";

/** A cheaper model is enough for describing visual style. */
const PROFILE_MODEL = process.env.OPENAI_PROFILE_MODEL || "gpt-4o-mini";

const SCENES = ["urban", "coastal", "mountain", "rural", "desert", "forest", "indoor", "other"];
const TIMES = ["day", "golden_hour", "night", "overcast", "dawn", "dusk"];
const SEASONS = ["summer", "winter", "autumn", "spring", "unknown"];
const STYLES = ["baroque", "modern", "colonial", "traditional", "industrial", "other"];

const pick = (v: unknown, allowed: string[], fallback: string) =>
  typeof v === "string" && allowed.includes(v.toLowerCase()) ? v.toLowerCase() : fallback;

/** Describe a photo's look (scene, light, colours, elements) for similarity matching. */
export async function extractVisualProfile(imageBase64: string): Promise<VisualProfile> {
  const response = await openai().chat.completions.create({
    model: PROFILE_MODEL,
    max_completion_tokens: 800,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "Describe a photo's visual characteristics for image-similarity search. Do not name the location. Reply with JSON only.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Reply with exactly:
{
  "sceneType": ${SCENES.map((s) => `"${s}"`).join(" | ")},
  "timeOfDay": ${TIMES.map((s) => `"${s}"`).join(" | ")},
  "season": ${SEASONS.map((s) => `"${s}"`).join(" | ")},
  "dominantColors": ["3-5 colours as #RRGGBB"],
  "elements": ["specific visible things, e.g. wrought iron railing, palm trees, neon signage"],
  "architecturalStyle": ${STYLES.map((s) => `"${s}"`).join(" | ")} | null,
  "atmosphere": "one sentence on mood and feeling"
}`,
          },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}`, detail: "low" } },
        ],
      },
    ],
  });
  const o = (parseJsonObject(response.choices[0]?.message?.content) ?? {}) as Record<string, unknown>;
  const list = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, n) : []);
  return {
    sceneType: pick(o.sceneType, SCENES, "other"),
    timeOfDay: pick(o.timeOfDay, TIMES, "day"),
    season: pick(o.season, SEASONS, "unknown"),
    dominantColors: list(o.dominantColors, 5).filter((c) => /^#[0-9a-f]{6}$/i.test(c)),
    elements: list(o.elements, 12),
    architecturalStyle: o.architecturalStyle ? pick(o.architecturalStyle, STYLES, "other") : null,
    atmosphere: typeof o.atmosphere === "string" ? o.atmosphere : "",
  };
}

/**
 * Encode a profile as a 64-number vector: one-hot scene, time, season and style,
 * RGB of up to five colours, and hashed element names.
 */
export function profileVector(p: VisualProfile): number[] {
  const v = new Array<number>(64).fill(0);
  const hot = (list: string[], value: string | null, offset: number) => {
    const i = value ? list.indexOf(value) : -1;
    if (i >= 0) v[offset + i] = 1;
  };
  hot(SCENES, p.sceneType, 0);
  hot(TIMES, p.timeOfDay, 8);
  hot(SEASONS, p.season, 14);
  hot(STYLES, p.architecturalStyle, 19);
  p.dominantColors.slice(0, 5).forEach((hex, i) => {
    for (let c = 0; c < 3; c++) v[25 + i * 3 + c] = parseInt(hex.slice(1 + c * 2, 3 + c * 2), 16) / 255;
  });
  for (const el of p.elements) {
    let h = 0;
    for (const ch of el.toLowerCase()) h = (Math.imul(h, 31) + ch.charCodeAt(0)) | 0;
    v[40 + (((h % 24) + 24) % 24)] += 1 / p.elements.length;
  }
  return v;
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}
