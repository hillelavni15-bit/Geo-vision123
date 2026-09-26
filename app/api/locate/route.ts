import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { LOCATION_GUESS_SCHEMA, parseLocationGuess } from "@/lib/locate";

export const runtime = "nodejs";
export const maxDuration = 120;

const MODEL = "claude-opus-5";
const MAX_IMAGE_BASE64_CHARS = 7_000_000; // ~5 MB decoded
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedType = (typeof ALLOWED_TYPES)[number];

const SYSTEM_PROMPT = `You are an expert geolocation analyst, like a top GeoGuessr player.
Given a single photo, work out where on Earth it was most likely taken.
Look for: text and language/script on signs, license plates, road markings and signage style,
driving side, bollards and utility poles, architecture, vegetation and climate, terrain, sun angle,
and any recognisable landmarks. Always commit to one best-guess coordinate, even when unsure,
and reflect your uncertainty in "confidence" and "radiusKm".
Write "clues" and "reasoning" in Hebrew. Keep place names in their common form.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    return NextResponse.json(
      { error: "חסר מפתח API. הגדירו ANTHROPIC_API_KEY בקובץ ‎.env.local‎ והפעילו מחדש את השרת." },
      { status: 500 },
    );
  }

  let body: { data?: unknown; mediaType?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "בקשה לא תקינה" }, { status: 400 });
  }

  const { data, mediaType } = body;
  if (typeof data !== "string" || data.length === 0 || data.length > MAX_IMAGE_BASE64_CHARS) {
    return NextResponse.json({ error: "התמונה חסרה או גדולה מדי" }, { status: 400 });
  }
  if (typeof mediaType !== "string" || !ALLOWED_TYPES.includes(mediaType as AllowedType)) {
    return NextResponse.json({ error: "סוג קובץ לא נתמך" }, { status: 400 });
  }

  const client = new Anthropic();

  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: { type: "json_schema", schema: LOCATION_GUESS_SCHEMA } },
      // If the model declines, the API retries on Anthropic's recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as AllowedType, data } },
            { type: "text", text: "Where was this photo taken?" },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return NextResponse.json({ error: "המודל סירב לנתח את התמונה הזו." }, { status: 422 });
    }
    if (response.stop_reason === "max_tokens") {
      return NextResponse.json({ error: "התשובה נקטעה. נסו שוב." }, { status: 502 });
    }

    const text = response.content
      .filter((b): b is Extract<typeof b, { type: "text" }> => b.type === "text")
      .map((b) => b.text)
      .join("");

    return NextResponse.json({ guess: parseLocationGuess(text), model: response.model });
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "מפתח ה-API לא תקין." }, { status: 500 });
    }
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "יותר מדי בקשות. נסו שוב בעוד רגע." }, { status: 429 });
    }
    if (err instanceof Anthropic.BadRequestError) {
      console.error("locate rejected", err.message);
      return NextResponse.json({ error: "שירות ה-AI דחה את הבקשה. נסו תמונה אחרת." }, { status: 400 });
    }
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json({ error: "שירות ה-AI אינו זמין כרגע." }, { status: 502 });
    }
    if (err instanceof SyntaxError || err instanceof Error) {
      console.error("locate failed", err);
      return NextResponse.json({ error: "לא הצלחנו לפענח את תשובת המודל." }, { status: 502 });
    }
    throw err;
  }
}
