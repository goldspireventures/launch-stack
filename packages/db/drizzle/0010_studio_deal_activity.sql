CREATE TABLE IF NOT EXISTS "studio_deal_activity" (
	"id" varchar(26) PRIMARY KEY NOT NULL,
	"deal_id" varchar(26) NOT NULL,
	"kind" varchar(48) NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source" varchar(16) NOT NULL,
	"actor_user_id" varchar(26),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "studio_deal_activity_deal_id_studio_deal_id_fk" FOREIGN KEY ("deal_id") REFERENCES "public"."studio_deal"("id") ON DELETE cascade ON UPDATE no action
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_activity_deal_ix" ON "studio_deal_activity" USING btree ("deal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "studio_deal_activity_deal_created_ix" ON "studio_deal_activity" USING btree ("deal_id","created_at");
