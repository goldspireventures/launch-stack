-- Studio internal commercial records — same access model as webhook_event:
-- only studio context (app.role = STUDIO_OWNER) may read/write.

alter table if exists studio_deal enable row level security;
alter table if exists studio_deal force row level security;

drop policy if exists studio_deal_studio_all on studio_deal;

create policy studio_deal_studio_all on studio_deal
  as permissive
  for all
  to public
  using (app_is_studio())
  with check (app_is_studio());
