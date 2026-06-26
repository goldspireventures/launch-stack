ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "factory_runbook_acks" jsonb DEFAULT '{}'::jsonb NOT NULL;
