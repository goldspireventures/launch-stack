-- Marketing leads — studio-only reads/writes. The public contact form on
-- goldspire.dev posts through the marketing tRPC router using a service-role
-- (studio) connection, so this single policy is enough; we never want
-- unauthenticated DB clients reading lead data.

alter table if exists marketing_lead enable row level security;
alter table if exists marketing_lead force row level security;

drop policy if exists marketing_lead_studio_all on marketing_lead;

create policy marketing_lead_studio_all on marketing_lead
  as permissive
  for all
  to public
  using (app_is_studio())
  with check (app_is_studio());
