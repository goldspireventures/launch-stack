-- Payment lines + portal tokens follow the same studio-only access model as studio_deal.

alter table if exists studio_deal_payment_line enable row level security;
alter table if exists studio_deal_payment_line force row level security;
drop policy if exists studio_deal_payment_line_studio_all on studio_deal_payment_line;
create policy studio_deal_payment_line_studio_all on studio_deal_payment_line
  as permissive for all to public
  using (app_is_studio()) with check (app_is_studio());

alter table if exists studio_deal_portal_token enable row level security;
alter table if exists studio_deal_portal_token force row level security;
drop policy if exists studio_deal_portal_token_studio_all on studio_deal_portal_token;
create policy studio_deal_portal_token_studio_all on studio_deal_portal_token
  as permissive for all to public
  using (app_is_studio()) with check (app_is_studio());
