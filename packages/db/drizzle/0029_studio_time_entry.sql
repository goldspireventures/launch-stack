-- Studio engaged time for economics (€ / hour on closed deals)
CREATE TABLE IF NOT EXISTS "studio_time_entry" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "deal_id" varchar(26) REFERENCES "studio_deal"("id") ON DELETE CASCADE,
  "lead_id" varchar(26) REFERENCES "marketing_lead"("id") ON DELETE SET NULL,
  "minutes" integer NOT NULL,
  "note" text,
  "logged_by_user_id" varchar(26) REFERENCES "user"("id") ON DELETE SET NULL,
  "logged_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_time_entry_deal_ix" ON "studio_time_entry" ("deal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_time_entry_lead_ix" ON "studio_time_entry" ("lead_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_time_entry_logged_at_ix" ON "studio_time_entry" ("logged_at");
