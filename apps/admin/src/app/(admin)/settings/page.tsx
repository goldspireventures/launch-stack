'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  LoadingState,
  PageHeader,
  SectionCard,
  StatusBadge,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

const STUDIO_URL =
  typeof process !== 'undefined'
    ? (process.env.NEXT_PUBLIC_STUDIO_URL ?? process.env.STUDIO_URL ?? 'http://localhost:4001')
    : 'http://localhost:4001';

type DomainRow = { host: string; status: 'pending' | 'verified' };

export default function SettingsPage() {
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const tenant = trpc.tenants.current.useQuery();
  const health = trpc.health.status.useQuery();
  const users = trpc.users.list.useQuery();

  const selfUpdate = trpc.tenants.selfUpdate.useMutation({
    onSuccess: () => {
      utils.tenants.current.invalidate();
      toast({ title: 'Settings saved', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });

  const mockMonthlySpend = useMemo(() => {
    const plan = tenant.data?.plan ?? 'studio';
    const fmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
    if (plan === 'enterprise') return fmt.format(4800);
    if (plan === 'studio') return fmt.format(299);
    return fmt.format(0);
  }, [tenant.data?.plan]);

  const [name, setName] = useState('');
  const [locale, setLocale] = useState('en');
  const [timezone, setTimezone] = useState('UTC');
  const [primaryHex, setPrimaryHex] = useState('#6366f1');
  const [logoUrl, setLogoUrl] = useState('');
  const [darkMode, setDarkMode] = useState(false);
  const [domains, setDomains] = useState<DomainRow[]>([
    { host: 'app.heartline.example.com', status: 'verified' },
    { host: 'staging.heartline.example.com', status: 'pending' },
  ]);
  const [newDomain, setNewDomain] = useState('');
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!tenant.data) return;
    const m = (tenant.data.metadata ?? {}) as Record<string, unknown>;
    const th = (tenant.data.theme ?? {}) as Record<string, unknown>;
    setName(tenant.data.name);
    setLocale(String(m.defaultLocale ?? 'en'));
    setTimezone(String(m.defaultTimezone ?? 'UTC'));
    setPrimaryHex(String(th.accent ?? '#6366f1'));
    setLogoUrl(String(th.logoUrl ?? ''));
    setDarkMode(Boolean(m.brandDarkMode));
  }, [tenant.data]);

  const memberCount = users.data?.length ?? 0;

  const slug = tenant.data?.slug ?? '—';

  const copySlug = async () => {
    try {
      await navigator.clipboard.writeText(slug);
      toast({ title: 'Slug copied', tone: 'success' });
    } catch {
      toast({ title: 'Copy failed', tone: 'warning' });
    }
  };

  const saveProfile = () => {
    selfUpdate.mutate({
      name,
      defaultLocale: locale,
      defaultTimezone: timezone,
    });
  };

  const saveBranding = () => {
    selfUpdate.mutate({
      branding: {
        primaryHex,
        logoUrl: logoUrl.trim() === '' ? '' : logoUrl,
        darkMode,
      },
    });
  };

  if (tenant.isLoading || health.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Tenant profile, branding, billing shortcuts, and provider status."
      />

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1 bg-muted/40 p-1">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="billing">Plan & billing</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <SectionCard title="Tenant profile" description="Name and regional defaults. Slug is immutable here.">
            <div className="grid max-w-xl gap-4">
              <div className="space-y-2">
                <Label htmlFor="t-name">Tenant name</Label>
                <Input id="t-name" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Slug</Label>
                <div className="flex gap-2">
                  <Input readOnly value={slug} className="font-mono text-sm" />
                  <Button type="button" variant="outline" onClick={copySlug}>
                    Copy
                  </Button>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="t-locale">Default locale</Label>
                  <Input id="t-locale" value={locale} onChange={(e) => setLocale(e.target.value)} placeholder="en" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="t-tz">Timezone</Label>
                  <Input id="t-tz" value={timezone} onChange={(e) => setTimezone(e.target.value)} placeholder="UTC" />
                </div>
              </div>
              <Button type="button" onClick={saveProfile} disabled={selfUpdate.isPending}>
                Save profile
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="branding" className="space-y-4">
          <SectionCard title="Branding" description="Theme tokens stored on the tenant row (no migration).">
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="brand-color">Primary color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="brand-color"
                      value={primaryHex}
                      onChange={(e) => setPrimaryHex(e.target.value)}
                      className="font-mono"
                    />
                    <input
                      type="color"
                      aria-label="Pick primary color"
                      className="h-10 w-14 cursor-pointer rounded border bg-background"
                      value={primaryHex.match(/^#[0-9a-fA-F]{6}$/) ? primaryHex : '#6366f1'}
                      onChange={(e) => setPrimaryHex(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo-url">Logo URL</Label>
                  <Input id="logo-url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://…" />
                </div>
                <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">Dark mode preview</p>
                    <p className="text-xs text-muted-foreground">Stored in tenant metadata for preview tiles.</p>
                  </div>
                  <Switch checked={darkMode} onCheckedChange={setDarkMode} />
                </div>
                <Button type="button" onClick={saveBranding} disabled={selfUpdate.isPending}>
                  Save branding
                </Button>
              </div>
              <Card
                className="overflow-hidden"
                style={
                  {
                    ['--preview-accent' as string]: primaryHex,
                  } as CSSProperties
                }
              >
                <div
                  className="border-b px-4 py-3 text-sm font-medium text-[color:var(--preview-accent)]"
                  style={{ backgroundColor: `${primaryHex}18` }}
                >
                  Live preview
                </div>
                <CardContent
                  className={`space-y-3 p-4 ${darkMode ? 'bg-zinc-950 text-zinc-50' : 'bg-background text-foreground'}`}
                >
                  {logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoUrl} alt="" className="h-10 w-auto max-w-full object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground">No logo URL — add one to preview marks.</div>
                  )}
                  <div
                    className="h-2 w-24 rounded-full"
                    style={{ backgroundColor: primaryHex.match(/^#[0-9a-fA-F]{6}$/) ? primaryHex : '#6366f1' }}
                  />
                  <Button size="sm" className="pointer-events-none opacity-90">
                    Sample CTA
                  </Button>
                </CardContent>
              </Card>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <SectionCard
            title="Plan & billing"
            description="Figures below are mocked for the admin shell until Stripe summaries are wired."
          >
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Current plan</span>
              <Badge className="capitalize">{tenant.data?.plan ?? '—'}</Badge>
              <StatusBadge status={tenant.data?.status ?? 'unknown'} />
            </div>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-xs text-muted-foreground">Monthly spend (mock)</dt>
                <dd className="mt-1 font-semibold">{mockMonthlySpend}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Next bill date (mock)</dt>
                <dd className="mt-1 font-semibold">Jun 1, 2026</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Console</dt>
                <dd className="mt-1 font-mono text-xs">{STUDIO_URL}</dd>
              </div>
            </dl>
            <Button type="button" className="mt-4" onClick={() => setUpgradeOpen(true)}>
              Upgrade plan
            </Button>
          </SectionCard>

          <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Choose a plan</DialogTitle>
                <DialogDescription>
                  Studio billing is managed in the Goldspire console. Pick a tier to open the public plans page.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-2">
                {(['Free', 'Studio', 'Enterprise'] as const).map((label) => (
                  <Button key={label} type="button" variant="outline" className="justify-between" asChild>
                    <a href={`${STUDIO_URL}/plans`} target="_blank" rel="noreferrer">
                      {label}
                      <span className="text-xs text-muted-foreground">Open console</span>
                    </a>
                  </Button>
                ))}
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setUpgradeOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="domains" className="space-y-4">
          <SectionCard title="Custom domains" description="Mocked UI — production would trigger DNS verification jobs.">
            <ul className="space-y-2">
              {domains.map((d) => (
                <li key={d.host} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                  <span className="font-mono">{d.host}</span>
                  <Badge variant={d.status === 'verified' ? 'success' : 'secondary'}>{d.status}</Badge>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="links.yourbrand.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                className="sm:max-w-md"
              />
              <Button
                type="button"
                onClick={() => {
                  const host = newDomain.trim();
                  if (!host) return;
                  setDomains((prev) => [...prev, { host, status: 'pending' }]);
                  setNewDomain('');
                  toast({
                    title: 'Domain queued (demo)',
                    description: 'Verification would run in production.',
                    tone: 'info',
                  });
                }}
              >
                Add domain
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="members" className="space-y-4">
          <SectionCard title="Members" description="Manage seats, roles, and invites on the dedicated users screen.">
            <p className="text-sm text-muted-foreground">
              Avoid duplicating the roster here — open Users for full table actions.
            </p>
            <Button className="mt-4" asChild>
              <Link href="/users">
                Open users
                <Badge variant="secondary" className="ml-2">
                  {memberCount}
                </Badge>
              </Link>
            </Button>
          </SectionCard>
        </TabsContent>
      </Tabs>

      <SectionCard title="Provider status" description="Which integrations are running live vs mock.">
        <ul className="space-y-2 text-sm">
          {Object.entries(health.data?.providers ?? {}).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between">
              <span className="capitalize">{k}</span>
              <StatusBadge status={v === 'live' ? 'active' : 'inactive'} />
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}
