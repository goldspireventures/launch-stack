'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Bell,
  Building2,
  Flag,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  Settings,
  Users,
} from 'lucide-react';
import { CommandPalette, type CommandItem, useToast } from '@goldspire/ui';
import { listPersonasByGroup } from '@goldspire/config';
import { trpc } from '@/lib/trpc';

/**
 * Admin command palette.
 *
 * Cmd/Ctrl+K. Tenant-scoped: surfaces pages, users in the current tenant,
 * tenant-scoped feature flags, and personas for quick switching. Studio
 * operators with the studio_console role also get a "Switch tenant" group
 * sourced from the cross-tenant list.
 */
export interface AdminCommandPaletteProps {
  /** True if the current user can list every tenant. */
  canSwitchTenants?: boolean;
}

export function AdminCommandPalette({ canSwitchTenants = false }: AdminCommandPaletteProps) {
  const router = useRouter();
  const { toast } = useToast();

  // Always-on with long stale times (palette opens randomly).
  const usersQ = trpc.users.list.useQuery(undefined, { staleTime: 60_000 });
  const flagsQ = trpc.featureFlags.list.useQuery(undefined, { staleTime: 60_000 });
  const tenantsQ = trpc.tenants.list.useQuery(undefined, {
    staleTime: 60_000,
    enabled: canSwitchTenants,
  });

  const items: CommandItem[] = React.useMemo(() => {
    const out: CommandItem[] = [];

    const pages: Array<[string, string, React.ComponentType<{ className?: string }>]> = [
      ['Dashboard', '/dashboard', LayoutDashboard],
      ['Users', '/users', Users],
      ['Products', '/products', Package],
      ['Subscriptions', '/subscriptions', LineChart],
      ['Feature flags', '/feature-flags', Flag],
      ['Reports', '/reports', BarChart3],
      ['Analytics', '/analytics', LineChart],
      ['Messages', '/messages', MessageSquare],
      ['Notifications', '/notifications', Bell],
      ['Audit', '/audit', LineChart],
      ['Settings', '/settings', Settings],
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

    for (const u of usersQ.data ?? []) {
      const user = u as { id: string; name?: string | null; email: string; role: string };
      out.push({
        id: `user:${user.id}`,
        label: user.name ?? user.email,
        group: 'Users',
        icon: Users,
        hint: `${user.email} · ${user.role}`,
        keywords: [user.email, user.role],
        onSelect: () => router.push(`/users?selected=${encodeURIComponent(user.id)}`),
      });
    }

    for (const f of flagsQ.data ?? []) {
      const flag = f as { key: string; kind?: string; enabled?: boolean };
      out.push({
        id: `flag:${flag.key}`,
        label: flag.key,
        group: 'Flags',
        icon: Flag,
        hint: flag.enabled ? 'enabled' : 'disabled',
        keywords: [flag.kind ?? ''],
        onSelect: () => router.push(`/feature-flags?selected=${encodeURIComponent(flag.key)}`),
      });
    }

    if (canSwitchTenants && tenantsQ.data) {
      for (const t of tenantsQ.data) {
        out.push({
          id: `tenant:${t.id}`,
          label: `Switch to ${t.name}`,
          group: 'Switch tenant',
          icon: Building2,
          hint: `${t.slug} · ${t.plan}`,
          keywords: [t.slug, t.plan],
          onSelect: async () => {
            try {
              const res = await fetch('/api/active-tenant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ slug: t.slug, next: window.location.pathname }),
              });
              if (!res.ok) throw new Error('switch failed');
              window.location.reload();
            } catch (err) {
              toast({ title: 'Could not switch tenant', description: String(err), tone: 'danger' });
            }
          },
        });
      }
    }

    const personas = listPersonasByGroup();
    for (const p of [...personas.studio, ...personas.tenant, ...personas.customer]) {
      out.push({
        id: `persona:${p.id}`,
        label: `Sign in as ${p.name}`,
        group: 'Personas',
        icon: Users,
        hint: `${p.role} · ${p.tenantSlug}`,
        keywords: [p.email, p.tenantSlug, p.role],
        onSelect: async () => {
          try {
            const res = await fetch('/api/persona', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: p.id }),
            });
            const data = (await res.json()) as { ok: boolean; redirectUrl?: string };
            if (data.ok && data.redirectUrl) window.location.href = data.redirectUrl;
          } catch (err) {
            toast({ title: 'Could not switch persona', description: String(err), tone: 'danger' });
          }
        },
      });
    }

    return out;
  }, [usersQ.data, flagsQ.data, tenantsQ.data, canSwitchTenants, router, toast]);

  return <CommandPalette items={items} />;
}
