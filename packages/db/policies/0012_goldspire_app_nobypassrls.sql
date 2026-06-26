-- Ensure runtime app role cannot bypass tenant RLS (Supabase may reset attributes).
alter role goldspire_app nobypassrls;
