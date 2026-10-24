import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import type { Me } from "@/lib/types";

/** Unlimited in development, or when UNLIMITED_COINS=true (useful while testing a deployment). */
export const UNLIMITED_COINS = process.env.NODE_ENV !== "production" || process.env.UNLIMITED_COINS === "true";

export async function ensureUser(id: string) {
  await db.insert(schema.users).values({ id }).onConflictDoNothing();
  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  return user;
}

export async function getMe(id: string): Promise<Me> {
  const user = await ensureUser(id);
  return {
    credits: user.credits,
    unlimited: UNLIMITED_COINS,
    isPro: user.isPro,
    displayName: user.displayName,
  };
}

/** True when the user may run a paid action right now. */
export async function canAfford(id: string, amount: number): Promise<boolean> {
  if (UNLIMITED_COINS) return true;
  const user = await ensureUser(id);
  return user.isPro || user.credits >= amount;
}

/**
 * Deduct coins after a successful paid action. Atomic: never goes below zero.
 * Returns the new balance, or null if the balance was too low.
 */
export async function charge(id: string, amount: number): Promise<number | null> {
  const user = await ensureUser(id);
  if (UNLIMITED_COINS || user.isPro) return user.credits;
  const [row] = await db
    .update(schema.users)
    .set({ credits: sql`${schema.users.credits} - ${amount}` })
    .where(and(eq(schema.users.id, id), gte(schema.users.credits, amount)))
    .returning({ credits: schema.users.credits });
  return row?.credits ?? null;
}
