ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "amount_minor_units" integer;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "currency" varchar(3) DEFAULT 'eur' NOT NULL;
ALTER TABLE "subscription" ADD COLUMN IF NOT EXISTS "billing_interval" varchar(16);

CREATE INDEX IF NOT EXISTS "marketing_lead_status_updated_ix" ON "marketing_lead" ("status", "updated_at");
