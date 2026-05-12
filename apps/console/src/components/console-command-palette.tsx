'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Flag,
  Handshake,
  Layers,
  LayoutDashboard,
  LineChart,
  Sparkles,
  UserCog,
  Users,
} from 'lucide-react';
import { CommandPalette, type CommandItem, useToast } from '@goldspire/ui';
import { listPersonasByGroup } from '@goldspire/config';
import { env } from '@goldspire/config/env';
import { trpc } from '@/lib/trpc';

/**
 * Studio Console command palette.
 *
 * Cmd/Ctrl+K. Aggregates four searchable sources:
 *
 *   1. Pages — every studio page (Overview, Tenants, Apps, Deals, etc).
 *   2. Tenants — every tenant in the database. Selecting one deep-links
 *      into the Admin app with the active-tenant cookie set.
 *   3. Personas — quick-switch to any of the demo personas without
 *      bouncing through /login.
 *   4. Feature flags — searchable by key, opens the catalog drawer for
 *      that flag.
 *
 * Provider queries are kicked off only after the palette opens (we don't
 * fetch everything on every page load).
 */
export interface ConsoleCommandPaletteProps {
  /** Current persona id (from the cookie) so cross-origin Open Admin links
   * can forward it. */
  personaId?: string | null;
}

export function ConsoleCommandPalette({ personaId = null }: ConsoleCommandPaletteProps = {}) {
  const router = useRouter();
  const { toast } = useToast();

  // We don't have a hook to know whether the palette is open from here, so
  // we keep the queries always-on but with long stale times so the cost is
  // amortized across the session.
  const tenantsQ = trpc.tenants.list.useQuery(undefined, { staleTime: 60_000 });
  const flagsQ = trpc.catalog.listFeatureFlags.useQuery(undefined, { staleTime: 60_000 });

  const items: CommandItem[] = React.useMemo(() => {
    const out: CommandItem[] = [];

    /* Pages (static) */
    const pages: Array<[string, string, React.ComponentType<{ className?: string }>]> = [
      ['Overview', '/', LayoutDashboard],
      ['Stamp a tenant', '/onboard', Sparkles],
      ['Apps', '/apps', LayoutDashboard],
      ['Tenants', '/tenants', Building2],
      ['Blueprints', '/blueprints', Layers],
      ['Deals', '/deals', Handshake],
      ['Plans', '/plans', Handshake],
      ['Reports', '/reports', LineChart],
      ['Analytics', '/analytics', LineChart],
      ['Feature flag catalog', '/catalog/feature-flags', Flag],
      ['Audit', '/audit', LineChart],
      ['Settings', '/settings', UserCog],
    ];
    for (const [label, href, Icon] of pages) {
      out.push({
        id: `page:${href}`,
        label,
        group: 'Pages',
        icon: Icon,
        hint: href,
        onSelect: () => router.push(href),
      });
    }

    /* Tenants — open the Admin app for that tenant via the deep-link route */
    for (const t of tenantsQ.data ?? []) {
      out.push({
        id: `tenant:${t.id}`,
        label: t.name,
        group: 'Tenants',
        hint: `${t.slug} · ${t.plan}`,
        icon: Building2,
        keywords: [t.slug, t.plan],
        onSelect: () => {
          const params = new URLSearchParams({
            slug: t.slug,
            next: '/dashboard',
          });
          if (personaId) params.set('persona', personaId);
          window.location.href = `${env.NEXT_PUBLIC_ADMIN_URL}/api/active-tenant?${params.toString()}`;
        },
      });
    }

    /* Personas — quick switch */
    const personas = listPersonasByGroup();
    for (const p of [...personas.studio, ...personas.tenant, ...personas.customer]) {
      out.push({
        id: `persona:${p.id}`,
        label: `Switch to ${p.name}`,
        group: 'Personas',
        icon: Users,
        hint: `${p.role} · ${p.tenantSlug}`,
        keywords: [p.email, p.tenantSlug, p.role, p.group],
        onSelect: async () => {
          try {
            const res = await fetch('/api/persona', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: p.id }),
            });
            const data = (await res.json()) as { ok: boolean; redirectUrl?: string };
            if (data.ok && data.redirectUrl) {
              window.location.href = data.redirectUrl;
            }
          } catch (err) {
            toast({ title: 'Could not switch persona', description: String(err), tone: 'danger' });
          }
        },
      });
    }

    /* Feature flags — jump to the catalog drawer (open by query param) */
    for (const f of flagsQ.data ?? []) {
      out.push({
        id: `flag:${f.key}`,
        label: f.key,
        group: 'Feature flags',
        icon: Flag,
        hint: f.kind,
        keywords: [f.kind, ...(f.tags ?? [])],
        onSelect: () =>
          router.push(`/catalog/feature-flags?selected=${encodeURIComponent(f.key)}`),
      });
    }

    return out;
  }, [tenantsQ.data, flagsQ.data, router, toast, personaId]);

  return <CommandPalette items={items} />;
}
