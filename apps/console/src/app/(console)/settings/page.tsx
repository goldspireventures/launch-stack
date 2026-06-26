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
  SlideUp,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  useToast} from '@goldspire/ui';
import { SHIPPED_CLONE_TEMPLATE_IDS, studioHasCapability } from '@goldspire/commercial';

const CLONE_TEMPLATE_LABELS: Record<string, string> = {
  'social_matching/dating': 'Heartline (dating)',
  'booking/nova': 'Nova Care (booking)',
};
import { AccessPolicyPanel } from '@/components/access-policy-panel';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';
import { ExternalLink } from 'lucide-react';

function ConsoleWebhookUrls() {
  const base = (process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'http://localhost:4001').replace(/\/$/, '');
  return (
    <div className="space-y-5 text-xs">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Stripe</p>
        <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3">{`${base}/api/webhooks/stripe`}</pre>
      </div>
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Deal staging deploy</p>
        <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3">{`${base}/api/webhooks/studio-deal-deploy`}</pre>
        <p className="mt-2 text-muted-foreground">
          Per-deal secret from Deal desk. Append <code className="text-[11px]">?dealId=…</code> (26-char id) and send{' '}
          <code className="text-[11px]">X-Studio-Deploy-Secret</code> with the raw secret.
        </p>
      </div>
    </div>
  );
}

export default function StudioSettingsPage() {
  const toast = useToast();
  const utils = trpc.useUtils();
  const profileQ = trpc.studio.profileGet.useQuery();
  const assigneesQ = trpc.studio.listLeadAssignees.useQuery();
  const teamAccessQ = trpc.studio.teamAccess.useQuery();
  const inviteMut = trpc.studio.inviteTeamMember.useMutation({
    onSuccess: (res) => {
      void utils.studio.teamAccess.invalidate();
      void utils.studio.listLeadAssignees.invalidate();
      toast.toast({
        title: 'Invite sent',
        description: res.delivery.message,
        tone: 'success',
      });
      setInviteEmail('');
    },
    onError: (e) => toast.toast({ title: 'Invite failed', description: e.message, tone: 'danger' }),
  });
  const cancelInviteMut = trpc.studio.cancelTeamInvite.useMutation({
    onSuccess: () => {
      void utils.studio.teamAccess.invalidate();
      toast.toast({ title: 'Invite cancelled', tone: 'success' });
    },
    onError: (e) => toast.toast({ title: 'Cancel failed', description: e.message, tone: 'danger' }),
  });
  const [inviteEmail, setInviteEmail] = React.useState('');
  const [inviteRole, setInviteRole] = React.useState<'STUDIO_STAFF' | 'STUDIO_OWNER'>('STUDIO_STAFF');
  const role = teamAccessQ.data?.currentUser.role ?? '';
  const canInvite = studioHasCapability(role, 'settings.team');
  const canBilling = studioHasCapability(role, 'billing.read');
  const canRoute = studioHasCapability(role, 'settings.routing');
  const isStudioOwner = role === 'STUDIO_OWNER';
  const integrationsQ = trpc.studio.integrationsCatalog.useQuery();
  const billingQ = trpc.studio.billingSummary.useQuery(undefined, { enabled: canBilling });
  const updateMut = trpc.studio.profileUpdate.useMutation({
    onSuccess: () => {
      void utils.studio.profileGet.invalidate();
      toast.toast({ title: 'Profile saved', tone: 'success' });
    },
    onError: (e) => toast.toast({ title: 'Save failed', description: e.message, tone: 'danger' })});

  const [form, setForm] = React.useState({
    studioName: '',
    logoUrl: '',
    primaryContactEmail: '',
    supportEmail: '',
    supportPhone: '',
    postalAddress: '',
    deskWebhookUrl: '',
    deskAlertsEnabled: true,
    leadAssigneeUserIds: [] as string[],
    leadAssignRoundRobinIndex: 0,
    autoStampOnKickoff: true,
    autoIssuePortalOnConvert: true,
    autoRotateDeployHookOnStamp: true,
    templateAcceptingClones: {} as Record<string, boolean>,
  });

  React.useEffect(() => {
    if (profileQ.data?.profile) setForm(profileQ.data.profile);
  }, [profileQ.data]);

  function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    updateMut.mutate(form);
  }

  const fmtMoney = (minor: number) =>
    new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
      minor / 100,
    );

  return (
    <div className="space-y-6">
      <FadeIn>
        <StudioPageHeader
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
            {canBilling ? <TabsTrigger value="billing">Billing</TabsTrigger> : null}
            <TabsTrigger value="keys">API keys</TabsTrigger>
            <TabsTrigger value="team">Team &amp; access</TabsTrigger>
            {isStudioOwner ? <TabsTrigger value="access-policy">Access policy</TabsTrigger> : null}
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
                    {canRoute ? (
                    <>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-foreground">Enquiry routing</p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        New contact-form leads round-robin to selected operators. Leave none selected for manual triage
                        only.
                      </p>
                      {assigneesQ.isLoading ? (
                        <p className="text-sm text-muted-foreground">Loading team…</p>
                      ) : (
                        <ul className="mb-4 space-y-2">
                          {(assigneesQ.data ?? []).map((u) => {
                            const checked = form.leadAssigneeUserIds.includes(u.id);
                            return (
                              <li key={u.id}>
                                <label className="flex cursor-pointer items-center gap-2 text-sm">
                                  <input
                                    type="checkbox"
                                    className="rounded border"
                                    checked={checked}
                                    onChange={() => {
                                      const next = checked
                                        ? form.leadAssigneeUserIds.filter((id) => id !== u.id)
                                        : [...form.leadAssigneeUserIds, u.id];
                                      setForm({ ...form, leadAssigneeUserIds: next });
                                    }}
                                  />
                                  <span>
                                    {u.name ?? u.email}{' '}
                                    <span className="text-xs text-muted-foreground">({u.role})</span>
                                  </span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-foreground">Clone capacity</p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Turn off accepting new clones when you are at capacity. Marketing shows a waitlist for that
                        template; Desk warns when converting enquiries.
                      </p>
                      <ul className="mb-4 space-y-2">
                        {SHIPPED_CLONE_TEMPLATE_IDS.map((templateId) => {
                          const accepting = form.templateAcceptingClones?.[templateId] !== false;
                          return (
                            <li key={templateId}>
                              <label className="flex cursor-pointer items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded border"
                                  checked={accepting}
                                  onChange={() => {
                                    const prev = form.templateAcceptingClones ?? {};
                                    setForm({
                                      ...form,
                                      templateAcceptingClones: {
                                        ...prev,
                                        [templateId]: !accepting,
                                      },
                                    });
                                  }}
                                />
                                <span>
                                  {CLONE_TEMPLATE_LABELS[templateId] ?? templateId}
                                  <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">{templateId}</span>
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-foreground">Deal alerts</p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Email uses primary contact above. Optional Slack (or any JSON) webhook receives the same ops
                        alerts — new enquiries, lead conversions, kickoff submissions, and milestone payments.
                      </p>
                      <div className="space-y-4">
                        <FormField
                          label="Desk webhook URL"
                          htmlFor="desk-webhook"
                          description="Slack incoming webhook or compatible HTTPS endpoint. Leave blank for email only."
                        >
                          <Input
                            id="desk-webhook"
                            value={form.deskWebhookUrl}
                            onChange={(e) => setForm({ ...form, deskWebhookUrl: e.target.value })}
                            placeholder="https://hooks.slack.com/…"
                          />
                        </FormField>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={form.deskAlertsEnabled}
                            onCheckedChange={(deskAlertsEnabled) => setForm({ ...form, deskAlertsEnabled })}
                          />
                          Send Deal Desk alerts (new leads, payments, 48h runbook blockers)
                        </label>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <p className="mb-3 text-sm font-medium text-foreground">Automation</p>
                      <p className="mb-4 text-xs text-muted-foreground">
                        Reduce manual steps on the solo-founder path. Launch checklist lives in Configure → Launch.
                      </p>
                      <div className="space-y-3">
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={form.autoIssuePortalOnConvert}
                            onCheckedChange={(autoIssuePortalOnConvert) =>
                              setForm({ ...form, autoIssuePortalOnConvert })
                            }
                          />
                          Auto-issue portal + email when converting an enquiry
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={form.autoStampOnKickoff}
                            onCheckedChange={(autoStampOnKickoff) => setForm({ ...form, autoStampOnKickoff })}
                          />
                          Auto-stamp tenant after kickoff payment (default on; discovery/retainer skip)
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <Switch
                            checked={form.autoRotateDeployHookOnStamp}
                            onCheckedChange={(autoRotateDeployHookOnStamp) =>
                              setForm({ ...form, autoRotateDeployHookOnStamp })
                            }
                          />
                          Auto-create deploy webhook secret after auto-stamp
                        </label>
                      </div>
                    </div>
                    </>
                    ) : (
                      <p className="border-t pt-4 text-xs text-muted-foreground">
                        Enquiry routing and Deal Desk webhooks are limited to studio owners.
                      </p>
                    )}
                    <Button type="submit" disabled={updateMut.isPending}>
                      {updateMut.isPending ? 'Saving…' : 'Save changes'}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="integrations">
            <div className="space-y-4">
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
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Console webhook endpoints</CardTitle>
                  <CardDescription>
                    Stripe uses a single signing secret (<code className="text-xs">STRIPE_WEBHOOK_SECRET</code>). Deal
                    deploy hooks use a per-deal secret rotated from each deal&apos;s workspace.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ConsoleWebhookUrls />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Inngest (studio cron)</CardTitle>
                  <CardDescription>
                    Durable jobs for stale enquiry digest and runbook blocker scans. Sync this app in Inngest Cloud;
                    GitHub Actions cron remains a fallback.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-md border bg-muted/40 p-3 text-xs">
                    {`${(process.env.NEXT_PUBLIC_CONSOLE_URL ?? 'http://localhost:4001').replace(/\/$/, '')}/api/inngest`}
                  </pre>
                </CardContent>
              </Card>
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
                <CardContent className="text-xs text-muted-foreground">
                  Stripe-mirrored amounts when present; plan heuristics otherwise.
                </CardContent>
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
                    {billingQ.data?.churnRate != null
                      ? `${(billingQ.data.churnRate * 100).toFixed(1)}%`
                      : '—'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">30-day cancel rate from subscription rows.</CardContent>
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
                <CardDescription>
                  Revenue trajectory chart — ledger export in a future release.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 text-sm text-muted-foreground">
                  Chart wiring reserved — connect ledger export when available.
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="team">
            <div className="grid gap-4 lg:grid-cols-2">
              {canInvite ? (
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-base">Invite operator</CardTitle>
                    <CardDescription>
                      Sends a Supabase invite in production; mock mode explains activation in the success toast.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form
                      className="flex flex-col gap-3 sm:flex-row sm:items-end"
                      onSubmit={(e) => {
                        e.preventDefault();
                        const email = inviteEmail.trim();
                        if (!email) return;
                        inviteMut.mutate({ email, role: inviteRole });
                      }}
                    >
                      <FormField label="Email" htmlFor="invite-email" className="min-w-[12rem] flex-1">
                        <Input
                          id="invite-email"
                          type="email"
                          autoComplete="email"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          placeholder="operator@goldspire.studio"
                          disabled={inviteMut.isPending}
                        />
                      </FormField>
                      <FormField label="Role" htmlFor="invite-role">
                        <select
                          id="invite-role"
                          className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                          value={inviteRole}
                          onChange={(e) =>
                            setInviteRole(e.target.value as 'STUDIO_STAFF' | 'STUDIO_OWNER')
                          }
                          disabled={inviteMut.isPending}
                        >
                          <option value="STUDIO_STAFF">STUDIO_STAFF</option>
                          <option value="STUDIO_OWNER">STUDIO_OWNER</option>
                        </select>
                      </FormField>
                      <Button type="submit" disabled={inviteMut.isPending || !inviteEmail.trim()}>
                        {inviteMut.isPending ? 'Sending…' : 'Send invite'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              ) : null}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Studio operators</CardTitle>
                  <CardDescription>
                    Goldspire tenant roles. Pending invites activate when the operator signs in with the same email.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {teamAccessQ.isLoading ? (
                    <p className="text-sm text-muted-foreground">Loading team…</p>
                  ) : (
                    <ul className="space-y-3">
                      {(teamAccessQ.data?.team ?? []).map((u) => (
                        <li
                          key={u.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm"
                        >
                          <div>
                            <p className="font-medium">{u.name ?? u.email}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="text-[10px] uppercase">
                              {u.status}
                            </Badge>
                            <Badge variant={u.role === 'STUDIO_OWNER' ? 'default' : 'secondary'}>{u.role}</Badge>
                            {canInvite && u.status === 'invited' ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                disabled={cancelInviteMut.isPending}
                                onClick={() => cancelInviteMut.mutate({ userId: u.id })}
                              >
                                Cancel
                              </Button>
                            ) : null}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your access</CardTitle>
                  <CardDescription>
                    Signed in as {teamAccessQ.data?.currentUser.email ?? '…'} (
                    {teamAccessQ.data?.currentUser.role ?? '…'})
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Console capabilities
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {(teamAccessQ.data?.capabilities ?? []).map((cap) => (
                        <Badge key={cap} variant="outline" className="font-mono text-[10px]">
                          {cap}
                        </Badge>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-lg border bg-muted/20 p-3 text-xs text-muted-foreground">
                    <p className="mb-2 font-medium text-foreground">Enquiry lifecycle (automatic)</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>Opening a <strong>New</strong> enquiry → <strong>Reviewing</strong></li>
                      <li>Unassigned enquiry opened → assigned to you</li>
                      <li>Convert → deal + status <strong>Converted</strong> (not manual)</li>
                    </ul>
                    <p className="mt-3 font-medium text-foreground">Product vs business access</p>
                    <ul className="list-inside list-disc space-y-1">
                      <li>
                        <strong>Business</strong> — studio tenant roles (owner/staff), routing pool, billing
                      </li>
                      <li>
                        <strong>Product</strong> — per-deal portal links with scopes (view, accept, pay, intake, note);
                        issue full or view-only links from the deal desk
                      </li>
                    </ul>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/leads">Open enquiries</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {isStudioOwner ? (
            <TabsContent value="access-policy">
              <AccessPolicyPanel />
            </TabsContent>
          ) : null}

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
                      onClick={() =>
                      toast.toast({
                        title: 'Rotation queued',
                        description: 'Demo only — connect HSM-backed rotation before production.',
                        tone: 'default'})
                    }
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
