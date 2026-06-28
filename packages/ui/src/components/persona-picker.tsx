'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase, Building2, Sparkles, Users } from 'lucide-react';
import {
  PERSONAS,
  listPersonasByGroup,
  listPersonasByTenantSlug,
  type PersonaDefinition,
  type PersonaId,
} from '@goldspire/config';
import { cn } from '../utils/cn';

const GROUP_META = {
  studio: {
    icon: Sparkles,
    title: 'Goldspire team',
    description: 'You — the studio. Sees every tenant, ships every blueprint.',
    accent: 'from-violet-500/40 to-fuchsia-500/30',
  },
  tenant: {
    icon: Building2,
    title: 'Client operators',
    description: 'Owners and admins — grouped by tenant product.',
    accent: 'from-sky-500/40 to-cyan-500/30',
  },
  customer: {
    icon: Users,
    title: 'End customers',
    description: "People using the live products. They never see the studio.",
    accent: 'from-rose-500/40 to-amber-500/30',
  },
} as const;

export interface PersonaPickerProps {
  /** Filter to a single group, e.g. only studio personas. */
  only?: ReadonlyArray<PersonaDefinition['group']>;
  /** Optional `?next=` value preserved across the redirect. */
  defaultNext?: string;
  /** Called when a persona is chosen. Returns the URL to navigate to. */
  onPick?: (persona: PersonaDefinition) => Promise<string>;
  /** Hide the dev-mode footer (production Console login). */
  hideDevFooter?: boolean;
  /** Hide internal role / slug chips on cards. */
  compact?: boolean;
}

export function PersonaPicker({ only, defaultNext, onPick, hideDevFooter, compact }: PersonaPickerProps) {
  const grouped = listPersonasByGroup();
  const [busyId, setBusyId] = useState<PersonaId | null>(null);

  const visibleGroups = (Object.keys(grouped) as Array<keyof typeof grouped>).filter((g) =>
    only ? only.includes(g) : true,
  );

  async function handlePick(p: PersonaDefinition) {
    if (busyId) return;
    setBusyId(p.id as PersonaId);
    try {
      const target = onPick
        ? await onPick(p)
        : await defaultPersonaPick(p, defaultNext);
      window.location.href = target;
    } catch (err) {
      setBusyId(null);
      // eslint-disable-next-line no-console
      console.error('persona pick failed', err);
    }
  }

  return (
    <div className="space-y-10">
      {visibleGroups.map((group) => {
        const meta = GROUP_META[group];
        const Icon = meta.icon;
        const items = grouped[group];
        if (items.length === 0) return null;
        return (
          <section key={group}>
            <header className="mb-4 flex items-center gap-3">
              <div
                className={cn(
                  'grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br text-foreground',
                  meta.accent,
                )}
              >
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">{meta.title}</h2>
                <p className="text-sm text-muted-foreground">{meta.description}</p>
              </div>
            </header>
            {group === 'tenant' ? (
              <div className="space-y-6">
                {listPersonasByTenantSlug().map((tenantGroup) => (
                  <div key={tenantGroup.slug}>
                    <h3 className="mb-3 text-sm font-medium text-muted-foreground">{tenantGroup.label}</h3>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {tenantGroup.personas.map((p, idx) => (
                        <PersonaCard
                          key={p.id}
                          persona={p}
                          busy={busyId === p.id}
                          index={idx}
                          onPick={handlePick}
                          compact={compact}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p, idx) => (
                  <PersonaCard
                    key={p.id}
                    persona={p}
                    busy={busyId === p.id}
                    index={idx}
                    onPick={handlePick}
                    compact={compact}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {!hideDevFooter ? (
        <p className="pt-2 text-center text-xs text-muted-foreground">
          Picking a persona sets a cookie used to sign in during local development.
        </p>
      ) : null}
    </div>
  );
}

function PersonaCard({
  persona,
  busy,
  index,
  onPick,
  compact,
}: {
  persona: PersonaDefinition;
  busy: boolean;
  index: number;
  onPick: (p: PersonaDefinition) => void;
  compact?: boolean;
}) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.04 * index, type: 'spring', stiffness: 380, damping: 28 }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onPick(persona)}
      disabled={busy}
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-border bg-card/60 p-4 text-left',
        'transition-colors hover:border-primary/40 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40',
        busy && 'opacity-60 cursor-progress',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <Avatar persona={persona} />
        <ArrowRight className="h-4 w-4 translate-x-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
      </div>
      <div>
        <p className="font-medium">{persona.name}</p>
        <p className="text-xs text-muted-foreground">{persona.email}</p>
      </div>
      <p className="text-xs leading-snug text-muted-foreground line-clamp-2">{persona.bio}</p>
      {!compact ? (
        <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
          <span className="rounded border border-border bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            {persona.role}
          </span>
          <span className="rounded border border-border bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {persona.tenantSlug}
          </span>
          <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-primary">
            {persona.surface.app}
          </span>
        </div>
      ) : null}
    </motion.button>
  );
}

function Avatar({ persona }: { persona: PersonaDefinition }) {
  const initials = persona.name
    .split(' ')
    .map((s) => s[0])
    .slice(0, 2)
    .join('');
  const hue = colorHash(persona.id);
  return (
    <div
      className="grid h-10 w-10 place-items-center rounded-full text-sm font-semibold text-white"
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

async function defaultPersonaPick(p: PersonaDefinition, next?: string): Promise<string> {
  const res = await fetch('/api/persona', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: p.id, next }),
  });
  if (!res.ok) throw new Error('persona pick failed');
  const data = (await res.json()) as { ok: boolean; redirectUrl: string };
  return data.redirectUrl;
}

void PERSONAS;
