-- ============================================================
-- 0001_feature_flag_read_globals.sql
-- ============================================================
-- The base `tenant_isolation` policy on `feature_flag` only allows
-- reads where tenant_id = app_current_tenant(). That correctly blocks
-- cross-tenant access, but it also blocks tenant admins from SEEING
-- studio-wide (tenant_id IS NULL) flags — they need to know which
-- global flags are in effect for their tenant.
--
-- This adds an additional permissive SELECT policy that lets any
-- authenticated context read rows where tenant_id IS NULL. Writes
-- to those rows still go through the original policy, so only
-- STUDIO_OWNER can mutate global flags.
--
-- Idempotent: safe to run on a fresh DB or a re-run.
-- ============================================================

drop policy if exists feature_flag_global_read on feature_flag;

create policy feature_flag_global_read on feature_flag
  as permissive
  for select
  to public
  using (tenant_id is null);
