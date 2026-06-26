-- Deal activity rows are studio-scoped like payment lines (portal writes via system studio context).

alter table if exists studio_deal_activity enable row level security;
alter table if exists studio_deal_activity force row level security;
drop policy if exists studio_deal_activity_studio_all on studio_deal_activity;
create policy studio_deal_activity_studio_all on studio_deal_activity
  as permissive for all to public
  using (app_is_studio()) with check (app_is_studio());
