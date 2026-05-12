CREATE TYPE "public"."studio_deal_client_risk" AS ENUM('referred', 'unknown', 'enterprise');--> statement-breakpoint
CREATE TYPE "public"."studio_deal_status" AS ENUM('draft', 'pipeline', 'won', 'lost', 'archived');--> statement-breakpoint
CREATE TYPE "public"."studio_deal_subcontract" AS ENUM('none', 'light', 'heavy');--> statement-breakpoint
CREATE TYPE "public"."studio_engagement_kind" AS ENUM('mvp', 'mvp_plus_prod_planned');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_deal" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"client_name" text NOT NULL,
	"engagement_kind" "studio_engagement_kind" NOT NULL,
	"client_risk" "studio_deal_client_risk" NOT NULL,
	"subcontracting" "studio_deal_subcontract" NOT NULL,
	"weeks_min" integer NOT NULL,
	"weeks_max" integer NOT NULL,
	"total_fee_minor_units" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"status" "studio_deal_status" DEFAULT 'draft' NOT NULL,
	"plan_snapshot" jsonb NOT NULL,
	"notes" text,
	"linked_tenant_id" varchar(26),
	"created_by_user_id" varchar(26),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_deal" ADD CONSTRAINT "studio_deal_linked_tenant_id_tenant_id_fk" FOREIGN KEY ("linked_tenant_id") REFERENCES "public"."tenant"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "studio_deal" ADD CONSTRAINT "studio_deal_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_status_ix" ON "studio_deal" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_created_ix" ON "studio_deal" USING btree ("created_at");