CREATE TABLE IF NOT EXISTS "access_policy_override" (
  "id" varchar(26) PRIMARY KEY NOT NULL,
  "tenant_id" varchar(26),
  "role" "role",
  "grant_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "deny_capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "policy_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "note" text,
  "created_by_user_id" varchar(26),
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "access_policy_override" ADD CONSTRAINT "access_policy_override_tenant_id_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenant"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "access_policy_override" ADD CONSTRAINT "access_policy_override_created_by_user_id_user_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX IF NOT EXISTS "access_policy_override_tenant_ix" ON "access_policy_override" ("tenant_id");
CREATE INDEX IF NOT EXISTS "access_policy_override_enabled_ix" ON "access_policy_override" ("enabled");
