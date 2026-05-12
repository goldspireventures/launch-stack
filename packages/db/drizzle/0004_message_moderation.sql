-- Moderation columns on `message`. All nullable so existing rows are valid;
-- queries treat NULL as "not flagged" / "not hidden". `deleted_at` already
-- exists on the table and is reused as the "hidden" state.

ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "flagged_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "flagged_by_id" varchar(26) REFERENCES "user"("id") ON DELETE SET NULL;
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "flag_reason" text;
--> statement-breakpoint
ALTER TABLE "message" ADD COLUMN IF NOT EXISTS "hidden_by_id" varchar(26) REFERENCES "user"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_tenant_flagged_ix" ON "message" USING btree ("tenant_id","flagged_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "message_tenant_deleted_ix" ON "message" USING btree ("tenant_id","deleted_at");
