-- Marketing content overrides — studio-only. Public site reads via API (studio context).

alter table if exists marketing_content_override enable row level security;
alter table if exists marketing_content_override force row level security;

drop policy if exists marketing_content_studio_all on marketing_content_override;

create policy marketing_content_studio_all on marketing_content_override
  as permissive
  for all
  to public
  using (app_is_studio())
  with check (app_is_studio());
