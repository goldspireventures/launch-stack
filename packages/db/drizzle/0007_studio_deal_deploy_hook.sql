ALTER TABLE "studio_deal" ADD COLUMN IF NOT EXISTS "deploy_webhook_secret_hash" varchar(64);
