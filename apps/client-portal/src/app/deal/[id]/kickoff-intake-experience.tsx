'use client';

import { useMemo, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CommandPanel,
  FormField,
  Input,
  Textarea,
  useToast,
} from '@goldspire/ui';
import type { RouterOutputs } from '@goldspire/api/client';
import {
  type KickoffArchetypeId,
  type SocialMatchingIntakeAnswers,
  applyKickoffArchetype,
  buildKickoffMirrorSummary,
  resolveKickoffArchetypeFromAnswers,
  validateKickoffChapter,
  discoveryModelToSlider,
  discoverySliderToModel,
  matchingRulesToSlider,
  matchingSliderToRules,
  messagingPolicyToSlider,
  messagingSliderToPolicy,
  socialMatchingIntakeAnswersSchema,
  socialMatchingIntakeDraftSchema,
} from '@goldspire/validation';
import {
  TIER2_KICKOFF_TEMPLATE_OPTIONS,
  intakeNeedsTargetTemplateSpec,
} from '@goldspire/commercial';
import { trpc } from '@/lib/trpc';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Compass,
  LayoutGrid,
  Lock,
  MessagesSquare,
  Sparkles,
  Zap,
} from 'lucide-react';

const CHAPTERS = [
  'Start',
  'Shape',
  'Story',
  'Audience',
  'Why you',
  'Feel',
  'Launch',
  'Trust',
  'Sign-off',
  'Review',
] as const;

const ARCHETYPES: {
  id: KickoffArchetypeId;
  title: string;
  subtitle: string;
  Icon: typeof Zap;
  gradient: string;
  ring: string;
  preview: 'swipe' | 'grid' | 'hybrid' | 'compass';
}[] = [
  {
    id: 'quick_connect',
    title: 'Quick connections',
    subtitle: 'Swipe-first, mutual interest, chat opens after a match.',
    Icon: Zap,
    gradient: 'from-rose-500/25 via-fuchsia-500/15 to-transparent',
    ring: 'ring-rose-400/30',
    preview: 'swipe',
  },
  {
    id: 'browse_first',
    title: 'Browse profiles first',
    subtitle: 'Grid or directory feel before someone reaches out.',
    Icon: LayoutGrid,
    gradient: 'from-sky-500/25 via-cyan-500/15 to-transparent',
    ring: 'ring-sky-400/30',
    preview: 'grid',
  },
  {
    id: 'flexible_social',
    title: 'Flexible social',
    subtitle: 'Hybrid discovery with some messaging before a full match.',
    Icon: MessagesSquare,
    gradient: 'from-violet-500/25 via-indigo-500/15 to-transparent',
    ring: 'ring-violet-400/30',
    preview: 'hybrid',
  },
  {
    id: 'help_me_decide',
    title: 'Help us decide',
    subtitle: 'You want our recommendation on the right defaults.',
    Icon: Compass,
    gradient: 'from-amber-500/20 via-slate-500/15 to-transparent',
    ring: 'ring-amber-400/25',
    preview: 'compass',
  },
];

function ShapePreview({ kind }: { kind: 'swipe' | 'grid' | 'hybrid' | 'compass' }) {
  if (kind === 'swipe') {
    return (
      <div className="relative mx-auto flex h-20 w-28 items-center justify-center" aria-hidden>
        <span className="absolute left-2 top-3 h-16 w-11 -rotate-6 rounded-xl border border-white/20 bg-white/10 shadow-md" />
        <span className="absolute left-6 top-2 h-16 w-11 rounded-xl border border-white/25 bg-white/15 shadow-lg" />
        <span className="absolute left-10 top-4 h-16 w-11 rotate-6 rounded-xl border border-white/20 bg-white/10 shadow-md" />
      </div>
    );
  }
  if (kind === 'grid') {
    return (
      <div className="mx-auto grid h-20 w-28 grid-cols-2 gap-1.5 p-1" aria-hidden>
        {Array.from({ length: 4 }).map((_, i) => (
          <span key={i} className="rounded-md border border-white/20 bg-white/10" />
        ))}
      </div>
    );
  }
  if (kind === 'hybrid') {
    return (
      <div className="mx-auto flex h-20 w-28 flex-col justify-center gap-2 px-1" aria-hidden>
        <div className="flex justify-center gap-1">
          <span className="h-6 w-6 rounded-full border border-white/25 bg-white/15" />
          <span className="h-6 w-6 rounded-full border border-white/25 bg-white/10" />
        </div>
        <div className="flex justify-center gap-1">
          <span className="h-5 flex-1 rounded border border-white/20 bg-white/10" />
          <span className="h-5 flex-1 rounded border border-white/20 bg-white/10" />
        </div>
      </div>
    );
  }
  return (
    <div className="relative mx-auto flex h-20 w-28 items-center justify-center" aria-hidden>
      <span className="absolute left-1/2 top-1/2 h-px w-9 -translate-x-1/2 -translate-y-1/2 bg-white/35" />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-white/10">
        <span className="h-7 w-px bg-white/40" />
      </span>
    </div>
  );
}

function answersToForm(a: Partial<SocialMatchingIntakeAnswers>): Record<string, string> {
  const keys = Object.keys(socialMatchingIntakeAnswersSchema.shape) as (keyof SocialMatchingIntakeAnswers)[];
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = a[k];
    out[k] = v === undefined || v === null ? '' : String(v);
  }
  return out;
}

function pruneDraftPatch(raw: Record<string, string>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const t = v.trim();
    if (!t) continue;
    patch[k] = t;
  }
  const parsed = socialMatchingIntakeDraftSchema.safeParse(patch);
  return parsed.success ? parsed.data : patch;
}

function formToSubmitPayload(raw: Record<string, string>): SocialMatchingIntakeAnswers {
  const o: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    const t = v.trim();
    if (t) o[k] = t;
  }
  return socialMatchingIntakeAnswersSchema.parse(o);
}

export type PortalDealIntake = NonNullable<RouterOutputs['portalDeals']['summary']['intake']>;

const LAUNCH_OPTS: SocialMatchingIntakeAnswers['launchTarget'][] = [
  'private_beta',
  'public_beta',
  'soft_launch',
  'full_launch',
  'unsure',
];
const MONET_OPTS: SocialMatchingIntakeAnswers['monetizationModel'][] = [
  'free_only',
  'freemium',
  'subscriptions',
  'credits',
  'unsure',
];
const MOBILE_OPTS: SocialMatchingIntakeAnswers['mobilePriority'][] = [
  'web_first',
  'mobile_required_phase2',
  'mobile_required_launch',
];
const MOD_OPTS: SocialMatchingIntakeAnswers['moderationApproach'][] = [
  'manual_ops_day1',
  'automated_later',
  'unsure',
];

function humanizeEnum(s: string): string {
  return s.replace(/_/g, ' ');
}

export function KickoffIntakeExperience({
  dealId,
  portalToken,
  intake,
  dealAcceptedAt,
  deliveryPresetId,
}: {
  dealId: string;
  portalToken: string;
  intake: NonNullable<PortalDealIntake>;
  dealAcceptedAt: Date | string | null;
  deliveryPresetId?: string | null;
}) {
  const needsTargetTemplate = intakeNeedsTargetTemplateSpec(deliveryPresetId);
  const chapterOpts = { requireTargetTemplateId: needsTargetTemplate };
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const submitted = intake.status === 'submitted';
  const env = intake.envelope;

  const initialAnswers = env?.answers ?? {};
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Record<string, string>>(() => answersToForm(initialAnswers));
  const [selectedArchetype, setSelectedArchetype] = useState<KickoffArchetypeId | null>(() =>
    resolveKickoffArchetypeFromAnswers(initialAnswers as Partial<SocialMatchingIntakeAnswers>),
  );
  const [sDisc, setSDisc] = useState(() =>
    discoveryModelToSlider(initialAnswers.discoveryModel as SocialMatchingIntakeAnswers['discoveryModel']),
  );
  const [sMatch, setSMatch] = useState(() =>
    matchingRulesToSlider(initialAnswers.matchingRules as SocialMatchingIntakeAnswers['matchingRules']),
  );
  const [sMsg, setSMsg] = useState(() =>
    messagingPolicyToSlider(initialAnswers.messagingPolicy as SocialMatchingIntakeAnswers['messagingPolicy']),
  );

  const saveDraft = trpc.portalDeals.intakeSaveDraft.useMutation({
    onSuccess: () => {
      toast({
        title: 'Progress saved',
        description: 'Chapter saved — your studio can follow along in Console.',
        tone: 'success',
      });
      void utils.portalDeals.summary.invalidate();
    },
    onError: (e) => toast({ title: 'Could not save', description: e.message, tone: 'danger' }),
  });

  const submit = trpc.portalDeals.intakeSubmit.useMutation({
    onSuccess: () => {
      toast({
        title: 'Kickoff captured',
        description: 'Thank you — your studio lead has everything to start.',
        tone: 'success',
      });
      void utils.portalDeals.summary.invalidate();
    },
    onError: (e) => toast({ title: 'Could not submit', description: e.message, tone: 'danger' }),
  });

  function mergeAnswers(): Record<string, string> {
    const base: Record<string, string> = {
      ...form,
      discoveryModel: discoverySliderToModel(sDisc),
      matchingRules: matchingSliderToRules(sMatch),
      messagingPolicy: messagingSliderToPolicy(sMsg),
    };
    if (selectedArchetype) base.kickoffArchetype = selectedArchetype;
    return base;
  }

  function mergedForValidation(): Partial<SocialMatchingIntakeAnswers> & { kickoffArchetype?: KickoffArchetypeId | null } {
    const raw = mergeAnswers();
    return {
      ...raw,
      kickoffArchetype: selectedArchetype ?? undefined,
      discoveryModel: raw.discoveryModel as SocialMatchingIntakeAnswers['discoveryModel'],
      matchingRules: raw.matchingRules as SocialMatchingIntakeAnswers['matchingRules'],
      messagingPolicy: raw.messagingPolicy as SocialMatchingIntakeAnswers['messagingPolicy'],
      launchTarget: raw.launchTarget as SocialMatchingIntakeAnswers['launchTarget'],
      monetizationModel: raw.monetizationModel as SocialMatchingIntakeAnswers['monetizationModel'],
      mobilePriority: raw.mobilePriority as SocialMatchingIntakeAnswers['mobilePriority'],
      moderationApproach: raw.moderationApproach as SocialMatchingIntakeAnswers['moderationApproach'],
    };
  }

  const mirrorText = useMemo(() => {
    const merged = {
      ...form,
      discoveryModel: discoverySliderToModel(sDisc),
      matchingRules: matchingSliderToRules(sMatch),
      messagingPolicy: messagingSliderToPolicy(sMsg),
    } as Partial<SocialMatchingIntakeAnswers>;
    return buildKickoffMirrorSummary(merged);
  }, [form, sDisc, sMatch, sMsg]);

  const maxStep = CHAPTERS.length - 1;

  function setField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function pickArchetype(id: KickoffArchetypeId) {
    const core = applyKickoffArchetype(id);
    setSelectedArchetype(id);
    setForm((prev) => ({
      ...prev,
      kickoffArchetype: id,
      discoveryModel: core.discoveryModel,
      matchingRules: core.matchingRules,
      messagingPolicy: core.messagingPolicy,
    }));
    setSDisc(discoveryModelToSlider(core.discoveryModel));
    setSMatch(matchingRulesToSlider(core.matchingRules));
    setSMsg(messagingPolicyToSlider(core.messagingPolicy));
  }

  function persistChapterAndAdvance(targetStep: number) {
    const merged = mergeAnswers();
    setForm(merged);
    const patch = pruneDraftPatch(merged);
    if (Object.keys(patch).length > 0) {
      saveDraft.mutate({ dealId, portalToken, answers: patch });
    }
    setStep(targetStep);
  }

  function goToChapter(target: number) {
    if (target === step) return;
    if (target < step) {
      setStep(target);
      return;
    }
    for (let s = step; s < target; s += 1) {
      const err = validateKickoffChapter(s, mergedForValidation(), chapterOpts);
      if (err) {
        toast({
          title: 'Complete this chapter',
          description: `${CHAPTERS[s]}: ${err}`,
          tone: 'danger',
        });
        return;
      }
    }
    persistChapterAndAdvance(target);
  }

  function goNext() {
    const err = validateKickoffChapter(step, mergedForValidation(), chapterOpts);
    if (err) {
      toast({ title: 'Complete this chapter', description: err, tone: 'danger' });
      return;
    }
    if (step < maxStep) persistChapterAndAdvance(step + 1);
  }

  function goBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  function onSaveDraft() {
    const merged = mergeAnswers();
    const patch = pruneDraftPatch(merged);
    if (Object.keys(patch).length === 0) {
      toast({ title: 'Nothing to save yet', description: 'Answer a question or move a slider first.', tone: 'default' });
      return;
    }
    saveDraft.mutate({ dealId, portalToken, answers: patch });
  }

  function onSubmit() {
    if (!dealAcceptedAt) {
      toast({
        title: 'Accept engagement first',
        description: 'Open the Plan tab (or scroll up) and accept the commercial terms — then you can submit.',
        tone: 'danger',
      });
      return;
    }
    for (let s = 1; s < maxStep; s += 1) {
      const err = validateKickoffChapter(s, mergedForValidation(), chapterOpts);
      if (err) {
        toast({
          title: 'Finish required chapters',
          description: `${CHAPTERS[s]}: ${err}`,
          tone: 'danger',
        });
        setStep(s);
        return;
      }
    }
    try {
      const merged = mergeAnswers();
      const answers = formToSubmitPayload(merged);
      submit.mutate({ dealId, portalToken, answers });
    } catch (e) {
      const msg =
        e && typeof e === 'object' && 'issues' in e && Array.isArray((e as { issues: unknown[] }).issues)
          ? (e as { issues: { path: (string | number)[]; message: string }[] }).issues
              .map((i) => `${i.path.join('.') || 'field'}: ${i.message}`)
              .join(' · ')
          : e instanceof Error
            ? e.message
            : 'A few required answers are missing or too short.';
      toast({ title: 'Almost there', description: msg, tone: 'danger' });
    }
  }

  const statusBadge = useMemo(() => {
    if (intake.status === 'submitted') return <Badge className="shrink-0">Submitted</Badge>;
    if (intake.status === 'draft') return <Badge variant="secondary">In progress</Badge>;
    return <Badge variant="outline">Not started</Badge>;
  }, [intake.status]);

  if (submitted && env?.answers) {
    const a = env.answers as SocialMatchingIntakeAnswers;
    const submittedLabel = env.submittedAt ? new Date(env.submittedAt).toLocaleString() : '—';
    const startedLabel = env.startedAt ? new Date(env.startedAt).toLocaleString() : null;
    const lastSavedLabel =
      env.lastSavedAt && env.lastSavedAt !== env.submittedAt ? new Date(env.lastSavedAt).toLocaleString() : null;

    return (
      <Card className="overflow-hidden border-border/80">
        <CardHeader className="border-b border-border/60">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="h-5 w-5 text-primary" />
                Your kickoff brief
              </CardTitle>
              <CardDescription>
                Submitted {submittedLabel}. This snapshot stays fixed for delivery and billing — ask your studio lead if
                something material changed.
              </CardDescription>
            </div>
            {statusBadge}
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6 text-sm leading-relaxed">
          <div className="relative pl-6">
            <div className="absolute bottom-2 left-[11px] top-2 w-px bg-border" aria-hidden />
            <ol className="space-y-4">
              {startedLabel ? (
                <li className="relative flex gap-3">
                  <span className="absolute -left-6 mt-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Kickoff opened</p>
                    <p className="text-xs text-muted-foreground">{startedLabel}</p>
                  </div>
                </li>
              ) : null}
              {lastSavedLabel ? (
                <li className="relative flex gap-3">
                  <span className="absolute -left-6 mt-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-border/80 bg-muted/40 text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                  </span>
                  <div>
                    <p className="font-medium text-foreground">Last draft sync</p>
                    <p className="text-xs text-muted-foreground">{lastSavedLabel}</p>
                  </div>
                </li>
              ) : null}
              <li className="relative flex gap-3">
                <span className="absolute -left-6 mt-1 flex h-[22px] w-[22px] items-center justify-center rounded-full border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <Check className="h-3.5 w-3.5" aria-hidden />
                </span>
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-medium text-foreground">
                    Official submit
                    <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      <Lock className="h-3 w-3" aria-hidden />
                      Locked
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground">{submittedLabel}</p>
                </div>
              </li>
            </ol>
          </div>

          <details className="group rounded-xl border border-border/60 bg-background/60">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="flex items-center justify-between gap-2">
                Read your submitted answers
                <span className="text-xs font-normal text-muted-foreground group-open:hidden">Expand</span>
                <span className="hidden text-xs font-normal text-muted-foreground group-open:inline">Collapse</span>
              </span>
            </summary>
            <div className="space-y-4 border-t border-border/60 px-4 pb-4 pt-2">
              <pre className="whitespace-pre-wrap rounded-lg border border-border/60 bg-muted/20 p-4 font-sans text-sm text-foreground">
                {buildKickoffMirrorSummary(a)}
              </pre>
              <div className="space-y-3">
                {(Object.keys(socialMatchingIntakeAnswersSchema.shape) as (keyof SocialMatchingIntakeAnswers)[]).map((key) => {
                  const v = a[key];
                  if (v === undefined || v === null || v === '') return null;
                  return (
                    <div key={key} className="rounded-md border border-border/40 px-3 py-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {humanizeEnum(String(key))}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap">{String(v)}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </details>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="border-b border-border/60">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Kickoff</p>
            <CardTitle className="font-display mt-1 flex items-center gap-2 text-xl font-medium">
              <ClipboardList className="h-5 w-5 text-primary" />
              Your project story
            </CardTitle>
            <CardDescription className="mt-2 max-w-prose">
              A short guided flow — about ten minutes. Save anytime; your link remembers progress. Plain language first;
              technical wording only if you want it.
            </CardDescription>
          </div>
          {statusBadge}
        </div>
        <div className="mt-4 flex flex-wrap gap-1">
          {CHAPTERS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => goToChapter(i)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                i === step
                  ? 'bg-primary text-primary-foreground'
                  : i < step
                    ? 'bg-muted text-foreground hover:bg-muted/80'
                    : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6 sm:p-8">
        {!dealAcceptedAt ? (
          <div
            role="status"
            className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-foreground"
          >
            <p className="font-medium">Accept the engagement to submit</p>
            <p className="mt-1 text-muted-foreground">
              You can save kickoff drafts anytime. Open the <strong className="font-medium text-foreground">Plan</strong>{' '}
              tab and accept the commercial terms — then final submit unlocks here.
            </p>
          </div>
        ) : null}
        {step === 0 && (
          <div className="space-y-4 text-center sm:text-left">
            <h3 className="text-2xl font-semibold tracking-tight">Welcome</h3>
            <p className="text-muted-foreground">
              You&apos;re about to walk through how people will discover each other, match, chat, launch, and stay safe — in
              language we&apos;d use with a friend, not a spec sheet.
            </p>
            <p className="text-sm text-muted-foreground">
              When you&apos;re ready, accept the engagement further down this page — you can still save drafts before then.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold tracking-tight">Which shape feels closest?</h3>
            <p className="text-sm text-muted-foreground">
              Tap a card — each has a quick visual hint. You&apos;ll fine-tune discovery, matching, and messaging in the{' '}
              <strong className="font-medium text-foreground">Feel</strong> chapter.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {ARCHETYPES.map((a) => {
                const Icon = a.Icon;
                const isSelected = selectedArchetype === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => pickArchetype(a.id)}
                    className={`group relative overflow-hidden rounded-2xl border p-0 text-left shadow-sm ring-2 transition hover:scale-[1.01] hover:shadow-md ${
                      isSelected
                        ? 'border-primary bg-gradient-to-br from-primary/20 via-primary/10 to-transparent ring-primary'
                        : `border-border/80 bg-gradient-to-br ${a.gradient} ring-1 ${a.ring} hover:border-primary/40`
                    }`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.12),transparent_55%)]" />
                    <div className="relative flex flex-col gap-3 p-4 sm:flex-row sm:items-stretch">
                      <div className="flex shrink-0 flex-col items-center gap-2 sm:w-32">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-black/20 text-white shadow-inner">
                          <Icon className="h-6 w-6" strokeWidth={1.75} />
                        </span>
                        <div className="w-full rounded-lg border border-white/10 bg-black/25 py-2">
                          <ShapePreview kind={a.preview} />
                        </div>
                      </div>
                      <div className="min-w-0 flex-1 pt-1">
                        <p className="flex flex-wrap items-center gap-2 font-semibold text-foreground">
                          {a.title}
                          {isSelected ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                              <Check className="h-3 w-3" aria-hidden />
                              Selected
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-2 text-sm leading-snug text-muted-foreground">{a.subtitle}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold tracking-tight">What are you building, and for whom?</h3>
            <p className="text-sm text-muted-foreground">One honest paragraph — at least a couple of sentences.</p>
            <Textarea
              value={form.productVision ?? ''}
              onChange={(e) => setField('productVision', e.target.value)}
              className="min-h-[140px] text-base leading-relaxed"
              placeholder="e.g. A calmer dating app for people who hate endless swiping…"
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold tracking-tight">Who shows up first?</h3>
            <p className="text-sm text-muted-foreground">Think about your first hundred users — geography, age, intent.</p>
            <Textarea
              value={form.targetAudience ?? ''}
              onChange={(e) => setField('targetAudience', e.target.value)}
              className="min-h-[120px] text-base leading-relaxed"
              placeholder="e.g. Professionals 28–40 in Dublin and London who want something serious…"
            />
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <h3 className="text-xl font-semibold tracking-tight">Why you — not the big apps?</h3>
            <p className="text-sm text-muted-foreground">What would a user tell a friend after their first good session?</p>
            <Textarea
              value={form.differentiators ?? ''}
              onChange={(e) => setField('differentiators', e.target.value)}
              className="min-h-[140px] text-base leading-relaxed"
            />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-8">
            <div>
              <h3 className="text-xl font-semibold tracking-tight">Fine-tune the experience</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                These sliders adjust the <strong className="font-medium text-foreground">Shape</strong> you picked in chapter
                2 — discovery, matching, and messaging — without starting over.
                {selectedArchetype ? (
                  <>
                    {' '}
                    Starting point:{' '}
                    <strong className="font-medium text-foreground">
                      {ARCHETYPES.find((a) => a.id === selectedArchetype)?.title ?? 'your selection'}
                    </strong>
                    .
                  </>
                ) : null}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Drag toward what feels right — left and right labels are plain English.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Fast, swipe-first</span>
                <span>Browse profiles first</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sDisc}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSDisc(v);
                  setField('discoveryModel', discoverySliderToModel(v));
                }}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Both people interested</span>
                <span>One side can show interest first</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sMatch}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSMatch(v);
                  setField('matchingRules', matchingSliderToRules(v));
                }}
                className="w-full accent-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-medium text-muted-foreground">
                <span>Chat mostly after a match</span>
                <span>Some messaging before a match (limited)</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={sMsg}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSMsg(v);
                  setField('messagingPolicy', messagingSliderToPolicy(v));
                }}
                className="w-full accent-primary"
              />
            </div>
          </div>
        )}

        {step === 6 && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold tracking-tight">Launch & revenue</h3>
            <div className="space-y-2">
              <p className="text-sm font-medium">How do you want to enter the market?</p>
              <div className="flex flex-wrap gap-2">
                {LAUNCH_OPTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setField('launchTarget', v)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      form.launchTarget === v ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {humanizeEnum(v)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How do you expect to make money?</p>
              <div className="flex flex-wrap gap-2">
                {MONET_OPTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setField('monetizationModel', v)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      form.monetizationModel === v ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {humanizeEnum(v)}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How important is native mobile on day one?</p>
              <div className="flex flex-wrap gap-2">
                {MOBILE_OPTS.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setField('mobilePriority', v)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      form.mobilePriority === v ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {humanizeEnum(v)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 7 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold tracking-tight">Trust & safety — day one</h3>
            <p className="text-sm text-muted-foreground">Tap what matches your plan; add a line if something worries you.</p>
            <div className="flex flex-wrap gap-2">
              {MOD_OPTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setField('moderationApproach', v)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    form.moderationApproach === v ? 'border-primary bg-primary/15 text-primary' : 'border-border hover:border-primary/40'
                  }`}
                >
                  {humanizeEnum(v)}
                </button>
              ))}
            </div>
            <FormField label="Anything we should know about safety or moderation?" htmlFor="ts-notes">
              <Textarea
                id="ts-notes"
                value={form.trustSafetyNotes ?? ''}
                onChange={(e) => setField('trustSafetyNotes', e.target.value)}
                className="min-h-[80px]"
                placeholder="Optional"
              />
            </FormField>
          </div>
        )}

        {step === 8 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold tracking-tight">Markets & who signs off</h3>
            {needsTargetTemplate ? (
              <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
                <p className="text-sm font-medium text-foreground">New product template</p>
                <p className="text-xs text-muted-foreground">
                  We will add this row to the catalog and lock the spec before build. Pick the closest match or
                  discuss a custom id with your studio lead.
                </p>
                <div className="flex flex-wrap gap-2">
                  {TIER2_KICKOFF_TEMPLATE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setField('targetTemplateId', opt.id)}
                      className={`rounded-full border px-3 py-1.5 text-left text-sm transition ${
                        form.targetTemplateId === opt.id
                          ? 'border-primary bg-primary/15 text-primary'
                          : 'border-border hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <FormField label="Catalog template id" htmlFor="target-template-id">
                  <Input
                    id="target-template-id"
                    value={form.targetTemplateId ?? ''}
                    onChange={(e) => setField('targetTemplateId', e.target.value)}
                    placeholder="social_matching/mentorship"
                  />
                </FormField>
              </div>
            ) : null}
            <FormField label="Primary markets or geos" htmlFor="pm">
              <Input id="pm" value={form.primaryMarkets ?? ''} onChange={(e) => setField('primaryMarkets', e.target.value)} placeholder="e.g. Ireland & UK" />
            </FormField>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Decision maker name" htmlFor="dm-n">
                <Input id="dm-n" value={form.decisionMakerName ?? ''} onChange={(e) => setField('decisionMakerName', e.target.value)} />
              </FormField>
              <FormField label="Decision maker email" htmlFor="dm-e">
                <Input id="dm-e" type="email" value={form.decisionMakerEmail ?? ''} onChange={(e) => setField('decisionMakerEmail', e.target.value)} />
              </FormField>
            </div>
            <FormField label="Billing approver (optional)" htmlFor="bill">
              <Input id="bill" value={form.billingApproverContact ?? ''} onChange={(e) => setField('billingApproverContact', e.target.value)} />
            </FormField>
            <FormField label="Competitors or apps you admire (optional)" htmlFor="comp">
              <Textarea id="comp" className="min-h-[64px]" value={form.competitorNotes ?? ''} onChange={(e) => setField('competitorNotes', e.target.value)} />
            </FormField>
            <FormField label="Brand / design links (optional)" htmlFor="brand">
              <Input id="brand" value={form.brandLinks ?? ''} onChange={(e) => setField('brandLinks', e.target.value)} />
            </FormField>
            <FormField label="Integrations wishlist (optional)" htmlFor="int">
              <Textarea id="int" className="min-h-[64px]" value={form.integrationWishlist ?? ''} onChange={(e) => setField('integrationWishlist', e.target.value)} />
            </FormField>
            <FormField label="Target launch timing (optional)" htmlFor="tld">
              <Input id="tld" value={form.targetLaunchDate ?? ''} onChange={(e) => setField('targetLaunchDate', e.target.value)} placeholder="e.g. Q3 2026" />
            </FormField>
            <FormField label="Anything else? (optional)" htmlFor="ex">
              <Textarea id="ex" className="min-h-[72px]" value={form.extraNotes ?? ''} onChange={(e) => setField('extraNotes', e.target.value)} />
            </FormField>
          </div>
        )}

        {step === 9 && (
          <div className="space-y-4">
            <h3 className="text-xl font-semibold tracking-tight">Your brief in plain language</h3>
            <p className="text-sm text-muted-foreground">Read it like a client, not an engineer. Go back to tweak any chapter.</p>
            <div className="rounded-xl border border-primary/25 bg-muted/20 p-5 text-sm leading-relaxed text-foreground">
              {mirrorText}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={step === 0} onClick={goBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            {step < maxStep && (
              <Button type="button" size="sm" onClick={goNext}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={saveDraft.isPending} onClick={onSaveDraft}>
              {saveDraft.isPending ? 'Saving…' : 'Save progress'}
            </Button>
            {step === maxStep && (
              <Button type="button" size="sm" disabled={submit.isPending || !dealAcceptedAt} onClick={onSubmit}>
                {submit.isPending ? 'Submitting…' : 'Submit kickoff brief'}
              </Button>
            )}
          </div>
        </div>
        {!dealAcceptedAt && step === maxStep && (
          <p className="text-center text-xs text-muted-foreground">Submit unlocks after you accept the engagement in this portal.</p>
        )}
      </CardContent>
    </Card>
  );
}
