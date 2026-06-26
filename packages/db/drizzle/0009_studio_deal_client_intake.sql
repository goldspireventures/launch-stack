-- Client kickoff intake captured from the client portal (structured JSON + template id).
-- Portal writes via system studio context; operators read on studio_deal in Console.

ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "intake_template_id" varchar(40) DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "client_intake" jsonb DEFAULT '{}'::jsonb NOT NULL;
