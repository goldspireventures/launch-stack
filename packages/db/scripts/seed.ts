/* eslint-disable no-console */
import './_load-env';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
import { ulid } from 'ulid';
import { ENTITLEMENT_KEYS } from '@goldspire/config';
import { env, getMigrationDatabaseUrl } from '@goldspire/config/env';
import * as schema from '../src/schema/index.js';

const conn = postgres(getMigrationDatabaseUrl(), { max: 1, prepare: false });
const db = drizzle(conn, { schema, casing: 'snake_case' });

const NOW = new Date();
const yearsAgo = (n: number) => new Date(NOW.getFullYear() - n, NOW.getMonth(), NOW.getDate());

async function setRole(role: 'STUDIO_OWNER' | 'TENANT_OWNER') {
  await conn.unsafe(`select set_config('app.role', '${role}', true)`);
}

async function seed() {
  console.log('▸ seeding Goldspire launch stack...');
  // Studio bypass for all writes during seed
  await setRole('STUDIO_OWNER');

  // --- Studio tenant ---
  const studioTenantId = ulid();
  const acmeTenantId = ulid();
  const heartlineTenantId = ulid();

  await db.insert(schema.tenant).values([
    {
      id: studioTenantId,
      name: 'Goldspire Studio',
      slug: 'goldspire',
      status: 'active',
      plan: 'enterprise',
      metadata: { type: 'studio' },
    },
    {
      id: acmeTenantId,
      name: 'Acme Co',
      slug: 'acme',
      status: 'active',
      plan: 'studio',
      metadata: { industry: 'demo' },
    },
    {
      id: heartlineTenantId,
      name: 'Heartline Dating',
      slug: 'heartline',
      status: 'active',
      plan: 'studio',
      theme: { accent: '#E15A82', accentForeground: '#FFFFFF' },
      metadata: { industry: 'dating' },
    },
  ]);

  // --- Studio team (you, as STUDIO_OWNER, across all tenants) ---
  const studioOwnerId = ulid();
  await db.insert(schema.user).values({
    id: studioOwnerId,
    tenantId: studioTenantId,
    email: 'owner@goldspire.studio',
    name: 'Goldspire Owner',
    role: 'STUDIO_OWNER',
    status: 'active',
  });

  // --- Heartline product (Social Matching blueprint) ---
  const heartlineProductId = ulid();
  await db.insert(schema.product).values({
    id: heartlineProductId,
    tenantId: heartlineTenantId,
    name: 'Heartline',
    slug: 'heartline-dating',
    blueprint: 'social_matching',
    status: 'live',
    config: {
      ageMin: 18,
      ageMax: 60,
      defaultDistanceKm: 50,
      dailyLikesFree: 25,
      premiumPriceCents: 1499,
    },
    launchedAt: NOW,
  });

  // --- Heartline owner ---
  const heartlineOwnerId = ulid();
  await db.insert(schema.user).values({
    id: heartlineOwnerId,
    tenantId: heartlineTenantId,
    email: 'admin@heartline.demo',
    name: 'Heartline Admin',
    role: 'TENANT_OWNER',
    status: 'active',
  });

  // --- Heartline end-users (mock dating profiles) ---
  type DemoUser = {
    id: string;
    email: string;
    name: string;
    displayName: string;
    bio: string;
    gender: 'woman' | 'man' | 'non_binary';
    interestedIn: ('woman' | 'man' | 'non_binary')[];
    seeking: 'long_term' | 'short_term' | 'friendship' | 'casual' | 'figuring_it_out';
    city: string;
    birthYear: number;
    avatarUrl: string;
  };

  const demoUsers: DemoUser[] = [
    {
      id: ulid(),
      email: 'ava@heartline.demo',
      name: 'Ava Reyes',
      displayName: 'Ava',
      bio: 'Photographer, plant-collector, long walks at golden hour.',
      gender: 'woman',
      interestedIn: ['man', 'non_binary'],
      seeking: 'long_term',
      city: 'Brooklyn, NY',
      birthYear: 1996,
      avatarUrl:
        'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'noor@heartline.demo',
      name: 'Noor Hassan',
      displayName: 'Noor',
      bio: 'Architect turning sketches into spaces. Coffee snob. Always reading two books at once.',
      gender: 'woman',
      interestedIn: ['woman', 'non_binary'],
      seeking: 'long_term',
      city: 'Toronto, ON',
      birthYear: 1995,
      avatarUrl:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'kai@heartline.demo',
      name: 'Kai Tanaka',
      displayName: 'Kai',
      bio: 'Engineer by day, ramen scientist by night. Pet me a dog and I melt.',
      gender: 'man',
      interestedIn: ['woman'],
      seeking: 'long_term',
      city: 'San Francisco, CA',
      birthYear: 1992,
      avatarUrl:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'mateo@heartline.demo',
      name: 'Mateo Vargas',
      displayName: 'Mateo',
      bio: 'Bartender, vinyl hoarder, sometimes a chef. Looking for someone to slow-dance with.',
      gender: 'man',
      interestedIn: ['woman', 'non_binary'],
      seeking: 'long_term',
      city: 'Austin, TX',
      birthYear: 1994,
      avatarUrl:
        'https://images.unsplash.com/photo-1503443207922-dff7d543fd0e?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'sage@heartline.demo',
      name: 'Sage Okafor',
      displayName: 'Sage',
      bio: 'Climate engineer. Trail runner. Always rooting for the underdog.',
      gender: 'non_binary',
      interestedIn: ['woman', 'man', 'non_binary'],
      seeking: 'long_term',
      city: 'Portland, OR',
      birthYear: 1993,
      avatarUrl:
        'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'lila@heartline.demo',
      name: 'Lila Park',
      displayName: 'Lila',
      bio: 'Choreographer / part-time barista. Show me a sunset and I will probably cry.',
      gender: 'woman',
      interestedIn: ['man'],
      seeking: 'short_term',
      city: 'Los Angeles, CA',
      birthYear: 1997,
      avatarUrl:
        'https://images.unsplash.com/photo-1521252659862-eec69941b071?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'theo@heartline.demo',
      name: 'Theo Martin',
      displayName: 'Theo',
      bio: 'Astronomer with terrestrial interests: jazz, hot sauce, and surprise museum trips.',
      gender: 'man',
      interestedIn: ['woman', 'non_binary'],
      seeking: 'long_term',
      city: 'Boston, MA',
      birthYear: 1990,
      avatarUrl:
        'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?w=400&q=80&auto=format&fit=crop',
    },
    {
      id: ulid(),
      email: 'rina@heartline.demo',
      name: 'Rina Solberg',
      displayName: 'Rina',
      bio: 'Marine biologist / amateur potter. Will absolutely drag you to a tide pool.',
      gender: 'woman',
      interestedIn: ['woman', 'man'],
      seeking: 'long_term',
      city: 'Seattle, WA',
      birthYear: 1991,
      avatarUrl:
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&auto=format&fit=crop',
    },
  ];

  await db.insert(schema.user).values(
    demoUsers.map((u) => ({
      id: u.id,
      tenantId: heartlineTenantId,
      email: u.email,
      name: u.name,
      avatarUrl: u.avatarUrl,
      role: 'CUSTOMER' as const,
      status: 'active' as const,
    })),
  );

  await db.insert(schema.profile).values(
    demoUsers.map((u) => ({
      tenantId: heartlineTenantId,
      userId: u.id,
      displayName: u.displayName,
      bio: u.bio,
    })),
  );

  await db.insert(schema.datingProfile).values(
    demoUsers.map((u) => ({
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      userId: u.id,
      displayName: u.displayName,
      birthdate: new Date(u.birthYear, 4, 15).toISOString().slice(0, 10),
      gender: u.gender,
      interestedIn: u.interestedIn,
      seeking: u.seeking,
      bio: u.bio,
      city: u.city,
      countryCode: 'US',
      qualityScore: 60 + Math.floor(Math.random() * 35),
    })),
  );

  // One photo per user (the avatar) so the discovery feed has something to show
  await db.insert(schema.datingPhoto).values(
    await Promise.all(
      demoUsers.map(async (u) => {
        const profileRows = await db
          .select({ id: schema.datingProfile.id })
          .from(schema.datingProfile)
          .where(sql`${schema.datingProfile.userId} = ${u.id}`)
          .limit(1);
        return {
          tenantId: heartlineTenantId,
          profileId: profileRows[0]!.id,
          url: u.avatarUrl,
          storagePath: `dating/${u.id}/0.jpg`,
          position: 0,
        };
      }),
    ),
  );

  // --- Sample subscription + entitlement for Ava ---
  const avaSubId = ulid();
  await db.insert(schema.subscription).values({
    id: avaSubId,
    tenantId: heartlineTenantId,
    userId: demoUsers[0]!.id,
    productId: heartlineProductId,
    provider: 'mock',
    plan: 'heartline_plus_monthly',
    status: 'active',
    currentPeriodStart: yearsAgo(0),
    currentPeriodEnd: new Date(NOW.getFullYear(), NOW.getMonth() + 1, NOW.getDate()),
  });

  await db.insert(schema.entitlement).values([
    {
      tenantId: heartlineTenantId,
      userId: demoUsers[0]!.id,
      key: ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
      value: true,
      source: 'subscription',
      subscriptionId: avaSubId,
    },
    {
      tenantId: heartlineTenantId,
      userId: demoUsers[0]!.id,
      key: ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
      value: true,
      source: 'subscription',
      subscriptionId: avaSubId,
    },
  ]);

  // --- Feature flags (catalog defaults live in code; rows here are overrides only) ---
  await db.insert(schema.featureFlag).values([
    {
      tenantId: heartlineTenantId,
      key: 'module.live_video',
      kind: 'module',
      tags: [],
      enabled: true,
      description: null,
    },
    {
      tenantId: heartlineTenantId,
      key: 'ai.profile_assist',
      kind: 'feature',
      tags: ['ai'],
      enabled: true,
      description: null,
    },
    {
      tenantId: heartlineTenantId,
      key: 'limit.daily_likes',
      kind: 'limit',
      tags: [],
      enabled: true,
      numericValue: 50,
      description: null,
    },
    {
      tenantId: acmeTenantId,
      key: 'feature.export_csv',
      kind: 'feature',
      tags: [],
      enabled: false,
      description: null,
    },
    {
      tenantId: null,
      key: 'ops.maintenance_mode',
      kind: 'operation',
      tags: [],
      enabled: false,
      description: null,
    },
  ]);

  // --- Acme tenant: a B2B SaaS Shell product + a Booking product ---
  const acmeOwnerId = ulid();
  await db.insert(schema.user).values({
    id: acmeOwnerId,
    tenantId: acmeTenantId,
    email: 'owner@acme.demo',
    name: 'Acme Owner',
    role: 'TENANT_OWNER',
    status: 'active',
  });

  const acmeWorkspaceProductId = ulid();
  const acmeBookingsProductId = ulid();
  await db.insert(schema.product).values([
    {
      id: acmeWorkspaceProductId,
      tenantId: acmeTenantId,
      name: 'Acme Workspace',
      slug: 'acme-workspace',
      blueprint: 'b2b_saas_shell',
      status: 'live',
    },
    {
      id: acmeBookingsProductId,
      tenantId: acmeTenantId,
      name: 'Acme Bookings',
      slug: 'acme-bookings',
      blueprint: 'multi_staff_booking',
      status: 'staging',
    },
  ]);

  // --- A couple of swipes that should produce one match ---
  await db.insert(schema.datingSwipe).values([
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      fromUserId: demoUsers[0]!.id, // Ava → Kai
      toUserId: demoUsers[2]!.id,
      action: 'like',
    },
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      fromUserId: demoUsers[2]!.id, // Kai → Ava (mutual)
      toUserId: demoUsers[0]!.id,
      action: 'like',
    },
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      fromUserId: demoUsers[0]!.id, // Ava → Mateo (one-way)
      toUserId: demoUsers[3]!.id,
      action: 'like',
    },
  ]);

  await db.insert(schema.datingMatch).values({
    tenantId: heartlineTenantId,
    productId: heartlineProductId,
    userAId: demoUsers[0]!.id < demoUsers[2]!.id ? demoUsers[0]!.id : demoUsers[2]!.id,
    userBId: demoUsers[0]!.id < demoUsers[2]!.id ? demoUsers[2]!.id : demoUsers[0]!.id,
  });

  // --- Sample notification ---
  await db.insert(schema.notification).values({
    tenantId: heartlineTenantId,
    userId: demoUsers[0]!.id,
    type: 'match',
    status: 'pending',
    title: 'You matched with Kai',
    body: 'Say hi and break the ice ✨',
    channels: ['in_app', 'push'],
  });

  // --- Audit log entry ---
  await db.insert(schema.auditLog).values({
    tenantId: studioTenantId,
    actorId: studioOwnerId,
    actorRole: 'STUDIO_OWNER',
    action: 'tenant_created',
    entityType: 'tenant',
    entityId: heartlineTenantId,
    metadata: { plan: 'studio' },
  });

  // ─── Multi-Staff Booking blueprint: "Nova Care" tenant ───────────────
  const novaTenantId = ulid();
  const novaProductId = ulid();
  const novaOwnerId = ulid();
  await db.insert(schema.tenant).values({
    id: novaTenantId,
    name: 'Nova Care',
    slug: 'nova',
    status: 'active',
    plan: 'studio',
    theme: { accent: '#7C5CFF' },
    metadata: { industry: 'wellness' },
  });
  await db.insert(schema.user).values({
    id: novaOwnerId,
    tenantId: novaTenantId,
    email: 'owner@novacare.demo',
    name: 'Nova Owner',
    role: 'TENANT_OWNER',
    status: 'active',
  });
  await db.insert(schema.product).values({
    id: novaProductId,
    tenantId: novaTenantId,
    name: 'Nova Care Bookings',
    slug: 'nova-care',
    blueprint: 'multi_staff_booking',
    status: 'live',
    launchedAt: NOW,
  });
  const novaBusinessId = ulid();
  await db.insert(schema.business).values({
    id: novaBusinessId,
    tenantId: novaTenantId,
    productId: novaProductId,
    name: 'Nova Care – Downtown',
    slug: 'nova-downtown',
    description: 'Boutique wellness studio: massage, recovery, breathwork.',
    timezone: 'America/New_York',
    addressLine1: '120 Spring Street',
    city: 'New York',
    countryCode: 'US',
  });
  const novaServices = [
    { name: '60-min Massage', durationMinutes: 60, priceCents: 12000 },
    { name: '30-min Recovery Boost', durationMinutes: 30, priceCents: 6000 },
    { name: 'Breathwork Session', durationMinutes: 45, priceCents: 8500 },
  ];
  await db.insert(schema.service).values(
    novaServices.map((s) => ({
      tenantId: novaTenantId,
      businessId: novaBusinessId,
      name: s.name,
      durationMinutes: s.durationMinutes,
      priceCents: s.priceCents,
    })),
  );
  const novaStaff = [
    { displayName: 'Maya Chen', title: 'Massage Therapist' },
    { displayName: 'Daniel Park', title: 'Recovery Specialist' },
  ];
  await db.insert(schema.staff).values(
    novaStaff.map((s) => ({
      tenantId: novaTenantId,
      businessId: novaBusinessId,
      displayName: s.displayName,
      title: s.title,
    })),
  );

  // ─── Marketplace blueprint: "Bazaar" tenant ──────────────────────────
  const bazaarTenantId = ulid();
  const bazaarProductId = ulid();
  const bazaarOwnerId = ulid();
  await db.insert(schema.tenant).values({
    id: bazaarTenantId,
    name: 'Bazaar',
    slug: 'bazaar',
    status: 'active',
    plan: 'studio',
    theme: { accent: '#F4B740' },
    metadata: { industry: 'marketplace' },
  });
  await db.insert(schema.user).values({
    id: bazaarOwnerId,
    tenantId: bazaarTenantId,
    email: 'owner@bazaar.demo',
    name: 'Bazaar Owner',
    role: 'TENANT_OWNER',
    status: 'active',
  });
  await db.insert(schema.product).values({
    id: bazaarProductId,
    tenantId: bazaarTenantId,
    name: 'Bazaar',
    slug: 'bazaar',
    blueprint: 'marketplace',
    status: 'live',
    launchedAt: NOW,
  });
  const bazaarSellers = [
    { name: 'Sienna Wood Co.', email: 'sienna@bazaar.demo' },
    { name: 'River Pottery', email: 'river@bazaar.demo' },
    { name: 'Lumen Candles', email: 'lumen@bazaar.demo' },
  ];
  const bazaarSellerIds = bazaarSellers.map(() => ulid());
  await db.insert(schema.user).values(
    bazaarSellers.map((s, i) => ({
      id: bazaarSellerIds[i]!,
      tenantId: bazaarTenantId,
      email: s.email,
      name: s.name,
      role: 'CUSTOMER' as const,
      status: 'active' as const,
    })),
  );
  await db.insert(schema.listing).values([
    {
      tenantId: bazaarTenantId,
      productId: bazaarProductId,
      sellerId: bazaarSellerIds[0]!,
      title: 'Handmade Walnut Side Table',
      slug: 'walnut-side-table',
      description: 'Solid walnut, oil-finished. Made one at a time.',
      category: 'furniture',
      priceCents: 32000,
      status: 'active',
      imageUrls: ['https://images.unsplash.com/photo-1503602642458-232111445657?w=600'],
    },
    {
      tenantId: bazaarTenantId,
      productId: bazaarProductId,
      sellerId: bazaarSellerIds[1]!,
      title: 'Hand-thrown Stoneware Mug',
      slug: 'stoneware-mug',
      description: 'Wheel-thrown, glazed in slate blue. 12 oz.',
      category: 'ceramics',
      priceCents: 4200,
      status: 'active',
      imageUrls: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=600'],
    },
    {
      tenantId: bazaarTenantId,
      productId: bazaarProductId,
      sellerId: bazaarSellerIds[2]!,
      title: 'Cedarwood + Bergamot Candle',
      slug: 'cedar-bergamot-candle',
      description: 'Soy wax, 50 hr burn, hand-poured.',
      category: 'home',
      priceCents: 3400,
      status: 'active',
      imageUrls: ['https://images.unsplash.com/photo-1602874801006-aabfe9c30b39?w=600'],
    },
  ]);

  // ─── Community blueprint: "Signal" tenant ────────────────────────────
  const signalTenantId = ulid();
  const signalProductId = ulid();
  const signalOwnerId = ulid();
  await db.insert(schema.tenant).values({
    id: signalTenantId,
    name: 'Signal',
    slug: 'signal',
    status: 'active',
    plan: 'studio',
    theme: { accent: '#3DBE76' },
    metadata: { industry: 'community' },
  });
  await db.insert(schema.user).values({
    id: signalOwnerId,
    tenantId: signalTenantId,
    email: 'owner@signal.demo',
    name: 'Signal Owner',
    role: 'TENANT_OWNER',
    status: 'active',
  });
  await db.insert(schema.product).values({
    id: signalProductId,
    tenantId: signalTenantId,
    name: 'Signal',
    slug: 'signal',
    blueprint: 'community',
    status: 'live',
    launchedAt: NOW,
  });
  const signalSpaceIds = [ulid(), ulid()];
  await db.insert(schema.space).values([
    {
      id: signalSpaceIds[0]!,
      tenantId: signalTenantId,
      productId: signalProductId,
      name: 'Founders',
      slug: 'founders',
      description: 'Build-in-public conversations from solo founders shipping MVPs.',
      visibility: 'public',
    },
    {
      id: signalSpaceIds[1]!,
      tenantId: signalTenantId,
      productId: signalProductId,
      name: 'Design Critique',
      slug: 'design-critique',
      description: 'Drop a screen, get sharp, kind feedback within 24h.',
      visibility: 'public',
    },
  ]);
  await db.insert(schema.post).values([
    {
      tenantId: signalTenantId,
      spaceId: signalSpaceIds[0]!,
      authorId: signalOwnerId,
      body:
        '**Shipping is the differentiator.** Most founders die in planning. Pick the smallest version of v1 that delivers value, ship it Friday.',
    },
    {
      tenantId: signalTenantId,
      spaceId: signalSpaceIds[1]!,
      authorId: signalOwnerId,
      body:
        '**Feedback: Heartline onboarding.** Photo step feels heavy. Could we lazy-load uploads after the first like instead?',
    },
  ]);

  // ─── Vertical AI Agent blueprint: "Lumen" tenant ─────────────────────
  const lumenTenantId = ulid();
  const lumenProductId = ulid();
  const lumenOwnerId = ulid();
  await db.insert(schema.tenant).values({
    id: lumenTenantId,
    name: 'Lumen',
    slug: 'lumen',
    status: 'active',
    plan: 'studio',
    theme: { accent: '#C9A227' },
    metadata: { industry: 'ai' },
  });
  await db.insert(schema.user).values({
    id: lumenOwnerId,
    tenantId: lumenTenantId,
    email: 'owner@lumen.demo',
    name: 'Lumen Owner',
    role: 'TENANT_OWNER',
    status: 'active',
  });
  await db.insert(schema.product).values({
    id: lumenProductId,
    tenantId: lumenTenantId,
    name: 'Lumen Assistant',
    slug: 'lumen',
    blueprint: 'vertical_ai_agent',
    status: 'live',
    launchedAt: NOW,
  });
  const lumenSessionId = ulid();
  await db.insert(schema.assistantSession).values({
    id: lumenSessionId,
    tenantId: lumenTenantId,
    productId: lumenProductId,
    userId: lumenOwnerId,
    title: 'Plan launch week',
    model: 'mock-1',
    systemPrompt: 'You are Lumen, an AI ops co-pilot for studio founders.',
  });
  await db.insert(schema.assistantMessage).values([
    {
      tenantId: lumenTenantId,
      sessionId: lumenSessionId,
      role: 'user',
      content: 'Help me plan a one-week launch for a new dating app.',
    },
    {
      tenantId: lumenTenantId,
      sessionId: lumenSessionId,
      role: 'assistant',
      content:
        'Day 1: lock onboarding copy. Day 2: ship paywall + checkout. Day 3: harden match notifications. Day 4: build 5 inbound DM templates. Day 5: launch on Product Hunt + 2 niche subreddits.',
    },
  ]);
  await db.insert(schema.agentTask).values([
    {
      tenantId: lumenTenantId,
      productId: lumenProductId,
      ownerId: lumenOwnerId,
      sessionId: lumenSessionId,
      title: 'Draft Product Hunt copy for Heartline',
      description: 'Tone: warm, founder-friendly. Audience: indie hackers + relationship-curious.',
      status: 'pending',
    },
    {
      tenantId: lumenTenantId,
      productId: lumenProductId,
      ownerId: lumenOwnerId,
      sessionId: lumenSessionId,
      title: 'Summarize first 50 user signups',
      description: 'Bucket by city, age, and seeking. Surface anything surprising.',
      status: 'completed',
      result: { summary: 'Most users are 24–32 in NYC/LA. 64% want long-term.' },
      completedAt: NOW,
    },
  ]);

  // ─── B2B SaaS Shell blueprint: extra users on Acme ─────────────────
  const acmeMembers = ['lead@acme.demo', 'dev@acme.demo', 'pm@acme.demo'];
  await db.insert(schema.user).values(
    acmeMembers.map((email) => ({
      id: ulid(),
      tenantId: acmeTenantId,
      email,
      name: email.split('@')[0]!,
      role: 'MEMBER' as const,
      status: 'active' as const,
    })),
  );

  // ─── Studio Portal: deployment catalog ───────────────────────────────
  // One row per launchable surface across every tenant. The Portal's Apps
  // grid renders these. `is_studio_tool=true` rows are the Goldspire platform
  // itself (console + admin); the rest are client products. Health pinging
  // is restricted to `environment in ('staging','production')` so local-only
  // rows just show "Open" / "Copy command" buttons.
  await db.insert(schema.productDeployment).values([
    // Studio platform — multi-tenant, no product link
    {
      tenantId: studioTenantId,
      productId: null,
      kind: 'console',
      environment: 'local',
      name: 'Goldspire Studio Console',
      tagline: 'The control plane across every tenant and blueprint.',
      accent: '#0F172A',
      localDevUrl: 'http://localhost:3001',
      localDevCommand: 'pnpm --filter @goldspire/console dev',
      repoPath: 'apps/console',
      healthCheckPath: '/api/health',
      isStudioTool: true,
    },
    {
      tenantId: studioTenantId,
      productId: null,
      kind: 'admin',
      environment: 'local',
      name: 'Goldspire Admin',
      tagline: 'Per-tenant admin — pick a tenant on entry, manage users / flags / billing.',
      accent: '#475569',
      localDevUrl: 'http://localhost:3002',
      localDevCommand: 'pnpm --filter @goldspire/admin dev',
      repoPath: 'apps/admin',
      healthCheckPath: '/api/health',
      isStudioTool: true,
    },

    // Heartline (social_matching) — web + mobile, both with a production row
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      blueprint: 'social_matching',
      kind: 'web',
      environment: 'local',
      name: 'Heartline Web',
      tagline: 'Discovery → like → match → chat. The flagship dating product.',
      accent: '#E15A82',
      localDevUrl: 'http://localhost:3000',
      localDevCommand: 'pnpm --filter @goldspire/dating-web dev',
      repoPath: 'apps/dating-web',
      healthCheckPath: '/api/health',
    },
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      blueprint: 'social_matching',
      kind: 'web',
      environment: 'production',
      name: 'Heartline Web (prod)',
      tagline: 'Live for paying users.',
      accent: '#E15A82',
      url: 'https://heartline.com',
      healthCheckPath: '/api/health',
      healthStatus: 'ok',
      lastHealthCheckAt: NOW,
      lastDeploySha: 'a1b2c3d4',
      lastDeployAt: NOW,
    },
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      blueprint: 'social_matching',
      kind: 'mobile_ios',
      environment: 'local',
      name: 'Heartline iOS',
      tagline: 'Expo app — talks to the same Heartline API.',
      accent: '#E15A82',
      localDevCommand: 'pnpm --filter @goldspire/dating-mobile dev',
      repoPath: 'apps/dating-mobile',
      mobileScheme: 'heartline://',
    },
    {
      tenantId: heartlineTenantId,
      productId: heartlineProductId,
      blueprint: 'social_matching',
      kind: 'mobile_android',
      environment: 'local',
      name: 'Heartline Android',
      tagline: 'Same Expo binary, Android build.',
      accent: '#E15A82',
      localDevCommand: 'pnpm --filter @goldspire/dating-mobile dev',
      repoPath: 'apps/dating-mobile',
      mobileScheme: 'heartline://',
    },

    // Nova Care (booking)
    {
      tenantId: novaTenantId,
      productId: novaProductId,
      blueprint: 'multi_staff_booking',
      kind: 'web',
      environment: 'local',
      name: 'Nova Care Web',
      tagline: 'Multi-staff booking flow for a boutique wellness studio.',
      accent: '#7C5CFF',
      localDevUrl: 'http://localhost:3010',
      localDevCommand: 'pnpm --filter @goldspire/booking-web dev',
      repoPath: 'apps/booking-web',
      healthCheckPath: '/api/health',
    },

    // Bazaar (marketplace)
    {
      tenantId: bazaarTenantId,
      productId: bazaarProductId,
      blueprint: 'marketplace',
      kind: 'web',
      environment: 'local',
      name: 'Bazaar Web',
      tagline: 'Maker-driven marketplace with listings, orders, and seller payouts.',
      accent: '#F4B740',
      localDevUrl: 'http://localhost:3011',
      localDevCommand: 'pnpm --filter @goldspire/marketplace-web dev',
      repoPath: 'apps/marketplace-web',
      healthCheckPath: '/api/health',
    },

    // Signal (community)
    {
      tenantId: signalTenantId,
      productId: signalProductId,
      blueprint: 'community',
      kind: 'web',
      environment: 'local',
      name: 'Signal Web',
      tagline: 'Spaces + feeds for build-in-public founders.',
      accent: '#3DBE76',
      localDevUrl: 'http://localhost:3012',
      localDevCommand: 'pnpm --filter @goldspire/community-web dev',
      repoPath: 'apps/community-web',
      healthCheckPath: '/api/health',
    },

    // Lumen (AI agent)
    {
      tenantId: lumenTenantId,
      productId: lumenProductId,
      blueprint: 'vertical_ai_agent',
      kind: 'web',
      environment: 'local',
      name: 'Lumen Web',
      tagline: 'Vertical AI co-pilot: sessions, tasks, tool invocations.',
      accent: '#C9A227',
      localDevUrl: 'http://localhost:3013',
      localDevCommand: 'pnpm --filter @goldspire/ai-agent-web dev',
      repoPath: 'apps/ai-agent-web',
      healthCheckPath: '/api/health',
    },

    // Acme (B2B SaaS shell)
    {
      tenantId: acmeTenantId,
      productId: acmeWorkspaceProductId,
      blueprint: 'b2b_saas_shell',
      kind: 'web',
      environment: 'local',
      name: 'Acme Workspace Web',
      tagline: 'Internal B2B SaaS dashboard reference app.',
      accent: '#5B8DEF',
      localDevUrl: 'http://localhost:3014',
      localDevCommand: 'pnpm --filter @goldspire/b2b-saas-web dev',
      repoPath: 'apps/b2b-saas-web',
      healthCheckPath: '/api/health',
    },
  ]);

  console.log('✓ seed complete');
  console.log(`  Studio tenant id : ${studioTenantId}`);
  console.log(`  Heartline tenant : ${heartlineTenantId}  (social_matching)`);
  console.log(`  Nova Care tenant : ${novaTenantId}       (multi_staff_booking)`);
  console.log(`  Bazaar tenant    : ${bazaarTenantId}     (marketplace)`);
  console.log(`  Signal tenant    : ${signalTenantId}     (community)`);
  console.log(`  Lumen tenant     : ${lumenTenantId}      (vertical_ai_agent)`);
  console.log(`  Acme tenant      : ${acmeTenantId}       (b2b_saas_shell)`);
  console.log(`  Heartline product: ${heartlineProductId}`);
  console.log(`  Demo users seeded: ${demoUsers.length}`);
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
