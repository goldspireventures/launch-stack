CREATE TYPE "public"."studio_venture_status" AS ENUM('idea', 'exploring', 'active', 'paused', 'shipped', 'archived');--> statement-breakpoint
CREATE TYPE "public"."studio_venture_category" AS ENUM('business', 'product', 'tool', 'content', 'other');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "studio_venture" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "slug" varchar(80) NOT NULL,
  "name" text NOT NULL,
  "tagline" text,
  "status" "studio_venture_status" DEFAULT 'idea' NOT NULL,
  "category" "studio_venture_category" DEFAULT 'product' NOT NULL,
  "priority" integer DEFAULT 3 NOT NULL,
  "repo_url" text,
  "local_path" text,
  "cursor_workspace" text,
  "docs_markdown" text DEFAULT '' NOT NULL,
  "next_action" text,
  "next_action_due" timestamp with time zone,
  "links" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "accent" varchar(9),
  "linked_deployment_id" varchar(26),
  "last_touched_at" timestamp with time zone DEFAULT now() NOT NULL,
  "created_by_user_id" varchar(26),
  "archived_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "studio_venture_slug_uq" ON "studio_venture" ("slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_venture_status_ix" ON "studio_venture" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_venture_priority_ix" ON "studio_venture" ("priority");--> statement-breakpoint
ALTER TABLE "studio_venture" ADD CONSTRAINT "studio_venture_linked_deployment_id_product_deployment_id_fk" FOREIGN KEY ("linked_deployment_id") REFERENCES "public"."product_deployment"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "studio_venture" ADD CONSTRAINT "studio_venture_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
