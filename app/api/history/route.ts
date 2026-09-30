import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { getGuestId } from "@/lib/server/guest";
import { jsonError } from "@/lib/server/http";
import { ensureUser } from "@/lib/server/users";
import type { AnalysisResult, Confidence, HistoryItem } from "@/lib/types";

const FREE_LIMIT = 5;
const PRO_LIMIT = 50;

export async function GET() {
  try {
    const userId = await getGuestId();
    const user = await ensureUser(userId);
    const rows = await db
      .select()
      .from(schema.analyses)
      .where(eq(schema.analyses.userId, userId))
      .orderBy(desc(schema.analyses.createdAt))
      .limit(user.isPro ? PRO_LIMIT : FREE_LIMIT);

    const items: HistoryItem[] = rows.map((r) => ({
      id: r.id,
      thumbnailDataUrl: r.thumbnailDataUrl,
      result: r.result as AnalysisResult,
      primaryCity: r.primaryCity,
      primaryCountry: r.primaryCountry,
      confidence: r.confidence as Confidence,
      createdAt: r.createdAt.toISOString(),
    }));
    return NextResponse.json({ items, limited: !user.isPro, limit: user.isPro ? PRO_LIMIT : FREE_LIMIT });
  } catch (err) {
    console.error("history failed", err);
    return jsonError(503, "History is temporarily unavailable.");
  }
}
