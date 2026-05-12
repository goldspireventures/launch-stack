'use client';

/**
 * Studio settings persistence: `metadata.consoleStudioProfile` on the tenant
 * with `slug = 'goldspire'` (see `studio.profileGet` / `profileUpdate` in
 * `@goldspire/api`). No new tables — JSON merge on the existing row.
 */

import * as React from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FadeIn,
  FormField,
  Input,
  PageHeader,
  SlideUp,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';
import { ExternalLink } from 'lucide-react';

export default function StudioSettingsPage() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const profileQ = trpc.studio.profileGet.useQuery();
  const integrationsQ = trpc.studio.integrationsCatalog.useQuery();
  const billingQ = trpc.studio.billingSummary.useQuery();
  const updateMut = trpc.studio.profileUpdate.useMutation({
    onSuccess: () => {
      void utils.studio.profileGet.invalidate();
      toast.toast({ title: 'Profile saved', tone: 'success' });
    },
    onError: (e) => toast.toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });

  const [form, setForm] = React.useState({
    studioName: '',
    logoUrl: '',
    primaryContactEmail: '',
    supportEmail: '',
    supportPhone: '',
    postalAddress: '',
  });

  React.useEffect(() => {
    if (profileQ.data?.profile) setForm(profileQ.data.profile);
  }, [profileQ.data]);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    updateMut.mutate(form);
  }

  const fmtMoney = (minor: number) =>
    new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
      minor / 100,
    );

  return (
    <div className="space-y-6">
      <FadeIn>
        <PageHeader
          title="Studio settings"
          description="Identity, integrations, and internal billing signals for the Goldspire studio."
          eyebrow="System"
        />
      </FadeIn>

      <SlideUp delay={0.04}>
        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="flex flex-wrap gap-1">
            <TabsTrigger value="profile">Studio profile</TabsTrigger>
            <TabsTrigger value="integrations">Integrations</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
            <TabsTrigger value="keys">API keys</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Studio profile</CardTitle>
                <CardDescription>Public-facing studio identity surfaced in contracts and support flows.</CardDescription>
              </CardHeader>
              <CardContent>
                {profileQ.isLoading ? (
                  <p className="text-sm text-muted-foreground">Loading…</p>
                ) : (
                  <form className="max-w-xl space-y-4" onSubmit={saveProfile}>
                    <FormField label="Studio name" htmlFor="sn" required>
                      <Input id="sn" value={form.studioName} onChange={(e) => setForm({ ...form, studioName: e.target.value })} />
                    </FormField>
                    <FormField label="Logo URL" htmlFor="logo" description="HTTPS URL to a square mark; leave blank to use the default mark.">
                      <Input
                        id="logo"
                        value={form.logoUrl}
                        onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
                        placeholder="https://…"
                      />
                    </FormField>
                    <FormField label="Primary contact email" htmlFor="pe" required>
                      <Input
                        id="pe"
                        type="email"
                        value={form.primaryContactEmail}
                        onChange={(e) => setForm({ ...form, primaryContactEmail: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Support email" htmlFor="se" required>
                      <Input
                        id="se"
                        type="email"
                        value={form.supportEmail}
                        onChange={(e) => setForm({ ...form, supportEmail: e.target.value })}
                      />
                    </FormField>
                    <FormField label="Support phone" htmlFor="ph">
                      <Input id="ph" value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} />
                    </FormField>
                    <FormField label="Postal address" htmlFor="addr">
                      <Input id="addr" value={form.postalAddress} onChange={(e) => setForm({ ...form, postalAddress: e.target.value })} />
                    </FormField>
                    <Button type="submit" disabled={updateMut.isPending}>
                      {updateMut.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="grid gap-4 md:grid-cols-2">
              {integrationsQ.isLoading && <p className="text-sm text-muted-foreground">Loading providers…</p>}
              {integrationsQ.data?.map((p) => (
                <Card key={p.id}>
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                    <div>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      <CardDescription className="mt-1 font-mono text-xs">{p.envKeys.join(' · ')}</CardDescription>
                    </div>
                    <Badge variant={p.hasReal ? 'default' : 'secondary'}>{p.mode}</Badge>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      hasRealProvider.* → {String(p.hasReal)}
                    </span>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={p.docsUrl} target="_blank" rel="noreferrer">
                        Configure
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="billing">
            <div className="grid gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Portfolio MRR</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {billingQ.data ? fmtMoney(billingQ.data.totalMrrMinor) : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">Sum of active / trialing subs (plan heuristics).</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Active subscriptions</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{billingQ.data?.activeSubscriptions ?? '—'}</CardTitle>
                </CardHeader>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Churn (rolling)</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">
                    {billingQ.data ? `${(billingQ.data.churnRate * 100).toFixed(1)}%` : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">Illustrative benchmark for now.</CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Trialing tenants</CardDescription>
                  <CardTitle className="text-2xl tabular-nums">{billingQ.data?.trialingTenants ?? '—'}</CardTitle>
                </CardHeader>
              </Card>
            </div>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-base">MRR trajectory</CardTitle>
                <CardDescription>Placeholder for Stripe revenue recognition export.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground">
                  Chart wiring reserved — connect ledger export in v2.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="keys">
            <Card>
              <CardHeader>
                <CardTitle>Studio-issued keys</CardTitle>
                <CardDescription>Mock listing — rotate flows to HSM-backed storage in production.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-4 py-3">
                  <div>
                    <p className="font-mono text-sm">gs_live_•••••••••••abc1</p>
                    <p className="text-xs text-muted-foreground">Console automation · created 30 days ago</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch id="ro" disabled checked={false} />
                      <label htmlFor="ro" className="text-xs text-muted-foreground">
                        Read-only
                      </label>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => toast.toast({ title: 'Rotation queued', description: 'Mock — no key material rotated.', tone: 'default' })}
                    >
                      Rotate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </SlideUp>
    </div>
  );
}
