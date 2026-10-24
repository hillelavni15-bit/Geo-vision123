CREATE TABLE "analyses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"thumbnail_data_url" text NOT NULL,
	"result" jsonb NOT NULL,
	"primary_city" text,
	"primary_country" text NOT NULL,
	"confidence" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "image_features" (
	"analysis_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"profile" jsonb NOT NULL,
	"vector" jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"is_pro" boolean DEFAULT false NOT NULL,
	"credits" integer DEFAULT 100 NOT NULL,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "analyses_user_created_idx" ON "analyses" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "image_features_user_idx" ON "image_features" USING btree ("user_id","created_at");