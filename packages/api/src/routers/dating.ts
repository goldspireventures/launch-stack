import { and, asc, desc, eq, gt, inArray, notInArray, or, sql } from 'drizzle-orm';
import { newId, schema } from '@goldspire/db';
import { datingSchemas } from '@goldspire/validation';
import { trackEvent } from '@goldspire/analytics';
import { createNotification } from '@goldspire/notifications';
import { getOrCreateThread } from '@goldspire/chat';
import { grantEntitlement, hasEntitlement } from '@goldspire/payments';
import { logAudit } from '@goldspire/audit';
import { ANALYTICS_EVENTS, ENTITLEMENT_KEYS } from '@goldspire/config';
import { env } from '@goldspire/config/env';
import { isEnabled } from '@goldspire/feature-flags';
import { ForbiddenError, NotFoundError } from '@goldspire/platform';
import { supabaseEnabled, supabaseService } from '@goldspire/platform/supabase';
import { z } from 'zod';
import {
  parseDiscoveryFilters,
  profileMatchesDiscoveryFilters,
} from '../lib/dating-discover';
import {
  classifyMessageSafety,
  datingFlagCtx,
  flagOn,
  computeMatchQualityScore,
  readInviteCodes,
  readVerification,
  mergeUserMetadata,
  referralCodeForUser,
  suggestDatingBio,
  type InviteCodeEntry,
} from '../lib/dating-showroom';
import { router, protectedProcedure } from '../trpc';

const FREE_DAILY_LIKE_LIMIT = 25;

export const datingRouter = router({
  /** ─── Profile ──────────────────────────────────────────────────── */

  myProfile: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select()
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.tenantId, ctx.user.tenantId),
            eq(schema.datingProfile.userId, ctx.user.id),
            eq(schema.datingProfile.productId, input.productId),
          ),
        )
        .limit(1);
      if (!row) return null;
      const photos = await ctx.db
        .select()
        .from(schema.datingPhoto)
        .where(eq(schema.datingPhoto.profileId, row.id))
        .orderBy(asc(schema.datingPhoto.position));
      return { ...row, photos };
    }),

  upsertProfile: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        profile: datingSchemas.datingProfile,
        /** Discovery / preference filters stored on `dating_profile.filters`. */
        filters: z.record(z.string(), z.unknown()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { profile, productId, filters: inputFilters } = input;
      const existing = await ctx.db
        .select({ id: schema.datingProfile.id, filters: schema.datingProfile.filters })
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.userId, ctx.user.id),
            eq(schema.datingProfile.productId, productId),
          ),
        )
        .limit(1);

      const resolvedFilters =
        inputFilters !== undefined
          ? inputFilters
          : ((existing[0]?.filters as Record<string, unknown> | undefined) ?? {});

      const baseValues = {
        tenantId: ctx.user.tenantId,
        productId,
        userId: ctx.user.id,
        displayName: profile.displayName,
        birthdate: profile.birthdate,
        gender: profile.gender,
        interestedIn: profile.interestedIn,
        seeking: profile.seeking,
        bio: profile.bio,
        prompts: profile.prompts,
        city: profile.city,
        countryCode: profile.countryCode,
        lat: profile.lat,
        lng: profile.lng,
        heightCm: profile.heightCm,
        jobTitle: profile.jobTitle,
        company: profile.company,
        school: profile.school,
        filters: resolvedFilters,
        metadata: profile.metadata,
      };

      const [row] = existing[0]
        ? await ctx.db
            .update(schema.datingProfile)
            .set({ ...baseValues, updatedAt: new Date() })
            .where(eq(schema.datingProfile.id, existing[0].id))
            .returning()
        : await ctx.db.insert(schema.datingProfile).values(baseValues).returning();
      if (!row) throw new Error('failed to upsert profile');

      // Replace photos atomically
      await ctx.db.delete(schema.datingPhoto).where(eq(schema.datingPhoto.profileId, row.id));
      if (profile.photos.length > 0) {
        await ctx.db.insert(schema.datingPhoto).values(
          profile.photos.map((p) => ({
            tenantId: ctx.user.tenantId,
            profileId: row.id,
            url: p.url,
            storagePath: p.storagePath,
            position: p.position,
            width: p.width,
            height: p.height,
            blurhash: p.blurhash,
          })),
        );
      }

      if (!existing[0]) {
        await trackEvent({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          productId,
          eventName: ANALYTICS_EVENTS.DATING_PROFILE_CREATED,
        });
      }
      return row;
    }),

  /** ─── Discovery ────────────────────────────────────────────────── */

  discover: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().int().min(1).max(40).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const flagCtx = {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      };

      const seen = await ctx.db
        .select({ toUserId: schema.datingSwipe.toUserId })
        .from(schema.datingSwipe)
        .where(
          and(
            eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
            eq(schema.datingSwipe.productId, input.productId),
            eq(schema.datingSwipe.fromUserId, ctx.user.id),
          ),
        );
      const seenIds = seen.map((s) => s.toUserId);

      const blocks = await ctx.db
        .select({ blockedUserId: schema.datingUserBlock.blockedUserId })
        .from(schema.datingUserBlock)
        .where(
          and(
            eq(schema.datingUserBlock.tenantId, ctx.user.tenantId),
            eq(schema.datingUserBlock.productId, input.productId),
            eq(schema.datingUserBlock.blockerUserId, ctx.user.id),
          ),
        );
      const blockedIds = blocks.map((b) => b.blockedUserId);

      const excludeIds = [ctx.user.id, ...seenIds, ...blockedIds];

      const filtersOn = await isEnabled('feature.discover_filters', flagCtx);
      const [viewerProfile] = await ctx.db
        .select()
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.tenantId, ctx.user.tenantId),
            eq(schema.datingProfile.productId, input.productId),
            eq(schema.datingProfile.userId, ctx.user.id),
          ),
        )
        .limit(1);

      const discoveryFilters = filtersOn
        ? parseDiscoveryFilters(viewerProfile?.filters as Record<string, unknown> | undefined)
        : null;

      const fetchLimit = filtersOn ? Math.min(input.limit * 4, 40) : input.limit;

      const rows = await ctx.db
        .select({
          profile: schema.datingProfile,
          photo: schema.datingPhoto,
        })
        .from(schema.datingProfile)
        .leftJoin(
          schema.datingPhoto,
          and(
            eq(schema.datingPhoto.profileId, schema.datingProfile.id),
            eq(schema.datingPhoto.position, 0),
          ),
        )
        .where(
          and(
            eq(schema.datingProfile.tenantId, ctx.user.tenantId),
            eq(schema.datingProfile.productId, input.productId),
            notInArray(schema.datingProfile.userId, excludeIds),
            eq(schema.datingProfile.visible, 1),
          ),
        )
        .orderBy(desc(schema.datingProfile.qualityScore), desc(schema.datingProfile.updatedAt))
        .limit(fetchLimit);

      let mapped = rows.map((r) => ({ ...r.profile, primaryPhotoUrl: r.photo?.url ?? null }));

      if (filtersOn && discoveryFilters && viewerProfile) {
        mapped = mapped.filter((p) =>
          profileMatchesDiscoveryFilters(p, {
            filters: discoveryFilters,
            viewerLat: viewerProfile.lat,
            viewerLng: viewerProfile.lng,
            viewerInterestedIn: (viewerProfile.interestedIn as string[]) ?? [],
          }),
        );
      }

      const rankingOn = await isEnabled('ai.match_quality_scoring', flagCtx);
      if (rankingOn && viewerProfile) {
        mapped.sort(
          (a, b) =>
            computeMatchQualityScore(viewerProfile, b) - computeMatchQualityScore(viewerProfile, a),
        );
      }

      return mapped.slice(0, input.limit);
    }),

  rewind: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const flagCtx = {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      };
      const rewindOn = await isEnabled('feature.dating_rewind', flagCtx);
      if (!rewindOn) {
        throw new ForbiddenError('Rewind is not enabled for this tenant');
      }
      const entitled = await hasEntitlement({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        key: ENTITLEMENT_KEYS.DATING_REWIND,
      });
      if (!entitled) {
        throw new ForbiddenError('Rewind requires Heartline Plus or Premium');
      }

      const [last] = await ctx.db
        .select()
        .from(schema.datingSwipe)
        .where(
          and(
            eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
            eq(schema.datingSwipe.productId, input.productId),
            eq(schema.datingSwipe.fromUserId, ctx.user.id),
          ),
        )
        .orderBy(desc(schema.datingSwipe.createdAt))
        .limit(1);

      if (!last) return { rewound: false as const, reason: 'nothing_to_rewind' as const };

      await ctx.db.delete(schema.datingSwipe).where(eq(schema.datingSwipe.id, last.id));

      await trackEvent({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        productId: input.productId,
        eventName: ANALYTICS_EVENTS.DATING_SWIPE_PASS,
        properties: { rewind: true, action: last.action },
      });

      return {
        rewound: true as const,
        action: last.action,
        toUserId: last.toUserId,
      };
    }),

  blockUser: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        blockedUserId: z.string(),
        reason: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.blockedUserId === ctx.user.id) {
        throw new ForbiddenError('Cannot block yourself');
      }
      const flagCtx = {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      };
      if (!(await isEnabled('feature.dating_block_user', flagCtx))) {
        throw new ForbiddenError('Block is not enabled for this tenant');
      }

      await ctx.db
        .insert(schema.datingUserBlock)
        .values({
          tenantId: ctx.user.tenantId,
          productId: input.productId,
          blockerUserId: ctx.user.id,
          blockedUserId: input.blockedUserId,
        })
        .onConflictDoNothing();

      await logAudit({
        tenantId: ctx.user.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'dating_user_blocked',
        entityType: 'user',
        entityId: input.blockedUserId,
        metadata: { productId: input.productId, reason: input.reason ?? null },
      });

      return { ok: true as const };
    }),

  createPhotoUploadUrl: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        position: z.number().int().min(0).max(8),
        contentType: z.string().max(120).default('image/jpeg'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const flagCtx = {
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        role: ctx.user.role,
        db: ctx.db,
      };
      if (!(await isEnabled('feature.dating_photo_upload', flagCtx))) {
        throw new ForbiddenError('Photo upload is not enabled for this tenant');
      }

      const ext = input.contentType.includes('png')
        ? 'png'
        : input.contentType.includes('webp')
          ? 'webp'
          : 'jpg';
      const storagePath = `dating/${ctx.user.tenantId}/${ctx.user.id}/${input.productId}/${input.position}-${Date.now()}.${ext}`;
      const bucket = 'dating-photos';

      if (env.STORAGE_PROVIDER === 'mock' || !supabaseEnabled()) {
        const publicUrl = `https://picsum.photos/seed/${encodeURIComponent(storagePath)}/800/1000`;
        return {
          mock: true as const,
          storagePath,
          publicUrl,
          uploadUrl: null,
        };
      }

      const sb = supabaseService();
      if (!sb) {
        const publicUrl = `https://picsum.photos/seed/${encodeURIComponent(storagePath)}/800/1000`;
        return { mock: true as const, storagePath, publicUrl, uploadUrl: null };
      }

      const { data, error } = await sb.storage.from(bucket).createSignedUploadUrl(storagePath, {
        upsert: true,
      });
      if (error || !data) {
        throw new Error(error?.message ?? 'failed to create upload url');
      }

      const { data: publicData } = sb.storage.from(bucket).getPublicUrl(storagePath);

      return {
        mock: false as const,
        storagePath,
        publicUrl: publicData.publicUrl,
        uploadUrl: data.signedUrl,
      };
    }),

  /** ─── Swipe / Match ────────────────────────────────────────────── */

  swipe: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        toUserId: z.string(),
        action: datingSchemas.swipeAction,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.toUserId === ctx.user.id) {
        throw new ForbiddenError('Cannot swipe yourself');
      }

      // Daily-limit check for free users on `like`.
      if (input.action === 'like') {
        const isPremium = await hasEntitlement({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          key: ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
        });
        if (!isPremium) {
          const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
          const todayLikes = await ctx.db
            .select({ id: schema.datingSwipe.id })
            .from(schema.datingSwipe)
            .where(
              and(
                eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
                eq(schema.datingSwipe.productId, input.productId),
                eq(schema.datingSwipe.fromUserId, ctx.user.id),
                eq(schema.datingSwipe.action, 'like'),
                gt(schema.datingSwipe.createdAt, since),
              ),
            );
          if (todayLikes.length >= FREE_DAILY_LIKE_LIMIT) {
            return { dailyLimitReached: true, matched: false as const };
          }
        }
      }

      await ctx.db
        .insert(schema.datingSwipe)
        .values({
          tenantId: ctx.user.tenantId,
          productId: input.productId,
          fromUserId: ctx.user.id,
          toUserId: input.toUserId,
          action: input.action,
        })
        .onConflictDoNothing({
          target: [schema.datingSwipe.fromUserId, schema.datingSwipe.toUserId],
        });

      await trackEvent({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        productId: input.productId,
        eventName:
          input.action === 'like'
            ? ANALYTICS_EVENTS.DATING_SWIPE_LIKE
            : input.action === 'super_like'
              ? ANALYTICS_EVENTS.DATING_SUPER_LIKE
              : ANALYTICS_EVENTS.DATING_SWIPE_PASS,
      });

      // Mutual-like check
      if (input.action === 'like' || input.action === 'super_like') {
        const [mutual] = await ctx.db
          .select({ id: schema.datingSwipe.id })
          .from(schema.datingSwipe)
          .where(
            and(
              eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
              eq(schema.datingSwipe.productId, input.productId),
              eq(schema.datingSwipe.fromUserId, input.toUserId),
              eq(schema.datingSwipe.toUserId, ctx.user.id),
              or(eq(schema.datingSwipe.action, 'like'), eq(schema.datingSwipe.action, 'super_like'))!,
            ),
          )
          .limit(1);

        if (mutual) {
          const sortedIds = [ctx.user.id, input.toUserId].sort();
          const userA = sortedIds[0]!;
          const userB = sortedIds[1]!;
          const [match] = await ctx.db
            .insert(schema.datingMatch)
            .values({
              tenantId: ctx.user.tenantId,
              productId: input.productId,
              userAId: userA,
              userBId: userB,
            })
            .onConflictDoNothing({
              target: [schema.datingMatch.userAId, schema.datingMatch.userBId],
            })
            .returning();

          // Create a chat thread for them
          if (match) {
            const thread = await getOrCreateThread({
              tenantId: ctx.user.tenantId,
              productId: input.productId,
              externalKey: `dating_match:${match.id}`,
              participantIds: [userA, userB],
            });
            await ctx.db
              .update(schema.datingMatch)
              .set({ threadId: thread.id })
              .where(eq(schema.datingMatch.id, match.id));

            const pushOn = await isEnabled('feature.dating_push_notifications', {
              tenantId: ctx.user.tenantId,
              userId: ctx.user.id,
              role: ctx.user.role,
              db: ctx.db,
            });
            const channels = pushOn ? (['in_app', 'push'] as const) : (['in_app'] as const);
            await Promise.all([
              createNotification({
                tenantId: ctx.user.tenantId,
                userId: userA,
                type: 'match',
                title: 'New match',
                body: 'You have a new match. Say hi!',
                channels: [...channels],
                metadata: { matchId: match.id, threadId: thread.id },
              }),
              createNotification({
                tenantId: ctx.user.tenantId,
                userId: userB,
                type: 'match',
                title: 'New match',
                body: 'You have a new match. Say hi!',
                channels: [...channels],
                metadata: { matchId: match.id, threadId: thread.id },
              }),
            ]);

            await trackEvent({
              tenantId: ctx.user.tenantId,
              userId: ctx.user.id,
              productId: input.productId,
              eventName: ANALYTICS_EVENTS.DATING_MATCH_CREATED,
            });
            await logAudit({
              tenantId: ctx.user.tenantId,
              actorId: ctx.user.id,
              actorRole: ctx.user.role,
              action: 'dating_match_created',
              entityType: 'dating_match',
              entityId: match.id,
            });
            return { matched: true as const, matchId: match.id, threadId: thread.id };
          }
        }
      }

      return { matched: false as const };
    }),

  /** ─── Matches list ────────────────────────────────────────────── */

  matches: protectedProcedure
    .input(z.object({ productId: z.string(), limit: z.number().int().max(100).default(50) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(schema.datingMatch)
        .where(
          and(
            eq(schema.datingMatch.tenantId, ctx.user.tenantId),
            eq(schema.datingMatch.productId, input.productId),
            or(
              eq(schema.datingMatch.userAId, ctx.user.id),
              eq(schema.datingMatch.userBId, ctx.user.id),
            )!,
          ),
        )
        .orderBy(desc(schema.datingMatch.createdAt))
        .limit(input.limit);

      const otherIds = rows.map((r) => (r.userAId === ctx.user.id ? r.userBId : r.userAId));
      if (otherIds.length === 0) return [];

      const profiles = await ctx.db
        .select({
          userId: schema.datingProfile.userId,
          displayName: schema.datingProfile.displayName,
          bio: schema.datingProfile.bio,
          birthdate: schema.datingProfile.birthdate,
        })
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.productId, input.productId),
            inArray(schema.datingProfile.userId, otherIds),
          ),
        );

      const photos = await ctx.db
        .select({
          profileId: schema.datingPhoto.profileId,
          url: schema.datingPhoto.url,
          userId: schema.datingProfile.userId,
        })
        .from(schema.datingPhoto)
        .innerJoin(schema.datingProfile, eq(schema.datingProfile.id, schema.datingPhoto.profileId))
        .where(
          and(
            inArray(schema.datingProfile.userId, otherIds),
            eq(schema.datingPhoto.position, 0),
          ),
        );

      const users = await ctx.db
        .select({ id: schema.user.id, lastSeenAt: schema.user.lastSeenAt })
        .from(schema.user)
        .where(inArray(schema.user.id, otherIds));

      const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
      const photoByUser = new Map(photos.map((p) => [p.userId, p.url]));
      const lastSeenByUser = new Map(users.map((u) => [u.id, u.lastSeenAt]));

      const threadIds = rows.map((r) => r.threadId).filter((id): id is string => Boolean(id));
      const lastMessageByThread = new Map<
        string,
        { body: string; createdAt: Date; senderId: string }
      >();
      const lastReadByThread = new Map<string, Date | null>();

      if (threadIds.length > 0) {
        const myReads = await ctx.db
          .select({
            threadId: schema.threadParticipant.threadId,
            lastReadAt: schema.threadParticipant.lastReadAt,
          })
          .from(schema.threadParticipant)
          .where(
            and(
              inArray(schema.threadParticipant.threadId, threadIds),
              eq(schema.threadParticipant.userId, ctx.user.id),
            ),
          );
        for (const r of myReads) lastReadByThread.set(r.threadId, r.lastReadAt);

        const recentMessages = await ctx.db
          .select({
            threadId: schema.message.threadId,
            body: schema.message.body,
            createdAt: schema.message.createdAt,
            senderId: schema.message.senderId,
          })
          .from(schema.message)
          .where(inArray(schema.message.threadId, threadIds))
          .orderBy(desc(schema.message.createdAt));

        for (const msg of recentMessages) {
          if (!lastMessageByThread.has(msg.threadId)) {
            lastMessageByThread.set(msg.threadId, {
              body: msg.body,
              createdAt: msg.createdAt,
              senderId: msg.senderId,
            });
          }
        }
      }

      return rows.map((m) => {
        const otherId = m.userAId === ctx.user.id ? m.userBId : m.userAId;
        const other = profileByUser.get(otherId);
        const tid = m.threadId;
        const tip = tid ? lastMessageByThread.get(tid) : undefined;
        const lastReadAt = tid ? lastReadByThread.get(tid) : undefined;
        const unread =
          Boolean(tip) &&
          tip!.senderId !== ctx.user.id &&
          (!lastReadAt || new Date(lastReadAt).getTime() < new Date(tip!.createdAt).getTime());
        const snippet =
          tip && tip.body.length > 72 ? `${tip.body.slice(0, 69)}…` : (tip?.body ?? '');
        return {
          matchId: m.id,
          threadId: m.threadId,
          otherUserId: otherId,
          otherDisplayName: other?.displayName ?? 'Someone',
          otherBio: other?.bio ?? '',
          otherBirthdate: other?.birthdate ?? null,
          otherPhotoUrl: photoByUser.get(otherId) ?? null,
          otherLastSeenAt: lastSeenByUser.get(otherId) ?? null,
          createdAt: m.createdAt,
          unmatched: m.unmatchedAt !== null,
          lastMessageSnippet: snippet,
          unreadCount: unread ? 1 : 0,
        };
      });
    }),

  unmatch: protectedProcedure
    .input(z.object({ matchId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.datingMatch)
        .set({ unmatchedAt: new Date(), unmatchedById: ctx.user.id })
        .where(
          and(
            eq(schema.datingMatch.id, input.matchId),
            eq(schema.datingMatch.tenantId, ctx.user.tenantId),
            or(
              eq(schema.datingMatch.userAId, ctx.user.id),
              eq(schema.datingMatch.userBId, ctx.user.id),
            )!,
          ),
        )
        .returning();
      if (!row) throw new NotFoundError('dating_match', input.matchId);
      await trackEvent({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        eventName: ANALYTICS_EVENTS.DATING_MATCH_UNMATCHED,
      });
      return row;
    }),

  /** ─── Who liked you (premium) ─────────────────────────────────── */

  whoLikedMe: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const canSee = await hasEntitlement({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        key: ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
      });
      if (!canSee) {
        // Return count only — premium reveal
        const rows = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(schema.datingSwipe)
          .where(
            and(
              eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
              eq(schema.datingSwipe.productId, input.productId),
              eq(schema.datingSwipe.toUserId, ctx.user.id),
              or(
                eq(schema.datingSwipe.action, 'like'),
                eq(schema.datingSwipe.action, 'super_like'),
              )!,
            ),
          );
        return { gated: true as const, count: Number(rows[0]?.count ?? 0), users: [] };
      }

      const likes = await ctx.db
        .select({
          fromUserId: schema.datingSwipe.fromUserId,
          createdAt: schema.datingSwipe.createdAt,
          displayName: schema.datingProfile.displayName,
          primaryPhotoUrl: schema.datingPhoto.url,
        })
        .from(schema.datingSwipe)
        .innerJoin(
          schema.datingProfile,
          and(
            eq(schema.datingProfile.userId, schema.datingSwipe.fromUserId),
            eq(schema.datingProfile.productId, input.productId),
          ),
        )
        .leftJoin(
          schema.datingPhoto,
          and(
            eq(schema.datingPhoto.profileId, schema.datingProfile.id),
            eq(schema.datingPhoto.position, 0),
          ),
        )
        .where(
          and(
            eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
            eq(schema.datingSwipe.productId, input.productId),
            eq(schema.datingSwipe.toUserId, ctx.user.id),
            or(
              eq(schema.datingSwipe.action, 'like'),
              eq(schema.datingSwipe.action, 'super_like'),
            )!,
          ),
        )
        .orderBy(desc(schema.datingSwipe.createdAt))
        .limit(100);

      return { gated: false as const, count: likes.length, users: likes };
    }),

  /**
   * Outbound likes (like / super_like) from the current user — powers the
   * "You liked" tab in the Heartline likes inbox. Read-only; no schema changes.
   */
  outboundLikes: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      const swipes = await ctx.db
        .select({
          toUserId: schema.datingSwipe.toUserId,
          action: schema.datingSwipe.action,
          createdAt: schema.datingSwipe.createdAt,
        })
        .from(schema.datingSwipe)
        .where(
          and(
            eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
            eq(schema.datingSwipe.productId, input.productId),
            eq(schema.datingSwipe.fromUserId, ctx.user.id),
            or(eq(schema.datingSwipe.action, 'like'), eq(schema.datingSwipe.action, 'super_like'))!,
          ),
        )
        .orderBy(desc(schema.datingSwipe.createdAt))
        .limit(input.limit);

      const toIds = [...new Set(swipes.map((s) => s.toUserId))];
      if (toIds.length === 0) return [];

      const profiles = await ctx.db
        .select({
          userId: schema.datingProfile.userId,
          displayName: schema.datingProfile.displayName,
        })
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.productId, input.productId),
            inArray(schema.datingProfile.userId, toIds),
          ),
        );

      const photos = await ctx.db
        .select({ userId: schema.datingProfile.userId, url: schema.datingPhoto.url })
        .from(schema.datingPhoto)
        .innerJoin(schema.datingProfile, eq(schema.datingProfile.id, schema.datingPhoto.profileId))
        .where(
          and(inArray(schema.datingProfile.userId, toIds), eq(schema.datingPhoto.position, 0)),
        );

      const nameByUser = new Map(profiles.map((p) => [p.userId, p.displayName]));
      const photoByUser = new Map(photos.map((p) => [p.userId, p.url]));

      return swipes.map((s) => ({
        toUserId: s.toUserId,
        action: s.action,
        createdAt: s.createdAt,
        displayName: nameByUser.get(s.toUserId) ?? 'Someone',
        primaryPhotoUrl: photoByUser.get(s.toUserId) ?? null,
      }));
    }),

  /** Effective Heartline tier from active / trialing subscriptions (seed products). */
  currentSubscription: protectedProcedure.query(async ({ ctx }) => {
    type Tier = 'free' | 'plus' | 'premium';
    const rank = (t: Tier) => (t === 'premium' ? 3 : t === 'plus' ? 2 : 1);

    function readProductTier(metadata: unknown): string | null {
      if (!metadata || typeof metadata !== 'object') return null;
      const t = (metadata as { tier?: unknown }).tier;
      return typeof t === 'string' ? t : null;
    }

    function inferTier(plan: string, metaTier: string | null): Tier {
      if (metaTier === 'premium') return 'premium';
      if (metaTier === 'plus') return 'plus';
      if (metaTier === 'free') return 'free';
      const p = plan.toLowerCase();
      if (p.includes('premium')) return 'premium';
      if (p.includes('plus')) return 'plus';
      return 'free';
    }

    const rows = await ctx.db
      .select({
        subscription: schema.subscription,
        product: schema.product,
      })
      .from(schema.subscription)
      .leftJoin(schema.product, eq(schema.subscription.productId, schema.product.id))
      .where(
        and(
          eq(schema.subscription.tenantId, ctx.user.tenantId),
          eq(schema.subscription.userId, ctx.user.id),
          inArray(schema.subscription.status, ['active', 'trialing']),
        ),
      );

    const scored = rows.map((r) => ({
      sub: r.subscription,
      tier: inferTier(r.subscription.plan, readProductTier(r.product?.metadata)),
      ts: r.subscription.updatedAt?.getTime() ?? 0,
    }));

    let best: Tier = 'free';
    let bestSub: (typeof schema.subscription.$inferSelect) | null = null;
    for (const x of scored) {
      if (rank(x.tier) > rank(best)) {
        best = x.tier;
        bestSub = x.sub;
      } else if (rank(x.tier) === rank(best) && rank(x.tier) > 1 && bestSub) {
        const prevTs = bestSub.updatedAt?.getTime() ?? 0;
        if (x.ts > prevTs) bestSub = x.sub;
      }
    }

    return {
      plan: best,
      subscription: best === 'free' ? null : bestSub,
    };
  }),

  /** ─── Showroom: AI, growth, programs, mobile ───────────────────── */

  suggestBio: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        displayName: z.string().min(1).max(80),
        seeking: z.string(),
        prompts: z.array(z.object({ question: z.string(), answer: z.string() })).default([]),
        city: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'ai.profile_assist'))) {
        throw new ForbiddenError('AI profile assist is not enabled');
      }
      return suggestDatingBio(input);
    }),

  classifyMessage: protectedProcedure
    .input(z.object({ content: z.string().min(1).max(4000) }))
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'ai.safety_classifier'))) {
        return { safe: true, label: 'ok' as const, confidence: 1, mock: true, skipped: true as const };
      }
      const result = await classifyMessageSafety(input.content);
      return { ...result, skipped: false as const };
    }),

  verificationStatus: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      const moduleOn = await flagOn(fctx, 'module.dating_verification');
      const [row] = await ctx.db
        .select({ metadata: schema.datingProfile.metadata })
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.userId, ctx.user.id),
            eq(schema.datingProfile.productId, input.productId),
          ),
        )
        .limit(1);
      return {
        enabled: moduleOn,
        verification: readVerification((row?.metadata as Record<string, unknown>) ?? {}),
      };
    }),

  submitVerification: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        note: z.string().max(500).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'module.dating_verification'))) {
        throw new ForbiddenError('Verification is not enabled');
      }
      const [row] = await ctx.db
        .select({ id: schema.datingProfile.id, metadata: schema.datingProfile.metadata })
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.userId, ctx.user.id),
            eq(schema.datingProfile.productId, input.productId),
          ),
        )
        .limit(1);
      if (!row) throw new NotFoundError('dating_profile', ctx.user.id);
      const meta = { ...((row.metadata as Record<string, unknown>) ?? {}) };
      meta.verification = {
        status: 'pending',
        submittedAt: new Date().toISOString(),
        note: input.note ?? null,
      };
      await ctx.db
        .update(schema.datingProfile)
        .set({ metadata: meta, updatedAt: new Date() })
        .where(eq(schema.datingProfile.id, row.id));
      return readVerification(meta);
    }),

  inviteProgram: protectedProcedure.query(async ({ ctx }) => {
    const fctx = datingFlagCtx(ctx.user, ctx.db);
    const waitlistOn = await flagOn(fctx, 'feature.dating_invite_waitlist');
    const cityOn = await flagOn(fctx, 'program.city_launch');
    const [tenant] = await ctx.db
      .select({ metadata: schema.tenant.metadata })
      .from(schema.tenant)
      .where(eq(schema.tenant.id, ctx.user.tenantId))
      .limit(1);
    const codes = readInviteCodes((tenant?.metadata as Record<string, unknown>) ?? {});
    return { waitlistOn, cityOn, codes: Object.entries(codes).map(([code, v]) => ({ code, ...v })) };
  }),

  redeemInviteCode: protectedProcedure
    .input(z.object({ code: z.string().min(3).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'feature.dating_invite_waitlist'))) {
        throw new ForbiddenError('Invite program is not enabled');
      }
      const normalized = input.code.trim().toUpperCase();
      const [tenant] = await ctx.db
        .select({ id: schema.tenant.id, metadata: schema.tenant.metadata })
        .from(schema.tenant)
        .where(eq(schema.tenant.id, ctx.user.tenantId))
        .limit(1);
      if (!tenant) throw new NotFoundError('tenant', ctx.user.tenantId);
      const meta = { ...((tenant.metadata as Record<string, unknown>) ?? {}) };
      const codes = readInviteCodes(meta);
      const entry = codes[normalized];
      if (!entry || entry.uses >= entry.maxUses) {
        return { ok: false as const, reason: 'invalid_or_exhausted' as const };
      }
      (codes as Record<string, InviteCodeEntry>)[normalized] = { ...entry, uses: entry.uses + 1 };
      meta.heartlineInviteCodes = codes;
      await ctx.db
        .update(schema.tenant)
        .set({ metadata: meta, updatedAt: new Date() })
        .where(eq(schema.tenant.id, tenant.id));
      await mergeUserMetadata(ctx.db, ctx.user.id, {
        inviteRedeemed: normalized,
        inviteAt: new Date().toISOString(),
      });
      return { ok: true as const, code: normalized, label: entry.label };
    }),

  joinWaitlist: protectedProcedure
    .input(z.object({ city: z.string().max(120).optional() }))
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'program.city_launch'))) {
        throw new ForbiddenError('City launch is not enabled');
      }
      await mergeUserMetadata(ctx.db, ctx.user.id, {
        waitlist: true,
        waitlistCity: input.city ?? null,
        waitlistAt: new Date().toISOString(),
      });
      return { ok: true as const };
    }),

  referralInfo: protectedProcedure.query(async ({ ctx }) => {
    const fctx = datingFlagCtx(ctx.user, ctx.db);
    const enabled = await flagOn(fctx, 'module.referrals');
    return {
      enabled,
      code: referralCodeForUser(ctx.user.id),
      referralsCount: 0,
    };
  }),

  applyReferralCode: protectedProcedure
    .input(z.object({ code: z.string().min(4).max(32) }))
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'module.referrals'))) {
        throw new ForbiddenError('Referrals are not enabled');
      }
      const normalized = input.code.trim().toUpperCase();
      await mergeUserMetadata(ctx.db, ctx.user.id, {
        referredBy: normalized,
        referredAt: new Date().toISOString(),
      });
      return { ok: true as const, code: normalized };
    }),

  registerPushToken: protectedProcedure
    .input(z.object({ token: z.string().min(8).max(512), platform: z.enum(['ios', 'android', 'web']) }))
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'feature.dating_push_notifications'))) {
        throw new ForbiddenError('Push is not enabled');
      }
      await mergeUserMetadata(ctx.db, ctx.user.id, {
        pushToken: input.token,
        pushPlatform: input.platform,
      });
      return { ok: true as const };
    }),

  purchaseMobilePlan: protectedProcedure
    .input(
      z.object({
        productId: z.string(),
        tier: z.enum(['plus', 'premium']),
        billingCycle: z.enum(['monthly', 'yearly']).default('monthly'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const fctx = datingFlagCtx(ctx.user, ctx.db);
      if (!(await flagOn(fctx, 'feature.dating_revenuecat'))) {
        throw new ForbiddenError('In-app purchases are not enabled');
      }
      const [product] = await ctx.db
        .select()
        .from(schema.product)
        .where(
          and(eq(schema.product.id, input.productId), eq(schema.product.tenantId, ctx.user.tenantId)),
        )
        .limit(1);
      if (!product) throw new NotFoundError('product', input.productId);
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const trialEnds = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const planLabel =
        input.tier === 'premium'
          ? input.billingCycle === 'yearly'
            ? 'heartline_premium_yearly'
            : 'heartline_premium_monthly'
          : input.billingCycle === 'yearly'
            ? 'heartline_plus_yearly'
            : 'heartline_plus_monthly';
      const [sub] = await ctx.db
        .insert(schema.subscription)
        .values({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          productId: product.id,
          provider: 'revenuecat',
          providerSubscriptionId: `rc_mock_${newId()}`,
          priceId: input.billingCycle,
          plan: planLabel,
          status: 'trialing',
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          trialEndsAt: trialEnds,
          metadata: { revenueCatMock: true, tier: input.tier },
        })
        .returning();
      if (!sub) throw new Error('failed to create subscription');
      const keys =
        input.tier === 'premium'
          ? [
              ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
              ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
              ENTITLEMENT_KEYS.DATING_REWIND,
              ENTITLEMENT_KEYS.DATING_HIDE_ADS,
              ENTITLEMENT_KEYS.DATING_BOOST,
              ENTITLEMENT_KEYS.DATING_TRAVEL_MODE,
              ENTITLEMENT_KEYS.DATING_PRIORITY_LIKES,
            ]
          : [
              ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
              ENTITLEMENT_KEYS.DATING_SEE_WHO_LIKED_YOU,
              ENTITLEMENT_KEYS.DATING_REWIND,
              ENTITLEMENT_KEYS.DATING_HIDE_ADS,
              ENTITLEMENT_KEYS.DATING_BOOST,
            ];
      for (const key of keys) {
        await grantEntitlement({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          key,
          value: true,
          source: 'trial',
          subscriptionId: sub.id,
        });
      }
      return { ok: true as const, subscriptionId: sub.id, tier: input.tier };
    }),

  superLikeQuota: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(async ({ ctx, input }) => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const used = await ctx.db
        .select({ id: schema.datingSwipe.id })
        .from(schema.datingSwipe)
        .where(
          and(
            eq(schema.datingSwipe.tenantId, ctx.user.tenantId),
            eq(schema.datingSwipe.productId, input.productId),
            eq(schema.datingSwipe.fromUserId, ctx.user.id),
            eq(schema.datingSwipe.action, 'super_like'),
            gt(schema.datingSwipe.createdAt, since),
          ),
        );
      const unlimited = await hasEntitlement({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        key: ENTITLEMENT_KEYS.DATING_UNLIMITED_LIKES,
      });
      const limit = unlimited ? 99 : 1;
      return { used: used.length, limit, remaining: Math.max(0, limit - used.length) };
    }),

});
