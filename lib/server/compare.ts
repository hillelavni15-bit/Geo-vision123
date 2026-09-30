import "server-only";
import type { CompareResult, CompareSide, Confidence } from "@/lib/types";
import { openai, parseJsonObject, VISION_MODEL } from "./openai";

const SYSTEM_PROMPT = `You are a geolocation forensics expert. You get two photos and decide whether they were taken at the same place (or within about 500 m of each other).

Describe each photo on its own, then compare landmarks, architecture, skyline, terrain, vegetation, climate, light, signage, vehicles and infrastructure. Consider whether one photo could have been taken from a spot visible in the other.

Reply with JSON only, in exactly this shape:
{
  "verdict": "same" | "likely-same" | "different" | "uncertain",
  "matchScore": integer 0-100,
  "confidence": "high" | "medium" | "low",
  "reasoning": "2-3 sentences explaining the verdict",
  "photoA": { "description": "what Photo A shows", "landmarks": ["..."] },
  "photoB": { "description": "what Photo B shows", "landmarks": ["..."] },
  "sharedFeatures": ["feature both photos share"],
  "differences": ["notable difference"]
}

matchScore: 90-100 almost certainly the same spot; 70-89 very likely the same area; 50-69 possibly the same city; 30-49 different places in the same region; 0-29 clearly different.`;

const VERDICTS = ["same", "likely-same", "different", "uncertain"] as const;
const CONFIDENCE: Confidence[] = ["high", "medium", "low"];

const strings = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").slice(0, 8) : [];

function side(v: unknown): CompareSide {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  return { description: typeof o.description === "string" ? o.description : "", landmarks: strings(o.landmarks) };
}

export function normalizeCompare(raw: unknown): CompareResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const score = typeof o.matchScore === "number" && Number.isFinite(o.matchScore) ? o.matchScore : 0;
  return {
    verdict: VERDICTS.includes(o.verdict as never) ? (o.verdict as CompareResult["verdict"]) : "uncertain",
    matchScore: Math.max(0, Math.min(100, Math.round(score))),
    confidence: CONFIDENCE.includes(o.confidence as Confidence) ? (o.confidence as Confidence) : "low",
    reasoning: typeof o.reasoning === "string" && o.reasoning.trim() ? o.reasoning : "Unable to reach a confident verdict.",
    photoA: side(o.photoA),
    photoB: side(o.photoB),
    sharedFeatures: strings(o.sharedFeatures),
    differences: strings(o.differences),
  };
}

export async function comparePhotos(a: string, b: string, signal?: AbortSignal): Promise<CompareResult | null> {
  const response = await openai().chat.completions.create(
    {
      model: VISION_MODEL,
      max_completion_tokens: 2000,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Were these two photos taken at the same place? The first is Photo A, the second Photo B." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${a}`, detail: "high" } },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${b}`, detail: "high" } },
          ],
        },
      ],
    },
    { signal },
  );
  return normalizeCompare(parseJsonObject(response.choices[0]?.message?.content));
}
