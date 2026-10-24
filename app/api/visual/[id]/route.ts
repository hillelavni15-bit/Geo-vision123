import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getGuestId } from "@/lib/server/guest";
import { jsonError } from "@/lib/server/http";
import { cosine } from "@/lib/server/visual";
import type { VisualMatches, VisualProfile } from "@/lib/types";

const SIMILARITY_THRESHOLD = 0.55;

/** The visual profile of one of your analyses, and your past photos that look similar. */
export async function GET(_req: Request, ctx: RouteContext<"/api/visual/[id]">) {
  const { id } = await ctx.params;
  try {
    const userId = await getGuestId();
    const [own] = await db
      .select()
      .from(schema.imageFeatures)
      .where(and(eq(schema.imageFeatures.analysisId, id), eq(schema.imageFeatures.userId, userId)));
    if (!own) return NextResponse.json({ ready: false, profile: null, similar: [] } satisfies VisualMatches);

    const others = await db
      .select()
      .from(schema.imageFeatures)
      .where(and(eq(schema.imageFeatures.userId, userId), ne(schema.imageFeatures.analysisId, id)))
      .orderBy(desc(schema.imageFeatures.createdAt))
      .limit(500);

    const scored = others
      .map((f) => ({ id: f.analysisId, score: cosine(own.vector as number[], f.vector as number[]) }))
      .filter((s) => s.score > SIMILARITY_THRESHOLD)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    const rows = scored.length
      ? await db.select().from(schema.analyses).where(inArray(schema.analyses.id, scored.map((s) => s.id)))
      : [];
    const byId = new Map(rows.map((r) => [r.id, r]));

    return NextResponse.json({
      ready: true,
      profile: own.profile as VisualProfile,
      similar: scored
        .filter((s) => byId.has(s.id))
        .map((s) => {
          const r = byId.get(s.id)!;
          return {
            analysisId: s.id,
            place: [r.primaryCity, r.primaryCountry].filter(Boolean).join(", "),
            thumbnailDataUrl: r.thumbnailDataUrl,
            similarityPct: Math.round(s.score * 100),
          };
        }),
    } satisfies VisualMatches);
  } catch (err) {
    console.error("visual matches failed", err);
    return jsonError(503, "Visual matches are temporarily unavailable.");
  }
}
