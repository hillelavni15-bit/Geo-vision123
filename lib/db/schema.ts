import { boolean, index, integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

/** Anonymous guest players, identified by a signed browser cookie. */
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name"),
  isPro: boolean("is_pro").default(false).notNull(),
  credits: integer("credits").default(100).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

/** One row per photo analysis, shown in the history drawer. */
export const analyses = pgTable(
  "analyses",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    thumbnailDataUrl: text("thumbnail_data_url").notNull(),
    result: jsonb("result").notNull(),
    primaryCity: text("primary_city"),
    primaryCountry: text("primary_country").notNull(),
    confidence: text("confidence").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("analyses_user_created_idx").on(t.userId, t.createdAt)],
);

/** Visual profile of an identified photo, used to find similar photos. */
export const imageFeatures = pgTable("image_features", {
  analysisId: text("analysis_id").primaryKey(),
  userId: text("user_id").notNull(),
  profile: jsonb("profile").notNull(),
  vector: jsonb("vector").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [index("image_features_user_idx").on(t.userId, t.createdAt)]);

export type User = typeof users.$inferSelect;
export type AnalysisRow = typeof analyses.$inferSelect;
