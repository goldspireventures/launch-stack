'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Button, Input, Label } from '@goldspire/ui';

function browserSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export function StudioSupabaseSignIn({ consoleUrl }: { consoleUrl: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'magic' | 'password'>('magic');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onMagicLink(e: React.FormEvent) {
    e.preventDefault();
    const sb = browserSupabase();
    if (!sb) {
      setError('Sign-in is not configured. Contact your studio admin.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const redirectTo = `${consoleUrl.replace(/\/$/, '')}/auth/callback`;
    const { error: err } = await sb.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    });
    setBusy(false);
    if (err) {
      setError(err.message);
      return;
    }
    setMessage('Check your inbox — we sent a secure sign-in link.');
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    const sb = browserSupabase();
    if (!sb) {
      setError('Sign-in is not configured. Contact your studio admin.');
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    const { data, error: err } = await sb.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (err || !data.session) {
      setBusy(false);
      setError(err?.message ?? 'Sign-in failed.');
      return;
    }
    const res = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      setError('Could not start your session. Try again.');
      return;
    }
    const json = (await res.json()) as { redirectUrl?: string };
    window.location.href = json.redirectUrl ?? '/';
  }

  return (
    <div className="studio-panel mx-auto max-w-md space-y-6 p-6">
      <div className="flex gap-1 rounded-lg border border-border/60 bg-muted/20 p-1">
        <button
          type="button"
          onClick={() => setMode('magic')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'magic' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          }`}
        >
          Email link
        </button>
        <button
          type="button"
          onClick={() => setMode('password')}
          className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
            mode === 'password' ? 'bg-background shadow-sm' : 'text-muted-foreground'
          }`}
        >
          Password
        </button>
      </div>

      <form onSubmit={mode === 'magic' ? onMagicLink : onPassword} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="studio-email">Work email</Label>
          <Input
            id="studio-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(ev) => setEmail(ev.target.value)}
            placeholder="you@goldspire.studio"
          />
        </div>
        {mode === 'password' ? (
          <div className="space-y-2">
            <Label htmlFor="studio-password">Password</Label>
            <Input
              id="studio-password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
            />
          </div>
        ) : null}
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
        <Button type="submit" className="w-full studio-gold-glow" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'magic' ? 'Send sign-in link' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-xs text-muted-foreground">
        Studio team only. Use the email on your Goldspire invite.
      </p>
    </div>
  );
}
