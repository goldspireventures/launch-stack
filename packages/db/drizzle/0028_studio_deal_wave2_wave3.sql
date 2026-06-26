-- Wave 2–3: client success fields + engagement kinds for discovery / retainer SKUs
ALTER TYPE "studio_engagement_kind" ADD VALUE IF NOT EXISTS 'discovery_sprint';
--> statement-breakpoint
ALTER TYPE "studio_engagement_kind" ADD VALUE IF NOT EXISTS 'retainer';
--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "next_demo_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "next_demo_url" text;
--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "renewal_due_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "deal_preset_slug" varchar(64);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_renewal_due_ix" ON "studio_deal" ("renewal_due_at");
