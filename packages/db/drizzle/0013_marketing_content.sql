CREATE TABLE IF NOT EXISTS "marketing_content_override" (
  "key" varchar(80) PRIMARY KEY NOT NULL,
  "payload" jsonb NOT NULL,
  "updated_by_user_id" varchar(26),
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "marketing_content_override"
    ADD CONSTRAINT "marketing_content_override_updated_by_user_id_user_id_fk"
    FOREIGN KEY ("updated_by_user_id") REFERENCES "public"."user"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
