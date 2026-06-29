/* eslint-disable no-console */
import './_load-env';
import { createHash } from 'node:crypto';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { factory as ulidFactory } from 'ulid';
import { PERSONAS } from '@goldspire/config';
import {
  STUDIO_SALES_DEMO_DEAL_ID,
  STUDIO_SALES_DEMO_PORTAL_TOKEN_HASH,
} from '@goldspire/config/studio-sales-demo';
import {
  STUDIO_TIER2_DEMO_DEAL_ID,
  STUDIO_TIER2_DEMO_PORTAL_TOKEN_HASH,
} from '@goldspire/config/studio-tier2-demo';
import {
  HEARTLINE_CAPABILITY_METADATA_KEY,
  HEARTLINE_CAPABILITY_PRESET_METADATA_KEY,
  HEARTLINE_PRESET_SHOWROOM,
  TIER2_TEMPLATE_PRESET,
  buildCommercialPlan,
} from '@goldspire/commercial';
import { buildHeartlineCapabilityFlagRows } from './heartline-capability-flag-rows.js';
import { insertStudioDealActivity } from '../src/studio-deal-activity.js';
import { getMigrationDatabaseUrl } from '@goldspire/config/env';
import { resolveDevSurfaceOrigin } from '@goldspire/config/dev-surfaces';
import * as schema from '../src/schema/index.js';

const conn = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });

/** Local dev URLs from the canonical surface registry (honours `.env` overrides). */
const devUrl = (id: Parameters<typeof resolveDevSurfaceOrigin>[0]) =>
  resolveDevSurfaceOrigin(id, process.env);
const db = drizzle(conn, { schema, casing: 'snake_case' });

/** Deterministic Crockford ULIDs (do not use `ulid()` with wall-clock randomness). */
function stableUlid(part: string): string {
  const digest = createHash('sha256').update(part).digest();
  const seedTime = 1_704_067_200_000 + (digest.readUInt32BE(0) % 50_000_000_000);
  let i = 0;
  const prng = () => digest[i++ % digest.length]! / 256;
  return ulidFactory(prng)(seedTime);
}

const SEED_TENANT_SLUGS = ['goldspire', 'heartline', 'nova-care', 'bazaar', 'pulse-club'] as const;
type SeedTenantSlug = (typeof SEED_TENANT_SLUGS)[number];

const SEED_DEAL_IDS = [
  stableUlid('deal:nova-care-mvp'),
  stableUlid('deal:pulse-expansion'),
  stableUlid('deal:acme-discovery'),
  stableUlid('deal:heartline-retention'),
  stableUlid('deal:bazaar-seller-m2'),
  STUDIO_SALES_DEMO_DEAL_ID,
  STUDIO_TIER2_DEMO_DEAL_ID,
] as const;

const GLOBAL_FLAG_KEYS = ['module.studio_deals', 'ops.read_only'] as const;

function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rngForTenant(slug: string): () => number {
  const h = createHash('sha256').update(`rng:${slug}`).digest();
  const seed = h.readUInt32BE(0);
  return mulberry32(seed);
}

const FIRST_NAMES = [
  'Emma',
  'Olivia',
  'Ava',
  'Sophia',
  'Mia',
  'Charlotte',
  'Amelia',
  'Harper',
  'Evelyn',
  'Liam',
  'Noah',
  'Oliver',
  'James',
  'Benjamin',
  'Lucas',
  'Henry',
  'Alexander',
  'Ethan',
  'William',
  'Daniel',
  'Grace',
  'Chloe',
  'Penelope',
  'Layla',
  'Riley',
  'Zoey',
  'Nora',
  'Lily',
  'Eleanor',
  'Hannah',
  'Jack',
  'Owen',
  'Sebastian',
  'Mason',
  'Logan',
  'Jackson',
  'Mateo',
  'Victoria',
  'Scarlett',
  'Aria',
] as const;

const LAST_NAMES = [
  'Martinez',
  'Chen',
  'Patel',
  'Kim',
  'Nguyen',
  'Rodriguez',
  'Thompson',
  'Murphy',
  'Kelly',
  'Sullivan',
  'Campbell',
  'Rivera',
  'Cooper',
  'Richardson',
  'Bennett',
  'Brooks',
  'Sanders',
  'Price',
  'Wood',
  'Watson',
  'Bennett',
  'Ross',
  'Powell',
  'Long',
  'Foster',
  'Gray',
  'Jenkins',
  'Perry',
  'Powell',
  'Russell',
  'Butler',
  'Simmons',
  'Barnes',
  'Henderson',
  'Coleman',
  'Jenkins',
  'Perry',
  'Powell',
  'West',
  'Ford',
] as const;

const US_CITIES = [
  'Austin, TX',
  'Denver, CO',
  'Seattle, WA',
  'Chicago, IL',
  'Boston, MA',
  'Portland, OR',
  'Nashville, TN',
  'Miami, FL',
  'Phoenix, AZ',
  'Atlanta, GA',
  'Dallas, TX',
  'San Diego, CA',
  'Minneapolis, MN',
  'Philadelphia, PA',
  'Washington, DC',
  'Raleigh, NC',
  'Salt Lake City, UT',
  'Kansas City, MO',
  'Columbus, OH',
  'Charlotte, NC',
  'Tampa, FL',
  'Detroit, MI',
  'Las Vegas, NV',
  'St. Louis, MO',
  'Pittsburgh, PA',
  'Cleveland, OH',
  'New Orleans, LA',
  'Honolulu, HI',
  'Boise, ID',
  'Madison, WI',
] as const;

const GENDERS = ['woman', 'man', 'non_binary'] as const;
const SEEKING = ['long_term', 'short_term', 'friendship', 'casual', 'figuring_it_out'] as const;

function dicebear(email: string): string {
  return `https://api.dicebear.com/7.x/personas/svg?seed=${encodeURIComponent(email)}`;
}

function daysAgo(rng: () => number, maxDays: number): Date {
  const d = Math.floor(rng() * maxDays);
  return new Date(Date.now() - d * 86_400_000);
}

function offsetDaysFromNow(days: number): Date {
  return new Date(Date.now() + days * 86_400_000);
}

function hoursAgoInLast30d(rng: () => number): Date {
  const hours = Math.floor(rng() * 30 * 24);
  return new Date(Date.now() - hours * 3_600_000);
}

async function setRole(role: 'STUDIO_OWNER' | 'TENANT_OWNER') {
  await conn.unsafe(`select set_config('app.role', '${role}', true)`);
}

const AUDIT_ACTIONS = [
  'user_signed_up',
  'subscription_created',
  'subscription_canceled',
  'feature_flag_updated',
  'product_created',
  'report_filed',
  'tenant_updated',
  'user_role_changed',
  'deployment_promoted',
  'invoice_sent',
  'moderation_queue_opened',
  'api_key_rotated',
] as const;

async function seed() {
  const NOW = new Date();
  console.log('▸ seeding Goldspire launch stack (demo dataset)...');
  await setRole('STUDIO_OWNER');

  // ─── Clear prior demo slice (stable tenant slugs) ───────────────────────
  await db.delete(schema.studioDeal).where(inArray(schema.studioDeal.id, [...SEED_DEAL_IDS]));
  await db
    .delete(schema.featureFlag)
    .where(
      and(isNull(schema.featureFlag.tenantId), inArray(schema.featureFlag.key, [...GLOBAL_FLAG_KEYS])),
    );
  await db.delete(schema.tenant).where(inArray(schema.tenant.slug, [...SEED_TENANT_SLUGS]));

  // ─── Tenant ids ─────────────────────────────────────────────────────────
  const tenantId: Record<SeedTenantSlug, string> = {
    goldspire: stableUlid('tenant:goldspire'),
    heartline: stableUlid('tenant:heartline'),
    'nova-care': stableUlid('tenant:nova-care'),
    bazaar: stableUlid('tenant:bazaar'),
    'pulse-club': stableUlid('tenant:pulse-club'),
  };

  await db.insert(schema.tenant).values([
    {
      id: tenantId.goldspire,
      name: 'Goldspire',
      slug: 'goldspire',
      status: 'active',
      plan: 'studio',
      theme: { accent: '#0F172A', accentForeground: '#F8FAFC' },
      metadata: { type: 'studio', label: 'Launch stack operator' },
    },
    {
      id: tenantId.heartline,
      name: 'Heartline',
      slug: 'heartline',
      status: 'active',
      plan: 'enterprise',
      theme: { accent: '#E15A82', accentForeground: '#FFFFFF' },
      metadata: {
        blueprint: 'social_matching',
        productTemplate: 'social_matching/dating',
        commercialPlan: 'growth',
        [HEARTLINE_CAPABILITY_METADATA_KEY]: [...HEARTLINE_PRESET_SHOWROOM],
        [HEARTLINE_CAPABILITY_PRESET_METADATA_KEY]: 'showroom',
      },
    },
    {
      id: tenantId['nova-care'],
      name: 'Nova Care',
      slug: 'nova-care',
      status: 'active',
      plan: 'free',
      theme: { accent: '#7C5CFF', accentForeground: '#FFFFFF' },
      metadata: { blueprint: 'booking_marketplace', commercialPlan: 'starter' },
    },
    {
      id: tenantId.bazaar,
      name: 'Bazaar',
      slug: 'bazaar',
      status: 'active',
      plan: 'free',
      theme: { accent: '#F4B740', accentForeground: '#0F172A' },
      metadata: { blueprint: 'marketplace', commercialPlan: 'starter' },
    },
    {
      id: tenantId['pulse-club'],
      name: 'Pulse Club',
      slug: 'pulse-club',
      status: 'trial',
      plan: 'free',
      theme: { accent: '#22C55E', accentForeground: '#052E16' },
      metadata: { blueprint: 'community_platform', commercialPlan: 'trial' },
    },
  ]);

  // ─── Products ───────────────────────────────────────────────────────────
  const productIds = {
    // Goldspire (studio-internal templates)
    gsConsole: stableUlid('product:gs-console'),
    gsInsights: stableUlid('product:gs-insights'),
    gsClientHub: stableUlid('product:gs-client-hub'),
    // Heartline — "heartline-dating" is the canonical app product (every
    // match / thread / dating profile points at this). The three tier-
    // specific products below exist purely as billing SKUs (subscription FK
    // targets), they are NOT separate apps.
    hlDating: stableUlid('product:hl-dating'),
    hlFree: stableUlid('product:hl-free'),
    hlPlus: stableUlid('product:hl-plus'),
    hlPremium: stableUlid('product:hl-premium'),
    // Nova Care
    nvStandard: stableUlid('product:nv-standard'),
    nvSpecialist: stableUlid('product:nv-specialist'),
    nvAnnual: stableUlid('product:nv-annual'),
    // Bazaar
    bzListing: stableUlid('product:bz-listing'),
    bzFeatured: stableUlid('product:bz-featured'),
    bzStorefront: stableUlid('product:bz-storefront'),
    // Pulse Club
    pcMembership: stableUlid('product:pc-membership'),
    pcEvent: stableUlid('product:pc-event'),
    pcFounders: stableUlid('product:pc-founders'),
  } as const;

  await db.insert(schema.product).values([
    {
      id: productIds.gsConsole,
      tenantId: tenantId.goldspire,
      name: 'Studio Console',
      slug: 'studio-console',
      blueprint: 'b2b_saas_shell',
      status: 'live',
      config: {},
      metadata: { surface: 'control_plane' },
      launchedAt: NOW,
    },
    {
      id: productIds.gsInsights,
      tenantId: tenantId.goldspire,
      name: 'Delivery Insights',
      slug: 'delivery-insights',
      blueprint: 'vertical_ai_agent',
      status: 'live',
      config: { models: ['mock-1'] },
      metadata: { surface: 'analytics' },
      launchedAt: NOW,
    },
    {
      id: productIds.gsClientHub,
      tenantId: tenantId.goldspire,
      name: 'Client Hub',
      slug: 'client-hub',
      blueprint: 'b2b_saas_shell',
      status: 'staging',
      config: {},
      metadata: { surface: 'crm_light' },
      launchedAt: null,
    },
    {
      id: productIds.hlDating,
      tenantId: tenantId.heartline,
      name: 'Heartline Dating',
      slug: 'heartline-dating',
      blueprint: 'social_matching',
      status: 'live',
      config: { dailyLikesFree: 25, defaultDistanceKm: 50 },
      metadata: { tier: 'app', surface: 'dating' },
      launchedAt: NOW,
    },
    {
      id: productIds.hlFree,
      tenantId: tenantId.heartline,
      name: 'Heartline Free',
      slug: 'heartline-free',
      blueprint: 'social_matching',
      status: 'live',
      config: { dailyLikesFree: 25, defaultDistanceKm: 50 },
      metadata: { tier: 'free' },
      launchedAt: NOW,
    },
    {
      id: productIds.hlPlus,
      tenantId: tenantId.heartline,
      name: 'Heartline Plus',
      slug: 'heartline-plus',
      blueprint: 'social_matching',
      status: 'live',
      config: { dailyLikesFree: 100, boostsPerMonth: 5 },
      metadata: { tier: 'plus' },
      launchedAt: NOW,
    },
    {
      id: productIds.hlPremium,
      tenantId: tenantId.heartline,
      name: 'Heartline Premium',
      slug: 'heartline-premium',
      blueprint: 'social_matching',
      status: 'live',
      config: { dailyLikesFree: 999, concierge: true },
      metadata: { tier: 'premium' },
      launchedAt: NOW,
    },
    {
      id: productIds.nvStandard,
      tenantId: tenantId['nova-care'],
      name: 'Standard Visit',
      slug: 'standard-visit',
      blueprint: 'multi_staff_booking',
      status: 'live',
      config: { slotMinutes: 30, bufferMinutes: 10 },
      metadata: { careLine: 'primary' },
      launchedAt: NOW,
    },
    {
      id: productIds.nvSpecialist,
      tenantId: tenantId['nova-care'],
      name: 'Specialist Consult',
      slug: 'specialist-consult',
      blueprint: 'multi_staff_booking',
      status: 'live',
      config: { slotMinutes: 45 },
      metadata: { careLine: 'specialty' },
      launchedAt: NOW,
    },
    {
      id: productIds.nvAnnual,
      tenantId: tenantId['nova-care'],
      name: 'Annual Membership',
      slug: 'annual-membership',
      blueprint: 'multi_staff_booking',
      status: 'live',
      config: { visitsIncluded: 12 },
      metadata: { careLine: 'membership' },
      launchedAt: NOW,
    },
    {
      id: productIds.bzListing,
      tenantId: tenantId.bazaar,
      name: 'Marketplace Listing',
      slug: 'marketplace-listing',
      blueprint: 'marketplace',
      status: 'live',
      config: { commissionBps: 850 },
      metadata: { lane: 'standard' },
      launchedAt: NOW,
    },
    {
      id: productIds.bzFeatured,
      tenantId: tenantId.bazaar,
      name: 'Featured Listing',
      slug: 'featured-listing',
      blueprint: 'marketplace',
      status: 'live',
      config: { featuredDurationDays: 14 },
      metadata: { lane: 'growth' },
      launchedAt: NOW,
    },
    {
      id: productIds.bzStorefront,
      tenantId: tenantId.bazaar,
      name: 'Storefront Pro',
      slug: 'storefront-pro',
      blueprint: 'marketplace',
      status: 'live',
      config: { customDomain: true },
      metadata: { lane: 'pro' },
      launchedAt: NOW,
    },
    {
      id: productIds.pcMembership,
      tenantId: tenantId['pulse-club'],
      name: 'Club Membership',
      slug: 'club-membership',
      blueprint: 'community',
      status: 'live',
      config: { memberSpaces: 12 },
      metadata: { program: 'core' },
      launchedAt: NOW,
    },
    {
      id: productIds.pcEvent,
      tenantId: tenantId['pulse-club'],
      name: 'Event Pass',
      slug: 'event-pass',
      blueprint: 'community',
      status: 'live',
      config: { guestPassesPerMonth: 2 },
      metadata: { program: 'events' },
      launchedAt: NOW,
    },
    {
      id: productIds.pcFounders,
      tenantId: tenantId['pulse-club'],
      name: 'Founders Tier',
      slug: 'founders-tier',
      blueprint: 'community',
      status: 'live',
      config: { cohortCap: 120 },
      metadata: { program: 'founders' },
      launchedAt: NOW,
    },
  ]);

  // ─── Persona users (exact emails / roles / tenants) ──────────────────────
  const userIdByEmail = new Map<string, string>();

  const personaRows = PERSONAS.map((p) => {
    const id = stableUlid(`persona:${p.email.toLowerCase()}`);
    userIdByEmail.set(p.email.toLowerCase(), id);
    const tid = tenantId[p.tenantSlug as SeedTenantSlug];
    if (!tid) throw new Error(`Unknown tenant slug on persona: ${p.tenantSlug}`);
    return {
      id,
      tenantId: tid,
      email: p.email,
      name: p.name,
      avatarUrl: dicebear(p.email),
      role: p.role,
      status: 'active' as const,
      metadata: { personaId: p.id, bio: p.bio },
      createdAt: daysAgo(rngForTenant(p.tenantSlug), 120),
    };
  });

  await db.insert(schema.user).values(personaRows);

  const studioOwnerId = userIdByEmail.get('eamon@goldspire.dev');
  const studioStaffId = userIdByEmail.get('maya@goldspire.dev');
  const leadAssigneeUserIds = [studioOwnerId, studioStaffId].filter((id): id is string => Boolean(id));
  if (leadAssigneeUserIds.length > 0) {
    const [gs] = await db
      .select({ metadata: schema.tenant.metadata })
      .from(schema.tenant)
      .where(eq(schema.tenant.id, tenantId.goldspire))
      .limit(1);
    const meta = { ...((gs?.metadata as Record<string, unknown>) ?? {}) };
    meta.consoleStudioProfile = {
      studioName: 'Goldspire',
      logoUrl: '',
      primaryContactEmail: 'hello@goldspire.dev',
      supportEmail: 'hello@goldspire.dev',
      supportPhone: '',
      postalAddress: '',
      deskWebhookUrl: '',
      deskAlertsEnabled: true,
      leadAssigneeUserIds,
      leadAssignRoundRobinIndex: 0,
      autoStampOnKickoff: true,
      autoIssuePortalOnConvert: true,
      autoRotateDeployHookOnStamp: true,
    };
    await db
      .update(schema.tenant)
      .set({ metadata: meta })
      .where(eq(schema.tenant.id, tenantId.goldspire));
  }

  // Extra tenant admins (2 per non-studio tenant with owner+admin personas)
  const extraAdminRows: (typeof schema.user.$inferInsert)[] = [];
  const extraAdminDefs: { slug: SeedTenantSlug; email: string; name: string }[] = [
    { slug: 'heartline', email: 'ops@heartline.co', name: 'Jordan Blake' },
    { slug: 'heartline', email: 'trust@heartline.co', name: 'Casey Morgan' },
    { slug: 'nova-care', email: 'ops@novacare.health', name: 'Morgan Ellis' },
    { slug: 'nova-care', email: 'clinical@novacare.health', name: 'Taylor Brooks' },
    { slug: 'bazaar', email: 'ops@bazaar.shop', name: 'Riley Carter' },
    { slug: 'bazaar', email: 'seller-success@bazaar.shop', name: 'Quinn Foster' },
    { slug: 'pulse-club', email: 'ops@pulse.club', name: 'Skyler Reed' },
    { slug: 'pulse-club', email: 'events@pulse.club', name: 'Drew Hayes' },
  ];
  for (const a of extraAdminDefs) {
    const id = stableUlid(`admin:${a.slug}:${a.email}`);
    userIdByEmail.set(a.email.toLowerCase(), id);
    extraAdminRows.push({
      id,
      tenantId: tenantId[a.slug],
      email: a.email,
      name: a.name,
      avatarUrl: dicebear(a.email),
      role: 'TENANT_ADMIN',
      status: 'active',
      metadata: { seeded: true },
      createdAt: daysAgo(rngForTenant(a.slug), 90),
    });
  }
  await db.insert(schema.user).values(extraAdminRows);

  // Synthetic customers per non-studio tenant (15–40 each, personas included in count)
  type CustomerRow = {
    id: string;
    tenantId: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    role: 'CUSTOMER';
    status: 'active';
    metadata: Record<string, unknown>;
    createdAt: Date;
  };
  const customerRows: CustomerRow[] = [];
  const customersByTenant: Record<Exclude<SeedTenantSlug, 'goldspire'>, CustomerRow[]> = {
    heartline: [],
    'nova-care': [],
    bazaar: [],
    'pulse-club': [],
  };

  const nonStudio: Exclude<SeedTenantSlug, 'goldspire'>[] = ['heartline', 'nova-care', 'bazaar', 'pulse-club'];
  for (const slug of nonStudio) {
    const rng = rngForTenant(slug);
    const targetTotal = 15 + Math.floor(rng() * 26);
    const personaCountOnTenant = PERSONAS.filter((p) => p.tenantSlug === slug && p.role === 'CUSTOMER').length;
    const syntheticNeeded = Math.max(0, targetTotal - personaCountOnTenant);
    for (let i = 0; i < syntheticNeeded; i++) {
      const email = `member.${slug.replace(/-/g, '')}.${i}@customers.demo.goldspire.dev`;
      const id = stableUlid(`customer:${slug}:${i}`);
      const fn = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)]!;
      const ln = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)]!;
      const city = US_CITIES[Math.floor(rng() * US_CITIES.length)]!;
      const row: CustomerRow = {
        id,
        tenantId: tenantId[slug],
        email,
        name: `${fn} ${ln}`,
        avatarUrl: dicebear(email),
        role: 'CUSTOMER',
        status: 'active',
        metadata: { city, seeded: true },
        createdAt: daysAgo(rng, 180),
      };
      customerRows.push(row);
      customersByTenant[slug].push(row);
    }
  }
  await db.insert(schema.user).values(customerRows);

  // Persona customers already in DB — collect heartline customer ids for dating
  for (const p of PERSONAS) {
    if (p.role !== 'CUSTOMER') continue;
    if (p.tenantSlug !== 'heartline') continue;
    const id = userIdByEmail.get(p.email.toLowerCase());
    if (!id) continue;
    customersByTenant.heartline.push({
      id,
      tenantId: tenantId.heartline,
      email: p.email,
      name: p.name,
      avatarUrl: dicebear(p.email),
      role: 'CUSTOMER',
      status: 'active',
      metadata: { personaId: p.id },
      createdAt: daysAgo(rngForTenant('heartline'), 60),
    });
  }

  // ─── Profiles (all users) ───────────────────────────────────────────────
  type UserWithId = (typeof schema.user.$inferInsert) & { id: string };
  const allUsers: UserWithId[] = [
    ...personaRows,
    ...extraAdminRows,
    ...customerRows,
  ] as UserWithId[];
  const profileRows = allUsers.map((u) => ({
    id: stableUlid(`profile:${u.id}`),
    tenantId: u.tenantId,
    userId: u.id,
    displayName: (u.name ?? u.email).split(' ')[0] ?? u.email,
    bio:
      typeof u.metadata === 'object' && u.metadata && 'bio' in u.metadata
        ? String((u.metadata as { bio?: string }).bio ?? '')
        : `Member based in ${(u.metadata as { city?: string })?.city ?? 'the network'}.`,
    metadata: {},
  }));
  await db.insert(schema.profile).values(profileRows);

  // ─── Heartline dating profiles (canonical app product: heartline-dating) ───
  const hlCustomers = customersByTenant.heartline;
  const datingProfileRows = hlCustomers.map((u) => {
    const rng = rngForTenant(`${u.id}:dating`);
    const g = GENDERS[Math.floor(rng() * GENDERS.length)]!;
    const sk = SEEKING[Math.floor(rng() * SEEKING.length)]!;
    const city =
      (u.metadata as { city?: string } | undefined)?.city ??
      US_CITIES[Math.floor(rng() * US_CITIES.length)]!;
    const birthYear = 1989 + Math.floor(rng() * 12);
    return {
      id: stableUlid(`datingprof:${u.id}`),
      tenantId: tenantId.heartline,
      productId: productIds.hlDating,
      userId: u.id,
      displayName: (u.name ?? u.email).split(' ')[0] ?? 'Member',
      birthdate: `${birthYear}-06-15`,
      gender: g,
      interestedIn: (rng() < 0.55
        ? (['woman', 'man'] as const)
        : rng() < 0.8
          ? (['woman', 'man', 'non_binary'] as const)
          : (['man'] as const)) as unknown as string[],
      seeking: sk,
      bio: `Here for something real — based in ${city}. Love live music, farmers markets, and Sunday hikes.`,
      city,
      countryCode: 'US',
      qualityScore: Math.floor(55 + rng() * 40),
      metadata: {},
    };
  });
  if (datingProfileRows.length) {
    await db.insert(schema.datingProfile).values(datingProfileRows);
    await db.insert(schema.datingPhoto).values(
      datingProfileRows.map((dp) => ({
        id: stableUlid(`datingphoto:${dp.userId}`),
        tenantId: tenantId.heartline,
        profileId: dp.id,
        url: dicebear(hlCustomers.find((c) => c.id === dp.userId)!.email),
        storagePath: `dating/${dp.userId}/0.svg`,
        position: 0,
      })),
    );
  }

  // ─── Nova Care booking graph ────────────────────────────────────────────
  const novaBizId = stableUlid('business:nova-main');
  await db.insert(schema.business).values({
    id: novaBizId,
    tenantId: tenantId['nova-care'],
    productId: productIds.nvStandard,
    name: 'Nova Care — Virtual Clinic',
    slug: 'nova-virtual',
    description: 'Same-day telehealth visits with board-certified clinicians in your state.',
    timezone: 'America/Chicago',
    addressLine1: 'Remote-first',
    city: 'Chicago',
    countryCode: 'US',
  });
  await db.insert(schema.service).values([
    {
      tenantId: tenantId['nova-care'],
      businessId: novaBizId,
      name: 'Primary care video visit',
      durationMinutes: 25,
      priceCents: 7900,
    },
    {
      tenantId: tenantId['nova-care'],
      businessId: novaBizId,
      name: 'Mental health check-in',
      durationMinutes: 40,
      priceCents: 9900,
    },
  ]);
  await db.insert(schema.staff).values([
    {
      tenantId: tenantId['nova-care'],
      businessId: novaBizId,
      displayName: 'Dr. Sam Okonkwo',
      title: 'Lead Physician',
    },
    {
      tenantId: tenantId['nova-care'],
      businessId: novaBizId,
      displayName: 'Nina Alvarez',
      title: 'Care Coordinator',
    },
  ]);

  // ─── Bazaar listings ──────────────────────────────────────────────────────
  const bzSellers = customersByTenant.bazaar.slice(0, 6);
  if (bzSellers.length >= 3) {
    await db.insert(schema.listing).values([
      {
        id: stableUlid('listing:bz-walnut-tray'),
        tenantId: tenantId.bazaar,
        productId: productIds.bzListing,
        sellerId: bzSellers[0]!.id,
        title: 'Hand-rubbed Walnut Serving Tray',
        slug: 'hand-rubbed-walnut-serving-tray',
        description: 'Food-safe oil finish, chamfered handles, made in small batches in Oregon.',
        category: 'home',
        priceCents: 18_900,
        imageUrls: ['https://images.unsplash.com/photo-1503602642458-232111445657?w=800'],
        status: 'active',
      },
      {
        id: stableUlid('listing:bz-ceramic-vase'),
        tenantId: tenantId.bazaar,
        productId: productIds.bzFeatured,
        sellerId: bzSellers[1]!.id,
        title: 'Speckled Ceramic Vase',
        slug: 'speckled-ceramic-vase',
        description: 'Wheel-thrown stoneware with a satin glaze. Fits a generous market bouquet.',
        category: 'ceramics',
        priceCents: 6_400,
        imageUrls: ['https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800'],
        status: 'active',
      },
      {
        id: stableUlid('listing:bz-leather-tote'),
        tenantId: tenantId.bazaar,
        productId: productIds.bzStorefront,
        sellerId: bzSellers[2]!.id,
        title: 'Full-grain Leather Tote',
        slug: 'full-grain-leather-tote',
        description: 'Vegetable-tanned leather, reinforced straps, laptop sleeve to 15".',
        category: 'accessories',
        priceCents: 24_500,
        imageUrls: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=800'],
        status: 'active',
      },
    ]);
  }

  // ─── Pulse Club community ─────────────────────────────────────────────────
  const pulseSpaceId = stableUlid('space:pulse-main');
  await db.insert(schema.space).values({
    id: pulseSpaceId,
    tenantId: tenantId['pulse-club'],
    productId: productIds.pcMembership,
    name: 'Town Square',
    slug: 'town-square',
    description: 'Weekly themes, member intros, and event recaps from the Pulse Club crew.',
    visibility: 'public',
  });
  const jennaId = userIdByEmail.get('jenna@pulse.club'.toLowerCase());
  if (jennaId) {
    await db.insert(schema.post).values([
      {
        id: stableUlid('post:pulse-1'),
        tenantId: tenantId['pulse-club'],
        spaceId: pulseSpaceId,
        authorId: jennaId,
        body: '**June lineup is live.** Outdoor sunrise circuit Saturday, founders dinner Wednesday, open-mic Friday. RSVP in the events tab.',
      },
      {
        id: stableUlid('post:pulse-2'),
        tenantId: tenantId['pulse-club'],
        spaceId: pulseSpaceId,
        authorId: jennaId,
        body: '**House rules reminder:** lead with generosity, keep critiques specific, and use the report button if anything feels off.',
      },
    ]);
  }

  // ─── Subscriptions (mostly customers; ~65% subscribed) ──────────────────
  const heartlineProducts = [productIds.hlFree, productIds.hlPlus, productIds.hlPremium];
  const novaProducts = [productIds.nvStandard, productIds.nvSpecialist, productIds.nvAnnual];
  const bazaarProducts = [productIds.bzListing, productIds.bzFeatured, productIds.bzStorefront];
  const pulseProducts = [productIds.pcMembership, productIds.pcEvent, productIds.pcFounders];

  const subscriptionRows: (typeof schema.subscription.$inferInsert)[] = [];

  function pickProduct<T extends string>(rng: () => number, arr: readonly T[]): T {
    return arr[Math.floor(rng() * arr.length)]!;
  }

  function subStatus(rng: () => number): 'active' | 'trialing' | 'canceled' {
    const r = rng();
    if (r < 0.12) return 'canceled';
    if (r < 0.22) return 'trialing';
    return 'active';
  }

  /**
   * Demo personas must have predictable subscription tiers so DEMO.md stays
   * accurate ("Jamie = Plus", "Sarah = Free"). Anything in this map is forced
   * before the randomized fill below.
   */
  const PINNED_SUBS: Record<string, { product: string; plan: string } | 'none'> = {
    'jamie@example.com': { product: productIds.hlPlus, plan: 'heartline_plus_monthly' },
    'sarah@example.com': 'none',
  };

  function addSubsForCustomers(
    slug: Exclude<SeedTenantSlug, 'goldspire'>,
    customers: CustomerRow[],
    productPool: string[],
  ) {
    const rng = rngForTenant(`${slug}:subs`);
    let i = 0;
    for (const c of customers) {
      i += 1;
      const pinned = PINNED_SUBS[c.email.toLowerCase()];
      if (pinned === 'none') continue;

      if (pinned) {
        const subId = stableUlid(`sub:${slug}:${c.id}:${pinned.product}`);
        const periodStart = daysAgo(rng, 30);
        const periodEnd = new Date(periodStart.getTime() + 32 * 86_400_000);
        subscriptionRows.push({
          id: subId,
          tenantId: tenantId[slug],
          userId: c.id,
          productId: pinned.product,
          provider: 'mock',
          providerSubscriptionId: stableUlid(`provsub:${subId}`),
          plan: pinned.plan,
          status: 'active',
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          trialEndsAt: null,
          canceledAt: null,
          cancelAtPeriodEnd: false,
          metadata: { seeded: true, pinned: true },
        });
        continue;
      }

      const gate = (i * 7919 + slug.length * 97) % 100;
      if (gate >= 65) continue;
      const st = subStatus(rng);
      const pid = pickProduct(rng, productPool);
      const subId = stableUlid(`sub:${slug}:${c.id}:${pid}`);
      const periodStart = daysAgo(rng, 45);
      const periodEnd = new Date(periodStart.getTime() + 32 * 86_400_000);
      subscriptionRows.push({
        id: subId,
        tenantId: tenantId[slug],
        userId: c.id,
        productId: pid,
        provider: 'mock',
        providerSubscriptionId: stableUlid(`provsub:${subId}`),
        plan:
          slug === 'heartline'
            ? pid === productIds.hlPremium
              ? 'heartline_premium_yearly'
              : pid === productIds.hlPlus
                ? 'heartline_plus_monthly'
                : 'heartline_free'
            : `${slug.replace(/-/g, '_')}_plan`,
        status: st,
        currentPeriodStart: st === 'canceled' ? daysAgo(rng, 120) : periodStart,
        currentPeriodEnd: st === 'canceled' ? daysAgo(rng, 60) : periodEnd,
        trialEndsAt: st === 'trialing' ? new Date(Date.now() + 5 * 86_400_000) : null,
        canceledAt: st === 'canceled' ? daysAgo(rng, 30) : null,
        cancelAtPeriodEnd: st === 'canceled',
        metadata: { seeded: true },
      });
    }
  }

  addSubsForCustomers('heartline', customersByTenant.heartline, heartlineProducts);
  addSubsForCustomers('nova-care', customersByTenant['nova-care'], novaProducts);
  addSubsForCustomers('bazaar', customersByTenant.bazaar, bazaarProducts);
  addSubsForCustomers('pulse-club', customersByTenant['pulse-club'], pulseProducts);

  if (subscriptionRows.length) {
    await db.insert(schema.subscription).values(subscriptionRows);
  }

  // ─── Audit log (30–100 events / tenant, last 30 days) ─────────────────────
  const auditRows: (typeof schema.auditLog.$inferInsert)[] = [];
  for (const slug of SEED_TENANT_SLUGS) {
    const rng = rngForTenant(`${slug}:audit`);
    const tid = tenantId[slug];
    const tenantUsers = allUsers.filter((u) => u.tenantId === tid);
    const n = 30 + Math.floor(rng() * 71);
    for (let i = 0; i < n; i++) {
      const actor = tenantUsers[Math.floor(rng() * tenantUsers.length)];
      const action = AUDIT_ACTIONS[Math.floor(rng() * AUDIT_ACTIONS.length)]!;
      auditRows.push({
        id: stableUlid(`audit:${slug}:${i}`),
        tenantId: tid,
        actorId: actor?.id ?? null,
        actorRole: actor?.role ?? null,
        action,
        entityType:
          action.includes('subscription')
            ? 'subscription'
            : action.includes('flag')
              ? 'feature_flag'
              : action.includes('product')
                ? 'product'
                : action.includes('user')
                  ? 'user'
                  : 'tenant',
        entityId: stableUlid(`audit-entity:${slug}:${i}`),
        metadata: { source: 'seed', index: i },
        ipAddress: `203.0.113.${1 + Math.floor(rng() * 200)}`,
        userAgent: 'GoldspireSeedScript/1.0',
        createdAt: hoursAgoInLast30d(rng),
      });
    }
  }
  await db.insert(schema.auditLog).values(auditRows);

  // ─── Feature flag overrides ──────────────────────────────────────────────
  const heartlineCapabilityFlags = buildHeartlineCapabilityFlagRows({
    tenantId: tenantId.heartline,
    preset: 'showroom',
    stableUlid,
  });

  const flagRows: (typeof schema.featureFlag.$inferInsert)[] = [
    ...heartlineCapabilityFlags,
    {
      id: stableUlid('flag:nv-gdpr'),
      tenantId: tenantId['nova-care'],
      key: 'compliance.gdpr_strict',
      kind: 'feature',
      tags: ['compliance'],
      enabled: true,
      description: 'HIPAA-friendly consent copy + export reminders',
    },
    {
      id: stableUlid('flag:nv-rate'),
      tenantId: tenantId['nova-care'],
      key: 'limit.api_rate_per_min',
      kind: 'limit',
      tags: ['security'],
      enabled: true,
      numericValue: 120,
      description: null,
    },
    {
      id: stableUlid('flag:bz-export'),
      tenantId: tenantId.bazaar,
      key: 'feature.export_csv',
      kind: 'feature',
      tags: [],
      enabled: true,
      description: 'Seller ops requested CSV exports',
    },
    {
      id: stableUlid('flag:bz-dark'),
      tenantId: tenantId.bazaar,
      key: 'feature.dark_mode',
      kind: 'feature',
      tags: ['brand'],
      enabled: true,
      description: null,
    },
    {
      id: stableUlid('flag:pulse-ref'),
      tenantId: tenantId['pulse-club'],
      key: 'module.referrals',
      kind: 'module',
      tags: [],
      enabled: true,
      description: 'Member referral loop for summer cohort',
    },
    {
      id: stableUlid('flag:pulse-ai'),
      tenantId: tenantId['pulse-club'],
      key: 'module.ai_features',
      kind: 'module',
      tags: ['ai'],
      enabled: true,
      description: null,
    },
    {
      id: stableUlid('flag:gs-crm'),
      tenantId: tenantId.goldspire,
      key: 'module.crm_export',
      kind: 'module',
      tags: [],
      enabled: true,
      description: 'Studio pipeline exports',
    },
    {
      id: stableUlid('flag:gs-live'),
      tenantId: tenantId.goldspire,
      key: 'module.live_video',
      kind: 'module',
      tags: [],
      enabled: false,
      description: 'Off for studio tenants by default',
    },
    {
      id: stableUlid('flag:global-deals'),
      tenantId: null,
      key: 'module.studio_deals',
      kind: 'module',
      tags: [],
      enabled: true,
      description: 'Deal desk enabled for studio operators',
    },
    {
      id: stableUlid('flag:global-readonly'),
      tenantId: null,
      key: 'ops.read_only',
      kind: 'operation',
      tags: ['security'],
      enabled: false,
      description: 'Dry-run posture for migrations',
    },
  ];
  await db.insert(schema.featureFlag).values(flagRows);

  // ─── Studio deals ───────────────────────────────────────────────────────
  const eamonId = userIdByEmail.get('eamon@goldspire.dev'.toLowerCase())!;

  const deals: (typeof schema.studioDeal.$inferInsert)[] = [
    {
      id: SEED_DEAL_IDS[0],
      title: 'Nova Care MVP build',
      clientName: 'Nova Care',
      engagementKind: 'mvp_plus_prod_planned',
      clientRisk: 'referred',
      subcontracting: 'light',
      weeksMin: 10,
      weeksMax: 16,
      totalFeeMinorUnits: 248_000_00,
      currency: 'EUR',
      status: 'won',
      planSnapshot: buildCommercialPlan({
        engagementKind: 'mvp_plus_prod_planned',
        clientRisk: 'referred',
        subcontracting: 'light',
        weeksMin: 10,
        weeksMax: 16,
        totalFeeMinorUnits: 248_000_00,
        currency: 'EUR',
      }),
      notes: 'Telehealth booking MVP + production hardening; referral from existing clinic partner.',
      linkedTenantId: tenantId['nova-care'],
      createdByUserId: eamonId,
    },
    {
      id: SEED_DEAL_IDS[1],
      title: 'Pulse Club expansion phase 2',
      clientName: 'Pulse Club',
      engagementKind: 'mvp_plus_prod_planned',
      clientRisk: 'unknown',
      subcontracting: 'heavy',
      weeksMin: 14,
      weeksMax: 22,
      totalFeeMinorUnits: 186_500_00,
      currency: 'EUR',
      status: 'pipeline',
      planSnapshot: buildCommercialPlan({
        engagementKind: 'mvp_plus_prod_planned',
        clientRisk: 'unknown',
        subcontracting: 'heavy',
        weeksMin: 14,
        weeksMax: 22,
        totalFeeMinorUnits: 186_500_00,
        currency: 'EUR',
      }),
      notes: 'Events module + referrals + mobile surfaces.',
      linkedTenantId: tenantId['pulse-club'],
      createdByUserId: eamonId,
    },
    {
      id: SEED_DEAL_IDS[2],
      title: 'Acme Corp discovery call',
      clientName: 'Acme Corporation',
      engagementKind: 'mvp',
      clientRisk: 'enterprise',
      subcontracting: 'none',
      weeksMin: 6,
      weeksMax: 10,
      totalFeeMinorUnits: 95_000_00,
      currency: 'EUR',
      status: 'draft',
      planSnapshot: buildCommercialPlan({
        engagementKind: 'mvp',
        clientRisk: 'enterprise',
        subcontracting: 'none',
        weeksMin: 6,
        weeksMax: 10,
        totalFeeMinorUnits: 95_000_00,
        currency: 'EUR',
      }),
      notes: 'Initial discovery — scope TBD after stakeholder workshops.',
      linkedTenantId: null,
      createdByUserId: eamonId,
    },
    {
      id: SEED_DEAL_IDS[3],
      title: 'Heartline retention sprint',
      clientName: 'Heartline',
      engagementKind: 'mvp',
      clientRisk: 'referred',
      subcontracting: 'light',
      weeksMin: 4,
      weeksMax: 6,
      totalFeeMinorUnits: 42_000_00,
      currency: 'EUR',
      status: 'pipeline',
      planSnapshot: buildCommercialPlan({
        engagementKind: 'mvp',
        clientRisk: 'referred',
        subcontracting: 'light',
        weeksMin: 4,
        weeksMax: 6,
        totalFeeMinorUnits: 42_000_00,
        currency: 'EUR',
      }),
      notes: 'Swipe v2 experiment wrap-up + paywall analytics.',
      linkedTenantId: tenantId.heartline,
      intakeTemplateId: 'social_matching_v1',
      createdByUserId: eamonId,
    },
    {
      id: SEED_DEAL_IDS[4],
      title: 'Bazaar seller tooling M2',
      clientName: 'Bazaar',
      engagementKind: 'mvp',
      clientRisk: 'unknown',
      subcontracting: 'none',
      weeksMin: 5,
      weeksMax: 8,
      totalFeeMinorUnits: 58_750_00,
      currency: 'EUR',
      status: 'won',
      planSnapshot: buildCommercialPlan({
        engagementKind: 'mvp',
        clientRisk: 'unknown',
        subcontracting: 'none',
        weeksMin: 5,
        weeksMax: 8,
        totalFeeMinorUnits: 58_750_00,
        currency: 'EUR',
      }),
      notes: 'CSV exports + featured listing workflows.',
      linkedTenantId: tenantId.bazaar,
      createdByUserId: eamonId,
    },
    {
      id: STUDIO_SALES_DEMO_DEAL_ID,
      title: 'Sample: Tier 1 dating clone',
      clientName: 'Northline (sample)',
      engagementKind: 'mvp',
      clientRisk: 'referred',
      subcontracting: 'none',
      weeksMin: 6,
      weeksMax: 10,
      totalFeeMinorUnits: 20_000_00,
      currency: 'EUR',
      status: 'pipeline',
      planSnapshot: buildCommercialPlan({
        engagementKind: 'mvp',
        clientRisk: 'referred',
        subcontracting: 'none',
        weeksMin: 6,
        weeksMax: 10,
        totalFeeMinorUnits: 20_000_00,
        currency: 'EUR',
      }),
      milestoneState: {
        kickoff: {
          status: 'done',
          completedAt: offsetDaysFromNow(-18).toISOString(),
        },
        staging: {
          status: 'in_progress',
          dueAt: offsetDaysFromNow(14).toISOString(),
        },
        uat: { status: 'pending' },
      },
      intakeTemplateId: 'social_matching_v1',
      clientIntake: {},
      clientContactEmail: 'demo.client@goldspire.dev',
      dealAcceptedAt: offsetDaysFromNow(-16),
      stagingUrl: process.env.NEXT_PUBLIC_HEARTLINE_DEMO_URL?.trim() || 'http://localhost:4000',
      clientDeliveryFocus: 'This month: Heartline onboarding flow + discover polish on staging.',
      notes:
        'Sales sample for demos and screenshots. Token is in @goldspire/config/studio-sales-demo — do not treat as a real client.',
      linkedTenantId: tenantId.heartline,
      createdByUserId: eamonId,
    },
    {
      id: STUDIO_TIER2_DEMO_DEAL_ID,
      title: 'Sample: Tier 2 mentorship template',
      clientName: 'Northline Growth (sample)',
      engagementKind: TIER2_TEMPLATE_PRESET.planInput.engagementKind,
      clientRisk: TIER2_TEMPLATE_PRESET.planInput.clientRisk,
      subcontracting: TIER2_TEMPLATE_PRESET.planInput.subcontracting,
      weeksMin: TIER2_TEMPLATE_PRESET.planInput.weeksMin,
      weeksMax: TIER2_TEMPLATE_PRESET.planInput.weeksMax,
      totalFeeMinorUnits: TIER2_TEMPLATE_PRESET.planInput.totalFeeMinorUnits,
      currency: TIER2_TEMPLATE_PRESET.planInput.currency,
      status: 'pipeline',
      planSnapshot: buildCommercialPlan(TIER2_TEMPLATE_PRESET.planInput),
      dealPresetSlug: TIER2_TEMPLATE_PRESET.slug,
      intakeTemplateId: 'social_matching_v1',
      clientIntake: {
        templateId: 'social_matching_v1',
        version: 1,
        answers: { targetTemplateId: 'social_matching/mentorship' },
        submittedAt: offsetDaysFromNow(-5).toISOString(),
        lastSavedAt: offsetDaysFromNow(-5).toISOString(),
      },
      clientContactEmail: 'tier2.demo@goldspire.dev',
      dealAcceptedAt: offsetDaysFromNow(-7),
      notes:
        'Tier 2 sample for portal delivery sign-offs and template-spec runbook. Token in @goldspire/config/studio-tier2-demo.',
      linkedTenantId: null,
      createdByUserId: eamonId,
    },
  ];
  await db.insert(schema.studioDeal).values(deals);

  const salesDemoPlan = deals.find((d) => d.id === STUDIO_SALES_DEMO_DEAL_ID)!.planSnapshot;
  await db.insert(schema.studioDealPaymentLine).values(
    salesDemoPlan.milestones.map((m) => ({
      dealId: STUDIO_SALES_DEMO_DEAL_ID,
      milestoneKey: m.key,
      sortOrder: m.order,
      label: m.title,
      amountMinorUnits: m.amountMinorUnits,
      currency: 'EUR',
      status: m.key === 'kickoff' ? ('paid' as const) : ('pending' as const),
      paidAt: m.key === 'kickoff' ? offsetDaysFromNow(-15) : null,
    })),
  );

  await db.insert(schema.studioDealPortalToken).values([
    {
      dealId: STUDIO_SALES_DEMO_DEAL_ID,
      tokenHash: STUDIO_SALES_DEMO_PORTAL_TOKEN_HASH,
      expiresAt: null,
      scopes: ['view', 'accept', 'pay', 'intake', 'note'],
    },
    {
      dealId: STUDIO_TIER2_DEMO_DEAL_ID,
      tokenHash: STUDIO_TIER2_DEMO_PORTAL_TOKEN_HASH,
      expiresAt: null,
      scopes: ['view', 'accept', 'pay', 'intake', 'note'],
    },
  ]);

  const tier2DemoPlan = buildCommercialPlan(TIER2_TEMPLATE_PRESET.planInput);
  await db.insert(schema.studioDealPaymentLine).values(
    tier2DemoPlan.milestones.map((m) => ({
      dealId: STUDIO_TIER2_DEMO_DEAL_ID,
      milestoneKey: m.key,
      sortOrder: m.order,
      label: m.title,
      amountMinorUnits: m.amountMinorUnits,
      currency: 'EUR',
      status: m.key === 'kickoff' ? ('paid' as const) : ('pending' as const),
      paidAt: m.key === 'kickoff' ? offsetDaysFromNow(-6) : null,
    })),
  );

  const demoAcceptedAt = offsetDaysFromNow(-16).toISOString();
  await insertStudioDealActivity(db, {
    dealId: STUDIO_SALES_DEMO_DEAL_ID,
    kind: 'deal_accepted',
    source: 'portal',
    payload: { acceptedAt: demoAcceptedAt },
  });
  await insertStudioDealActivity(db, {
    dealId: STUDIO_SALES_DEMO_DEAL_ID,
    kind: 'payment_settled',
    source: 'system',
    payload: { milestoneKey: 'kickoff', label: 'Contract & kickoff' },
  });
  await insertStudioDealActivity(db, {
    dealId: STUDIO_SALES_DEMO_DEAL_ID,
    kind: 'studio_note',
    source: 'console',
    payload: {
      text: 'Staging build refreshed — onboarding flow v2 is live. Have a click before Friday’s demo.',
    },
    actorUserId: eamonId,
  });
  await insertStudioDealActivity(db, {
    dealId: STUDIO_SALES_DEMO_DEAL_ID,
    kind: 'milestone_updated',
    source: 'system',
    payload: { milestoneKey: 'staging', status: 'in_progress' },
  });

  // ─── Product deployments (portal launcher) ───────────────────────────────
  await db.insert(schema.productDeployment).values([
    {
      id: stableUlid('deploy:console-local'),
      tenantId: tenantId.goldspire,
      productId: null,
      kind: 'console',
      environment: 'local',
      name: 'Goldspire Studio Console',
      tagline: 'Control plane for tenants, blueprints, and shipping.',
      accent: '#0F172A',
      localDevUrl: devUrl('console'),
      localDevCommand: 'pnpm --filter @goldspire/console dev',
      repoPath: 'apps/console',
      healthCheckPath: '/api/health',
      isStudioTool: true,
    },
    {
      id: stableUlid('deploy:admin-local'),
      tenantId: tenantId.goldspire,
      productId: null,
      kind: 'admin',
      environment: 'local',
      name: 'Goldspire Admin',
      tagline: 'Per-tenant administration and moderation.',
      accent: '#475569',
      localDevUrl: devUrl('admin'),
      localDevCommand: 'pnpm --filter @goldspire/admin dev',
      repoPath: 'apps/admin',
      healthCheckPath: '/api/health',
      isStudioTool: true,
    },
    {
      id: stableUlid('deploy:atlas-local'),
      tenantId: tenantId.goldspire,
      productId: null,
      kind: 'atlas',
      environment: 'local',
      name: 'Goldspire Atlas',
      tagline: 'Role-scoped knowledge portal — ask the platform in plain English.',
      accent: '#7C3AED',
      localDevUrl: devUrl('atlas'),
      localDevCommand: 'pnpm --filter @goldspire/atlas dev',
      repoPath: 'apps/atlas',
      healthCheckPath: '/api/health',
      isStudioTool: true,
    },
    {
      id: stableUlid('deploy:atlas-staging'),
      tenantId: tenantId.goldspire,
      productId: null,
      kind: 'atlas',
      environment: 'staging',
      name: 'Goldspire Atlas (staging)',
      tagline: 'Role-scoped knowledge portal — staging deployment.',
      accent: '#7C3AED',
      url:
        process.env.NEXT_PUBLIC_ATLAS_STAGING_URL?.trim() ||
        process.env.NEXT_PUBLIC_ATLAS_URL?.trim() ||
        'https://atlas.goldspire.studio',
      repoPath: 'apps/atlas',
      healthCheckPath: '/api/health',
      isStudioTool: true,
    },
    {
      id: stableUlid('deploy:heartline-web-local'),
      tenantId: tenantId.heartline,
      productId: productIds.hlFree,
      blueprint: 'social_matching',
      kind: 'web',
      environment: 'local',
      name: 'Heartline Web',
      tagline: 'Dating — discovery to match to chat.',
      accent: '#E15A82',
      localDevUrl: devUrl('heartline'),
      localDevCommand: 'pnpm --filter @goldspire/dating-web dev',
      repoPath: 'apps/dating-web',
      healthCheckPath: '/api/health',
    },
    {
      id: stableUlid('deploy:heartline-ios-local'),
      tenantId: tenantId.heartline,
      productId: productIds.hlFree,
      blueprint: 'social_matching',
      kind: 'mobile_ios',
      environment: 'local',
      name: 'Heartline iOS',
      tagline: 'Expo client for Heartline.',
      accent: '#E15A82',
      localDevCommand: 'pnpm --filter @goldspire/dating-mobile dev',
      repoPath: 'apps/dating-mobile',
      mobileScheme: 'heartline://',
    },
    {
      id: stableUlid('deploy:nova-web-local'),
      tenantId: tenantId['nova-care'],
      productId: productIds.nvStandard,
      blueprint: 'multi_staff_booking',
      kind: 'web',
      environment: 'local',
      name: 'Nova Care Web',
      tagline: 'Telehealth scheduling and visit history.',
      accent: '#7C5CFF',
      localDevUrl: devUrl('nova_care'),
      localDevCommand: 'pnpm --filter @goldspire/booking-web dev',
      repoPath: 'apps/booking-web',
      healthCheckPath: '/api/health',
    },
    {
      id: stableUlid('deploy:bazaar-web-local'),
      tenantId: tenantId.bazaar,
      productId: productIds.bzListing,
      blueprint: 'marketplace',
      kind: 'web',
      environment: 'local',
      name: 'Bazaar Web',
      tagline: 'Artisan marketplace — listings, checkout, payouts.',
      accent: '#F4B740',
      localDevUrl: devUrl('bazaar'),
      localDevCommand: 'pnpm --filter @goldspire/marketplace-web dev',
      repoPath: 'apps/marketplace-web',
      healthCheckPath: '/api/health',
    },
    {
      id: stableUlid('deploy:pulse-web-local'),
      tenantId: tenantId['pulse-club'],
      productId: productIds.pcMembership,
      blueprint: 'community',
      kind: 'web',
      environment: 'local',
      name: 'Pulse Club Web',
      tagline: 'Community spaces, events, and member directory.',
      accent: '#22C55E',
      localDevUrl: devUrl('signal'),
      localDevCommand: 'pnpm --filter @goldspire/community-web dev',
      repoPath: 'apps/community-web',
      healthCheckPath: '/api/health',
    },
  ]);

  // ─── Owner Lab ventures (demo portfolio) ───────────────────────────────
  const SEED_VENTURE_SLUGS = ['inventory-ios', 'studio-lab-meta', 'heartline-operator'] as const;
  await db
    .delete(schema.studioVenture)
    .where(inArray(schema.studioVenture.slug, [...SEED_VENTURE_SLUGS]));

  await db.insert(schema.studioVenture).values([
    {
      id: stableUlid('venture:inventory-ios'),
      slug: 'inventory-ios',
      name: 'Inventory iOS',
      tagline: 'Personal inventory tracker with shopping list',
      status: 'active',
      category: 'product',
      priority: 2,
      localPath: 'C:\\Users\\eamon\\Personal Projects\\Inventory',
      cursorWorkspace: 'Inventory.xcodeproj',
      nextAction: 'Polish shopping list UX and TestFlight build',
      linkedDeploymentId: stableUlid('deploy:heartline-web-local'),
      manualMrrMinor: 12500,
      monthlyCostsMinor: 4000,
      runwayMonths: 18,
      economicsNotes: 'Pre-revenue side project; manual MRR placeholder for Lab economics UI demo.',
      ownershipPercent: 100,
      timeAllocationPercent: 20,
      economicsMode: 'cash',
      stripeAccountHint: 'inventory-ios',
      plLines: [
        { id: 'pl-inv-rev', kind: 'revenue', label: 'App subscriptions (manual)', amountMinor: 12500, currency: 'eur' },
        { id: 'pl-inv-cogs', kind: 'cogs', label: 'Apple + infra', amountMinor: 2500, currency: 'eur' },
      ],
      okrs: [
        {
          id: 'okr-inv-1',
          objective: 'Ship TestFlight beta',
          keyResult: '50 testers onboarded',
          progressPercent: 40,
          quarter: 'Q2',
        },
      ],
      metrics: [
        { key: 'testflight', label: 'TestFlight builds', value: '3', unit: null, recordedAt: NOW.toISOString() },
      ],
      metricHistory: [
        {
          recordedAt: new Date(NOW.getTime() - 30 * 86400000).toISOString(),
          metrics: [{ key: 'testflight', label: 'TestFlight builds', value: '2', unit: null, recordedAt: NOW.toISOString() }],
        },
        {
          recordedAt: NOW.toISOString(),
          metrics: [{ key: 'testflight', label: 'TestFlight builds', value: '3', unit: null, recordedAt: NOW.toISOString() }],
        },
      ],
      docsMarkdown:
        '## Scope\nNative SwiftUI app for home inventory.\n\n## Stack\nSwiftUI, Core Data, CloudKit later.\n\n## Apps link (demo)\nLinked to **Heartline Web** in Apps so you can try Lab → Apps deep-link without shipping Inventory. Real code path is local folder above.\n\n## Open questions\n- Barcode scan v1 or v2?\n- Share list with household?',
      tags: ['ios', 'cursor', 'personal'],
      lastTouchedAt: NOW,
    },
    {
      id: stableUlid('venture:studio-lab-meta'),
      slug: 'studio-lab-meta',
      name: 'Goldspire Lab surface',
      tagline: 'This Console page — portfolio command center',
      status: 'shipped',
      category: 'tool',
      priority: 3,
      repoUrl: 'https://github.com/eolaniyan/goldspire-launch-stack',
      localPath: 'C:\\Users\\eamon\\Personal Projects\\goldspire-launch-stack',
      linkedDeploymentId: stableUlid('deploy:console-local'),
      shippedAt: NOW,
      nextAction: 'Add ventures for each Cursor workspace you care about',
      docsMarkdown:
        '## Purpose\nOwner-only registry for side projects + Atlas `studio.ventures` corpus.\n\n## Integration\nDesk queue, Apps grid, Playbooks for SOPs.',
      tags: ['studio', 'meta'],
      lastTouchedAt: NOW,
    },
    {
      id: stableUlid('venture:heartline-operator'),
      slug: 'heartline-operator',
      name: 'Heartline (operator view)',
      tagline: 'Demo: tenant-linked MRR + live deployment health',
      status: 'shipped',
      category: 'product',
      priority: 2,
      linkedTenantId: tenantId.heartline,
      linkedDeploymentId: stableUlid('deploy:heartline-web-local'),
      shippedAt: NOW,
      nextAction: 'Review dating-web conversion funnel',
      metrics: [
        { key: 'mau', label: 'MAU (demo)', value: '12400', unit: null, recordedAt: NOW.toISOString() },
        { key: 'conversion', label: 'Signup conversion', value: '4.2', unit: '%', recordedAt: NOW.toISOString() },
      ],
      metricHistory: [
        {
          recordedAt: new Date(NOW.getTime() - 14 * 86400000).toISOString(),
          metrics: [
            { key: 'mau', label: 'MAU (demo)', value: '11800', unit: null, recordedAt: NOW.toISOString() },
            { key: 'conversion', label: 'Signup conversion', value: '3.9', unit: '%', recordedAt: NOW.toISOString() },
          ],
        },
        {
          recordedAt: NOW.toISOString(),
          metrics: [
            { key: 'mau', label: 'MAU (demo)', value: '12400', unit: null, recordedAt: NOW.toISOString() },
            { key: 'conversion', label: 'Signup conversion', value: '4.2', unit: '%', recordedAt: NOW.toISOString() },
          ],
        },
      ],
      externalBillingUrl: 'https://dashboard.stripe.com/test/dashboard',
      ownershipPercent: 100,
      timeAllocationPercent: 35,
      economicsMode: 'accrual',
      plLines: [
        { id: 'pl-hl-rev', kind: 'revenue', label: 'SaaS subscriptions', amountMinor: 89000, currency: 'eur' },
        { id: 'pl-hl-opex', kind: 'opex', label: 'Hosting + support', amountMinor: 22000, currency: 'eur' },
      ],
      okrs: [
        {
          id: 'okr-hl-1',
          objective: 'Improve signup conversion',
          keyResult: 'Reach 5% trial-to-paid',
          progressPercent: 55,
          quarter: 'Q2',
        },
      ],
      docsMarkdown:
        '## Purpose\nShows how a **shipped** venture links to a real tenant for automatic MRR and to Apps for health.\n\nNot your personal Inventory app — a product you operate inside the stack.',
      tags: ['demo', 'dating'],
      lastTouchedAt: NOW,
    },
  ]);

  // ─── Summary ────────────────────────────────────────────────────────────
  const tenantIds = Object.values(tenantId);
  const [tenantCountRow] = await db
    .select({ n: count() })
    .from(schema.tenant)
    .where(inArray(schema.tenant.slug, [...SEED_TENANT_SLUGS]));
  const [userCountRow] = await db
    .select({ n: count() })
    .from(schema.user)
    .where(inArray(schema.user.tenantId, tenantIds));
  const [productCountRow] = await db
    .select({ n: count() })
    .from(schema.product)
    .where(inArray(schema.product.tenantId, tenantIds));
  const [subCountRow] = await db
    .select({ n: count() })
    .from(schema.subscription)
    .where(inArray(schema.subscription.tenantId, tenantIds));
  const [auditCountRow] = await db
    .select({ n: count() })
    .from(schema.auditLog)
    .where(inArray(schema.auditLog.tenantId, tenantIds));
  const [dealCountRow] = await db
    .select({ n: count() })
    .from(schema.studioDeal)
    .where(inArray(schema.studioDeal.id, [...SEED_DEAL_IDS]));

  const tenants = tenantCountRow?.n ?? 0;
  const users = userCountRow?.n ?? 0;
  const products = productCountRow?.n ?? 0;
  const subscriptions = subCountRow?.n ?? 0;
  const audits = auditCountRow?.n ?? 0;
  const flagOverrides = flagRows.length;
  const dealCount = dealCountRow?.n ?? 0;

  const summary = `Seeded ${tenants} tenants, ${users} users, ${products} products, ${subscriptions} subscriptions, ${audits} audit events, ${flagOverrides} flag overrides, ${dealCount} deals`;
  console.log(`✓ ${summary}`);
  await conn.end();
}

function isConnectionRefused(err: unknown): boolean {
  if (err && typeof err === 'object' && 'code' in err && (err as { code?: string }).code === 'ECONNREFUSED') {
    return true;
  }
  if (err instanceof AggregateError) {
    return err.errors.some(
      (e) => e && typeof e === 'object' && 'code' in e && (e as { code?: string }).code === 'ECONNREFUSED',
    );
  }
  return false;
}

seed().catch(async (err) => {
  console.error('✗ seed failed:', err);
  if (isConnectionRefused(err)) {
    console.error(
      '\nHint: Postgres refused the connection. Set DATABASE_URL in `.env` to a reachable instance (e.g. Supabase), or start Postgres on the host and port in your URL.',
    );
  }
  try {
    await conn.end();
  } catch {
    /* noop */
  }
  process.exit(1);
});
