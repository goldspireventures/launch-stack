-- Owner-only Lab ventures — same studio bypass as studio_deal.

alter table if exists studio_venture enable row level security;
alter table if exists studio_venture force row level security;

drop policy if exists studio_venture_studio_all on studio_venture;

create policy studio_venture_studio_all on studio_venture
  as permissive
  for all
  to public
  using (app_is_studio())
  with check (app_is_studio());
