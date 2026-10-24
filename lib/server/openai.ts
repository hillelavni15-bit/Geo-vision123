import "server-only";
import OpenAI from "openai";

let client: OpenAI | null = null;

export class AiNotConfiguredError extends Error {
  constructor() {
    super("OPENAI_API_KEY is not set.");
  }
}

/** Shared OpenAI client. Throws AiNotConfiguredError when no key is set. */
export function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) throw new AiNotConfiguredError();
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, timeout: 60_000, maxRetries: 2 });
  return client;
}

/** Vision model used for photo analysis. */
export const VISION_MODEL = process.env.OPENAI_VISION_MODEL || "gpt-5.4";

/** Parse a JSON object out of a model reply, tolerating code fences and prose. */
export function parseJsonObject(content: string | null | undefined): unknown {
  if (!content?.trim()) return null;
  const cleaned = content.replace(/```(?:json)?/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}
