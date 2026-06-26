'use client';

import * as React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  BookOpen,
  Building2,
  Copy,
  CreditCard,
  Flag,
  Handshake,
  Inbox,
  Layers,
  LayoutDashboard,
  LineChart,
  MessageSquarePlus,
  Globe,
  Sparkles,
  UserCog,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { CommandPalette, type CommandItem, useToast } from '@goldspire/ui';
import { listPersonasByGroup } from '@goldspire/config';
import { env } from '@goldspire/config/env';
import { trpc } from '@/lib/trpc';
import { dispatchDealPostUpdate, readDealPortalUrl } from '@/lib/deal-portal-session';
import { marketingSiteUrl } from '@/lib/marketing-site-url';
import { CONSOLE_OS_MODES, CONSOLE_ZONES } from '@goldspire/commercial';

const DEAL_PATH = /^\/deals\/([0-9A-HJKMNP-TV-Z]{26})$/i;

export interface ConsoleCommandPaletteProps {
  personaId?: string | null;
}

export function ConsoleCommandPalette({ personaId = null }: ConsoleCommandPaletteProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const tenantsQ = trpc.tenants.list.useQuery(undefined, { staleTime: 60_000 });
  const flagsQ = trpc.catalog.listFeatureFlags.useQuery(undefined, { staleTime: 60_000 });

  const dealMatch = pathname?.match(DEAL_PATH);
  const activeDealId = dealMatch?.[1] ?? null;

  const items: CommandItem[] = React.useMemo(() => {
    const out: CommandItem[] = [];

    if (activeDealId) {
      const portalUrl = readDealPortalUrl(activeDealId);
      out.push({
        id: `deal:${activeDealId}:post`,
        label: 'Post client update',
        group: 'This deal',
        icon: MessageSquarePlus,
        hint: 'Opens Timeline module',
        keywords: ['timeline', 'notify', 'client'],
        onSelect: () => {
          dispatchDealPostUpdate();
          router.push(`/deals/${activeDealId}`);
        },
      });
      if (portalUrl) {
        out.push({
          id: `deal:${activeDealId}:copy-portal`,
          label: 'Copy client portal link',
          group: 'This deal',
          icon: Copy,
          hint: 'From this browser session',
          keywords: ['portal', 'url', 'client'],
          onSelect: async () => {
            await navigator.clipboard.writeText(portalUrl);
            toast({ title: 'Portal link copied', tone: 'success' });
          },
        });
        out.push({
          id: `deal:${activeDealId}:open-portal`,
          label: 'Open client portal',
          group: 'This deal',
          icon: Handshake,
          hint: portalUrl,
          onSelect: () => window.open(portalUrl, '_blank', 'noopener,noreferrer'),
        });
      } else {
        out.push({
          id: `deal:${activeDealId}:portal-desk`,
          label: 'Issue portal link (Deal desk)',
          group: 'This deal',
          icon: Handshake,
          hint: 'Delivery module',
          onSelect: () => router.push(`/deals/${activeDealId}`),
        });
      }
    }

    out.push({
      id: 'external:marketing-site',
      label: 'Open public site',
      group: 'External',
      icon: Globe,
      hint: marketingSiteUrl(),
      keywords: ['goldspire', 'marketing', '3010', 'templates', 'website'],
      onSelect: () => window.open(marketingSiteUrl(), '_blank', 'noopener,noreferrer'),
    });

    for (const mode of CONSOLE_OS_MODES) {
      out.push({
        id: `mode:${mode.id}`,
        label: mode.label,
        group: 'Console OS',
        icon: mode.id === 'desk' ? LayoutDashboard : mode.id === 'pipeline' ? Inbox : Handshake,
        hint: mode.href,
        onSelect: () => router.push(mode.href),
      });
    }

    out.push({
      id: 'configure:charter',
      label: 'Studio charter',
      group: 'Console OS',
      icon: BookOpen,
      hint: 'What we sell & where we stop',
      onSelect: () => router.push('/configure?tab=charter'),
    });

    for (const zone of CONSOLE_ZONES) {
      for (const link of zone.links) {
        const icon =
          link.href.startsWith('/leads')
            ? Inbox
            : link.href.startsWith('/deals')
              ? Handshake
              : link.href.startsWith('/factory') || link.href.startsWith('/onboard')
                ? Sparkles
                : link.href.startsWith('/reports') || link.href.startsWith('/audit')
                  ? LineChart
                  : link.href.startsWith('/catalog') || link.href.startsWith('/blueprints')
                    ? Layers
                    : link.href.startsWith('/commercial')
                      ? CreditCard
                      : BookOpen;
        out.push({
          id: `zone:${zone.id}:${link.href}`,
          label: link.label,
          group: zone.label,
          icon,
          hint: link.description ?? link.href,
          keywords: [zone.id, zone.description],
          onSelect: () => router.push(link.href),
        });
      }
    }

    const shortcuts: Array<[string, string, LucideIcon]> = [
      ['Dating · Web launch', '/deals/new?preset=tier1-dating', Handshake],
      ['Dating · As-is accelerator', '/deals/new?preset=tier1-dating-as-is', Handshake],
      ['Dating · Web + companion', '/deals/new?preset=tier1-dating-companion', Handshake],
      ['Dating · Web + native', '/deals/new?preset=tier1-dating-native', Handshake],
      ['Tier 1 booking deal', '/deals/new?preset=tier1-booking', Handshake],
      ['Settings', '/settings', UserCog],
    ];
    for (const [label, href, Icon] of shortcuts) {
      out.push({
        id: `shortcut:${href}`,
        label,
        group: 'Shortcuts',
        icon: Icon,
        hint: href,
        onSelect: () => router.push(href),
      });
    }

    for (const t of tenantsQ.data ?? []) {
      out.push({
        id: `tenant:${t.id}`,
        label: t.name,
        group: 'Tenants',
        hint: `${t.slug} · ${t.plan}`,
        icon: Building2,
        keywords: [t.slug, t.plan],
        onSelect: () => {
          const params = new URLSearchParams({ slug: t.slug, next: '/dashboard' });
          if (personaId) params.set('persona', personaId);
          window.location.href = `${env.NEXT_PUBLIC_ADMIN_URL}/api/active-tenant?${params.toString()}`;
        },
      });
    }

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
            if (data.ok && data.redirectUrl) window.location.href = data.redirectUrl;
          } catch (err) {
            toast({ title: 'Could not switch persona', description: String(err), tone: 'danger' });
          }
        },
      });
    }

    for (const f of flagsQ.data ?? []) {
      out.push({
        id: `flag:${f.key}`,
        label: f.key,
        group: 'Feature flags',
        icon: Flag,
        hint: f.kind,
        keywords: [f.kind, ...(f.tags ?? [])],
        onSelect: () => router.push(`/catalog/feature-flags?selected=${encodeURIComponent(f.key)}`),
      });
    }

    return out;
  }, [activeDealId, tenantsQ.data, flagsQ.data, router, toast, personaId]);

  return <CommandPalette items={items} />;
};
