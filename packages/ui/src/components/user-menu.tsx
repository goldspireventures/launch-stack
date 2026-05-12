'use client';

import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, LogOut, UserCircle2, UserCog } from 'lucide-react';
import type { PersonaDefinition } from '@goldspire/config';
import { cn } from '../utils/cn';

/**
 * Topbar user menu. Renders the current persona as a clickable chip;
 * opens a popover with identity details and a "Switch user" link that
 * jumps to /login (route exists in every app).
 *
 * Pure presentational — handed a `persona` from the layout (server-side
 * resolved). Sign-out hits /api/persona with DELETE.
 */
export interface UserMenuProps {
  persona: PersonaDefinition | null;
  /** Override the "Switch user" link target. Default: /login. */
  loginHref?: string;
  /** Override the sign-out endpoint. Default: /api/persona (DELETE). */
  signOutPath?: string;
}

export function UserMenu({ persona, loginHref = '/login', signOutPath = '/api/persona' }: UserMenuProps) {
  const [open, setOpen] = useState(false);

  if (!persona) {
    return (
      <a
        href={loginHref}
        className="rounded-md border border-border bg-card/60 px-3 py-1.5 text-sm hover:bg-card"
      >
        Sign in
      </a>
    );
  }

  async function signOut() {
    await fetch(signOutPath, { method: 'DELETE' }).catch(() => {});
    window.location.href = loginHref;
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className={cn(
            'group inline-flex items-center gap-2 rounded-full border border-border bg-card/60 py-1 pl-1 pr-3 text-sm transition-colors hover:bg-card',
            'focus:outline-none focus:ring-2 focus:ring-primary/40',
          )}
        >
          <Avatar persona={persona} />
          <span className="hidden sm:inline-flex flex-col items-start leading-tight">
            <span className="text-xs font-medium">{persona.name}</span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {persona.role.replace('_', ' ').toLowerCase()}
            </span>
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild align="end" sideOffset={8}>
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="z-50 w-72 rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-xl"
              >
                <div className="flex items-center gap-3">
                  <Avatar persona={persona} size="lg" />
                  <div className="min-w-0">
                    <p className="font-medium leading-tight">{persona.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{persona.email}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{persona.bio}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  <span className="rounded border border-border bg-muted/40 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    {persona.role}
                  </span>
                  <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {persona.tenantSlug}
                  </span>
                </div>
                <div className="mt-3 grid gap-1 border-t border-border pt-3">
                  <a
                    href={loginHref}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                  >
                    <UserCog className="h-3.5 w-3.5" />
                    Switch user
                  </a>
                  <button
                    type="button"
                    onClick={signOut}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    Sign out
                  </button>
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}

function Avatar({ persona, size = 'sm' }: { persona: PersonaDefinition; size?: 'sm' | 'lg' }) {
  const initials = persona.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
  const hue = colorHash(persona.id);
  const cls = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-[11px]';
  return (
    <div
      className={cn('grid place-items-center rounded-full font-semibold text-white', cls)}
      style={{ background: `hsl(${hue} 65% 45%)` }}
    >
      {initials}
    </div>
  );
}

function colorHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

/** Convenience: server-side helper that renders just the user icon when persona is null. */
export function UserMenuPlaceholder() {
  return <UserCircle2 className="h-5 w-5 text-muted-foreground" />;
}
