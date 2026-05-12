CREATE TYPE "public"."deployment_environment" AS ENUM('local', 'staging', 'production');--> statement-breakpoint
CREATE TYPE "public"."deployment_health_status" AS ENUM('unknown', 'ok', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."deployment_kind" AS ENUM('web', 'mobile_ios', 'mobile_android', 'admin', 'console', 'api');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "product_deployment" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"tenant_id" varchar(26) NOT NULL,
	"product_id" varchar(26),
	"blueprint" "blueprint_kind",
	"kind" "deployment_kind" NOT NULL,
	"environment" "deployment_environment" DEFAULT 'local' NOT NULL,
	"name" text NOT NULL,
	"tagline" text,
	"accent" varchar(9),
	"url" text,
	"local_dev_url" text,
	"local_dev_command" text,
	"repo_path" text,
	"health_check_path" varchar(200),
	"mobile_scheme" varchar(60),
	"expo_project_id" text,
	"is_studio_tool" boolean DEFAULT false NOT NULL,
	"last_deploy_sha" varchar(40),
	"last_deploy_at" timestamp with time zone,
	"health_status" "deployment_health_status" DEFAULT 'unknown' NOT NULL,
	"last_health_check_at" timestamp with time zone,
	"last_health_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_deployment" ADD CONSTRAINT "product_deployment_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "product_deployment" ADD CONSTRAINT "product_deployment_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "product_deployment_tenant_product_kind_env_uq" ON "product_deployment" USING btree ("tenant_id","product_id","kind","environment");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_deployment_tenant_kind_ix" ON "product_deployment" USING btree ("tenant_id","kind");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_deployment_blueprint_ix" ON "product_deployment" USING btree ("blueprint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "product_deployment_health_ix" ON "product_deployment" USING btree ("environment","health_status");