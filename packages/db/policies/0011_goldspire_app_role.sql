-- Application role for production runtime (RLS enforced).
-- Migrations/seeds continue to use the postgres / service connection with
-- set_config('app.role', 'STUDIO_OWNER') where needed.
--
-- After migrate: set a password in Supabase (Database → Roles → goldspire_app)
-- and point DATABASE_URL_APP at the session pooler URI for this role.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'goldspire_app') then
    create role goldspire_app
      with login
      nosuperuser
      nobypassrls
      nocreatedb
      nocreaterole
      inherit;
  end if;
end
$$;

do $$
declare
  dbname text := current_database();
begin
  execute format('grant connect on database %I to goldspire_app', dbname);
end
$$;
grant usage on schema public to goldspire_app;
grant select, insert, update, delete on all tables in schema public to goldspire_app;
grant usage, select on all sequences in schema public to goldspire_app;

alter default privileges in schema public
  grant select, insert, update, delete on tables to goldspire_app;

alter default privileges in schema public
  grant usage, select on sequences to goldspire_app;

grant execute on all functions in schema public to goldspire_app;
