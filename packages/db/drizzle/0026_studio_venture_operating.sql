ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "monthly_costs_minor" integer;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "runway_months" integer;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "external_billing_url" text;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "metric_history" jsonb DEFAULT '[]'::jsonb NOT NULL;
