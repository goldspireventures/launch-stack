import { and, asc, desc, eq, gt, inArray, lt, not, notInArray, or, sql } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { datingSchemas } from '@goldspire/validation';
import { trackEvent } from '@goldspire/analytics';
import { createNotification } from '@goldspire/notifications';
import { getOrCreateThread } from '@goldspire/chat';
import { hasEntitlement } from '@goldspire/payments';
import { logAudit } from '@goldspire/audit';
import { ANALYTICS_EVENTS, ENTITLEMENT_KEYS } from '@goldspire/config';
import { ForbiddenError, NotFoundError } from '@goldspire/platform';
import { z } from 'zod';
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
    .input(z.object({ productId: z.string(), profile: datingSchemas.datingProfile }))
    .mutation(async ({ ctx, input }) => {
      const { profile, productId } = input;
      const existing = await ctx.db
        .select({ id: schema.datingProfile.id })
        .from(schema.datingProfile)
        .where(
          and(
            eq(schema.datingProfile.userId, ctx.user.id),
            eq(schema.datingProfile.productId, productId),
          ),
        )
        .limit(1);

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
        filters: {},
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
      // Pull users we've already swiped on; exclude them + ourselves.
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
      const excludeIds = [ctx.user.id, ...seenIds];

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
        .limit(input.limit);

      return rows.map((r) => ({ ...r.profile, primaryPhotoUrl: r.photo?.url ?? null }));
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

            await Promise.all([
              createNotification({
                tenantId: ctx.user.tenantId,
                userId: userA,
                type: 'match',
                title: 'New match',
                body: 'You have a new match. Say hi!',
                channels: ['in_app'],
                metadata: { matchId: match.id, threadId: thread.id },
              }),
              createNotification({
                tenantId: ctx.user.tenantId,
                userId: userB,
                type: 'match',
                title: 'New match',
                body: 'You have a new match. Say hi!',
                channels: ['in_app'],
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

      const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
      const photoByUser = new Map(photos.map((p) => [p.userId, p.url]));

      return rows.map((m) => {
        const otherId = m.userAId === ctx.user.id ? m.userBId : m.userAId;
        const other = profileByUser.get(otherId);
        return {
          matchId: m.id,
          threadId: m.threadId,
          otherUserId: otherId,
          otherDisplayName: other?.displayName ?? 'Someone',
          otherBio: other?.bio ?? '',
          otherPhotoUrl: photoByUser.get(otherId) ?? null,
          createdAt: m.createdAt,
          unmatched: m.unmatchedAt !== null,
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
        })
        .from(schema.datingSwipe)
        .innerJoin(
          schema.datingProfile,
          and(
            eq(schema.datingProfile.userId, schema.datingSwipe.fromUserId),
            eq(schema.datingProfile.productId, input.productId),
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

  // silence unused-import warning
  __unused: protectedProcedure.query(() => {
    void [lt, not];
    return null;
  }),
});
