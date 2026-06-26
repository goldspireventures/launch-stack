-- Lab Phases 3–4: P&L lines, OKRs, time allocation, integration sync state
ALTER TABLE "studio_venture"
  ADD COLUMN IF NOT EXISTS "economics_mode" varchar(16) DEFAULT 'cash' NOT NULL,
  ADD COLUMN IF NOT EXISTS "ownership_percent" integer,
  ADD COLUMN IF NOT EXISTS "tax_entity" text,
  ADD COLUMN IF NOT EXISTS "time_allocation_percent" integer,
  ADD COLUMN IF NOT EXISTS "pl_lines" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "okrs" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "integration_state" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "stripe_account_hint" varchar(120),
  ADD COLUMN IF NOT EXISTS "xero_entity_url" text;
