ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "linked_tenant_id" varchar(26);--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "manual_mrr_minor" integer;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "manual_mrr_currency" varchar(3) DEFAULT 'eur' NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "economics_notes" text;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "metrics" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD COLUMN IF NOT EXISTS "shipped_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD CONSTRAINT "studio_venture_linked_tenant_id_tenant_id_fk" FOREIGN KEY ("linked_tenant_id") REFERENCES "public"."tenant"("id") ON DELETE set null ON UPDATE no action;
