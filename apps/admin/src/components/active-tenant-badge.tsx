'use client';

import * as React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import * as Popover from '@radix-ui/react-popover';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, ChevronsUpDown, Search, ArrowUpRight } from 'lucide-react';
import { Skeleton, useToast } from '@goldspire/ui';
import { env } from '@goldspire/config/env';
import { trpc } from '@/lib/trpc';

/**
 * Topbar tenant switcher. Was previously a `<Link>` to `/select-tenant`; now
 * a popover dropdown that searches, lists, and switches in a single click.
 *
 * Studio operators see every tenant; tenant operators see only their own
 * (they don't have permission to list others). The full-page picker still
 * exists at `/select-tenant` for first-time / programmatic use.
 *
 * Cookie write goes through the existing POST /api/active-tenant; on
 * success we refresh the layout to re-resolve with the new tenant lens.
 */
export interface ActiveTenantBadgeProps {
  /** True when the current user has cross-tenant permission. Drives whether
   * the dropdown queries the full tenant list or just shows the current one. */
  canSwitchTenants?: boolean;
}

export function ActiveTenantBadge({ canSwitchTenants = false }: ActiveTenantBadgeProps = {}) {
  const pathname = usePathname() ?? '/dashboard';
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [busy, setBusy] = React.useState<string | null>(null);

  const utils = trpc.useUtils();
  const currentQ = trpc.tenants.current.useQuery(undefined, { staleTime: 0 });
  const listQ = trpc.tenants.list.useQuery(undefined, {
    staleTime: 60_000,
    // Only fetch the full list when the popover opens and we have access.
    enabled: open && canSwitchTenants,
  });

  const current = currentQ.data;
  // For tenant admins we only show their own tenant (no list query). For
  // studio operators we fetch every tenant when the popover opens.
  const tenants = canSwitchTenants
    ? listQ.data ?? []
    : current
      ? [current]
      : [];
  const filtered = React.useMemo(() => {
    const s = query.trim().toLowerCase();
    if (!s) return tenants;
    return tenants.filter(
      (t) =>
        t.name.toLowerCase().includes(s) ||
        t.slug.toLowerCase().includes(s) ||
        t.plan.toLowerCase().includes(s),
    );
  }, [tenants, query]);

  async function pick(slug: string) {
    if (busy) return;
    if (slug === current?.slug) {
      setOpen(false);
      return;
    }
    setBusy(slug);
    try {
      const res = await fetch('/api/active-tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, next: pathname }),
      });
      if (!res.ok) throw new Error('switch failed');
      const data = (await res.json()) as { ok: boolean; next: string };
      const name = tenants.find((t) => t.slug === slug)?.name ?? slug;
      toast({
        title: `Switched to ${name}`,
        tone: 'success',
      });
      setOpen(false);
      setQuery('');
      void utils.tenants.current.invalidate();
      void utils.users.list.invalidate();
      void utils.products.list.invalidate();
      void utils.subscriptions.list.invalidate();
      router.refresh();
      if (data.next && data.next !== pathname) router.push(data.next);
    } catch (err) {
      toast({ title: 'Could not switch tenant', description: String(err), tone: 'danger' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          title="Switch tenant"
          className="group inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium transition hover:border-primary/40 hover:bg-primary/5 data-[state=open]:border-primary/40 data-[state=open]:bg-primary/5"
        >
          <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
          <span className="hidden text-muted-foreground sm:inline">Managing</span>
          {currentQ.isLoading ? (
            <Skeleton className="h-3 w-20" />
          ) : current ? (
            <>
              <span className="font-semibold">{current.name}</span>
              <span className="hidden text-muted-foreground sm:inline">· {current.slug}</span>
            </>
          ) : (
            <span className="font-semibold text-muted-foreground">Pick a tenant</span>
          )}
          <ChevronsUpDown className="h-3 w-3 opacity-60 transition-transform group-data-[state=open]:rotate-180 group-hover:opacity-100" />
        </button>
      </Popover.Trigger>
      <AnimatePresence>
        {open && (
          <Popover.Portal forceMount>
            <Popover.Content asChild align="end" sideOffset={8}>
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="z-50 w-[320px] overflow-hidden rounded-lg border border-border bg-popover text-popover-foreground shadow-xl"
              >
                <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    autoFocus
                    placeholder="Search tenants…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                  />
                  <span className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline">
                    {filtered.length}
                  </span>
                </div>
                <ul className="max-h-[280px] overflow-y-auto">
                  {listQ.isLoading && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">Loading…</li>
                  )}
                  {!listQ.isLoading && filtered.length === 0 && (
                    <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                      No tenants match.
                    </li>
                  )}
                  {filtered.map((t) => {
                    const isCurrent = t.slug === current?.slug;
                    const isBusy = busy === t.slug;
                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          onClick={() => pick(t.slug)}
                          disabled={isBusy}
                          className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors hover:bg-muted/60 disabled:cursor-progress disabled:opacity-60"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-medium">{t.name}</p>
                            <p className="truncate text-xs text-muted-foreground">
                              <span className="font-mono">{t.slug}</span> · {t.plan}
                            </p>
                          </div>
                          {isCurrent && (
                            <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                          )}
                          {isBusy && (
                            <span className="h-3 w-3 shrink-0 animate-spin rounded-full border-2 border-primary border-r-transparent" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {canSwitchTenants && (
                  <div className="border-t border-border bg-muted/30 px-3 py-2">
                    <a
                      href={`${env.NEXT_PUBLIC_CONSOLE_URL}/tenants`}
                      className="flex items-center justify-between text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <span>See all tenants in Console</span>
                      <ArrowUpRight className="h-3 w-3" />
                    </a>
                  </div>
                )}
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}
