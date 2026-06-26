CREATE TYPE "public"."studio_deal_payment_line_status" AS ENUM('pending', 'processing', 'paid', 'waived');--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "client_contact_email" text;--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "deal_accepted_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "staging_url" text;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_deal_payment_line" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"deal_id" varchar(26) NOT NULL,
	"milestone_key" text NOT NULL,
	"sort_order" integer NOT NULL,
	"label" text NOT NULL,
	"amount_minor_units" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" "studio_deal_payment_line_status" DEFAULT 'pending' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"external_paid_ref" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_deal_portal_token" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"deal_id" varchar(26) NOT NULL,
	"token_hash" text NOT NULL,
	"label" text DEFAULT 'default' NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_deal_payment_line" ADD CONSTRAINT "studio_deal_payment_line_deal_id_studio_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."studio_deal"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_deal_portal_token" ADD CONSTRAINT "studio_deal_portal_token_deal_id_studio_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."studio_deal"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_payment_line_deal_ix" ON "studio_deal_payment_line" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "studio_deal_payment_line_deal_sort_uq" ON "studio_deal_payment_line" USING btree ("deal_id","sort_order");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_payment_line_session_ix" ON "studio_deal_payment_line" USING btree ("stripe_checkout_session_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_portal_token_deal_ix" ON "studio_deal_portal_token" USING btree ("deal_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "studio_deal_portal_token_hash_uq" ON "studio_deal_portal_token" USING btree ("token_hash");
