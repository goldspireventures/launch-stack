-- Marketing leads from the public goldspire.dev discovery form.
--
-- Studio-owned (not tenant-scoped). RLS policy: studio-only reads + system
-- writes. The marketing API uses publicProcedure but inserts via the
-- studio-context DB connection so RLS allows the write.

DO $$ BEGIN
  CREATE TYPE "marketing_lead_status" AS ENUM ('new', 'reviewing', 'qualified', 'converted', 'archived', 'spam');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "marketing_lead" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "company" text,
  "message" text NOT NULL,
  "template_interest" varchar(80),
  "budget_band" varchar(32),
  "timeline" varchar(32),
  "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "status" "marketing_lead_status" DEFAULT 'new' NOT NULL,
  "assigned_to_user_id" varchar(26) REFERENCES "user"("id") ON DELETE SET NULL,
  "linked_deal_id" varchar(26) REFERENCES "studio_deal"("id") ON DELETE SET NULL,
  "notes" text,
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_lead_status_ix" ON "marketing_lead" USING btree ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_lead_created_ix" ON "marketing_lead" USING btree ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "marketing_lead_email_ix" ON "marketing_lead" USING btree ("email");
