import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env, hasRealProvider } from '@goldspire/config/env';

/**
 * Supabase clients.
 *
 *  - `supabaseService` uses the service role key and bypasses RLS. Use only
 *    from trusted server-side code, never from the browser.
 *  - `supabaseAnon` is safe to expose to the client; it relies on user JWTs
 *    plus RLS for authorization.
 *
 * When Supabase env vars are missing (mock mode), these return null. Callers
 * should check `hasRealProvider.auth` before using.
 */

let _service: SupabaseClient | null = null;
let _anon: SupabaseClient | null = null;

export function supabaseService(): SupabaseClient | null {
  if (!hasRealProvider.auth || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return null;
  if (!_service) {
    _service = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _service;
}

export function supabaseAnon(): SupabaseClient | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  if (!_anon) {
    _anon = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return _anon;
}

export function supabaseEnabled(): boolean {
  return hasRealProvider.auth;
}
