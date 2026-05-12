-- ============================================================
-- 0002_product_deployment_rls.sql
-- ============================================================
-- RLS for the Studio Portal's `product_deployment` catalog.
-- Tenants see only their own deployments; STUDIO_OWNER sees all.
-- Fully idempotent.
-- ============================================================

alter table product_deployment enable row level security;
alter table product_deployment force row level security;

drop policy if exists tenant_isolation on product_deployment;

create policy tenant_isolation on product_deployment
  as permissive
  for all
  to public
  using (app_is_studio() or tenant_id = app_current_tenant())
  with check (app_is_studio() or tenant_id = app_current_tenant());
