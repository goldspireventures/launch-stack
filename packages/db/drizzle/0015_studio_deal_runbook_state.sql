ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "factory_runbook_state" jsonb DEFAULT '{"blocker":{"currentStepId":null,"since":null,"lastAlertedAt":null}}'::jsonb NOT NULL;
