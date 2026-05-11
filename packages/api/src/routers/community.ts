import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { communitySchemas } from '@goldspire/validation';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const communityRouter = router({
  spaces: protectedProcedure.input(z.object({ productId: z.string() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(schema.space)
      .where(
        and(eq(schema.space.tenantId, ctx.user.tenantId), eq(schema.space.productId, input.productId)),
      ),
  ),

  feed: protectedProcedure.input(z.object({ spaceId: z.string() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(schema.post)
      .where(
        and(eq(schema.post.tenantId, ctx.user.tenantId), eq(schema.post.spaceId, input.spaceId)),
      )
      .orderBy(desc(schema.post.createdAt))
      .limit(50),
  ),

  createSpace: protectedProcedure
    .input(communitySchemas.spaceInput.omit({ tenantId: true }).extend({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.space)
        .values({ ...input, tenantId: ctx.user.tenantId })
        .returning();
      return row;
    }),

  createPost: protectedProcedure.input(communitySchemas.postInput.omit({ tenantId: true })).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(schema.post)
      .values({ ...input, tenantId: ctx.user.tenantId, authorId: ctx.user.id })
      .returning();
    if (row) {
      await trackEvent({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        eventName: ANALYTICS_EVENTS.COMMUNITY_POST_CREATED,
        properties: { spaceId: input.spaceId },
      });
    }
    return row;
  }),
});
