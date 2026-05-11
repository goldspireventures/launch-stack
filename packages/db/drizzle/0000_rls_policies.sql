-- ============================================================
-- Goldspire Launch Stack — Row Level Security policies
-- ============================================================
-- This migration is intended to run AFTER `drizzle-kit generate` has produced
-- the initial CREATE TABLE migration. The migrate script applies both in the
-- correct order. The policies below establish the tenant-isolation contract:
--
--   1. Every business table is RLS-enabled.
--   2. Reads/writes are restricted to rows where tenant_id = current_setting('app.tenant_id').
--   3. The studio role (app.role = 'STUDIO_OWNER') bypasses all policies, enabling
--      cross-tenant analytics for the Studio Console.
--   4. The audit_log table is APPEND-ONLY — UPDATE and DELETE are forbidden by policy.
--
-- The application connects as a single role (the Supabase service role or the
-- generic `goldspire_app` user) and explicitly sets the per-request context
-- via `select set_config('app.tenant_id', $1, true)` inside a transaction.
-- See packages/db/src/tenant-context.ts.
-- ============================================================

-- Helper functions ----------------------------------------------------------

create or replace function app_current_tenant() returns text
language sql stable as $$
  select coalesce(current_setting('app.tenant_id', true), '')
$$;

create or replace function app_current_user() returns text
language sql stable as $$
  select coalesce(current_setting('app.user_id', true), '')
$$;

create or replace function app_is_studio() returns boolean
language sql stable as $$
  select coalesce(current_setting('app.role', true), '') = 'STUDIO_OWNER'
$$;

-- Apply RLS to all tenant-scoped tables -------------------------------------

do $$
declare
  tbl text;
  tenant_scoped text[] := array[
    'tenant',
    '"user"',
    'profile',
    'product',
    'subscription',
    'entitlement',
    'feature_flag',
    'notification',
    'report',
    'audit_log',
    'analytics_event',
    'file_object',
    'tenant_membership',
    'message_thread',
    'thread_participant',
    'message',
    'dating_profile',
    'dating_photo',
    'dating_swipe',
    'dating_match',
    'business',
    'staff',
    'service',
    'business_hours',
    'booking',
    'listing',
    '"order"',
    'space',
    'space_member',
    'post',
    'comment',
    'assistant_session',
    'assistant_message',
    'agent_task',
    'tool_invocation'
  ];
begin
  foreach tbl in array tenant_scoped loop
    execute format('alter table %s enable row level security', tbl);
    execute format('alter table %s force row level security', tbl);
  end loop;
end$$;

-- Generic tenant-scoped policy generator -----------------------------------

do $$
declare
  tbl text;
  policy_name text;
  tenant_scoped_with_tenant_id text[] := array[
    '"user"',
    'profile',
    'product',
    'subscription',
    'entitlement',
    'feature_flag',
    'notification',
    'report',
    'analytics_event',
    'file_object',
    'tenant_membership',
    'message_thread',
    'thread_participant',
    'message',
    'dating_profile',
    'dating_photo',
    'dating_swipe',
    'dating_match',
    'business',
    'staff',
    'service',
    'business_hours',
    'booking',
    'listing',
    '"order"',
    'space',
    'space_member',
    'post',
    'comment',
    'assistant_session',
    'assistant_message',
    'agent_task',
    'tool_invocation'
  ];
begin
  foreach tbl in array tenant_scoped_with_tenant_id loop
    policy_name := 'tenant_isolation';
    execute format(
      'create policy %I on %s as permissive for all to public ' ||
      'using (app_is_studio() or tenant_id = app_current_tenant()) ' ||
      'with check (app_is_studio() or tenant_id = app_current_tenant())',
      policy_name, tbl
    );
  end loop;
end$$;

-- Tenant table — self-scoped (rows reference themselves via id)
create policy tenant_isolation on tenant
  as permissive
  for all
  to public
  using (app_is_studio() or id = app_current_tenant())
  with check (app_is_studio() or id = app_current_tenant());

-- Audit log: insert-only ----------------------------------------------------
create policy audit_log_insert on audit_log
  for insert
  to public
  with check (app_is_studio() or tenant_id = app_current_tenant());

create policy audit_log_select on audit_log
  for select
  to public
  using (app_is_studio() or tenant_id = app_current_tenant());

-- UPDATE/DELETE policies intentionally omitted on audit_log => Postgres
-- denies those operations by default when RLS is on.

-- Webhook event: studio-only ------------------------------------------------
alter table webhook_event enable row level security;
alter table webhook_event force row level security;

create policy webhook_event_studio on webhook_event
  for all
  to public
  using (app_is_studio())
  with check (app_is_studio());

-- Convenience: a "bypass" policy for the service role when running migrations
-- in CI. The service role inherits the `app.role = 'STUDIO_OWNER'` setting
-- because the migrate script sets it before applying changes.
