DO $$ BEGIN
  CREATE TYPE "public"."feature_flag_kind" AS ENUM('module', 'feature', 'limit', 'operation');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "feature_flag" ADD COLUMN IF NOT EXISTS "kind" "public"."feature_flag_kind" DEFAULT 'feature'::"public"."feature_flag_kind" NOT NULL;
--> statement-breakpoint
ALTER TABLE "feature_flag" ADD COLUMN IF NOT EXISTS "tags" text[] DEFAULT '{}'::text[] NOT NULL;
--> statement-breakpoint
ALTER TABLE "feature_flag" ADD COLUMN IF NOT EXISTS "numeric_value" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "feature_flag_tenant_kind_ix" ON "feature_flag" USING btree ("tenant_id","kind");
