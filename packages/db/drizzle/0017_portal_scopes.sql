-- Client portal token scopes (product-level RBAC per deal link).
ALTER TABLE "studio_deal_portal_token"
  ADD COLUMN IF NOT EXISTS "scopes" jsonb NOT NULL DEFAULT '["view","accept","pay","intake","note"]'::jsonb;
