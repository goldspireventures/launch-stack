import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { marketplaceSchemas } from '@goldspire/validation';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const marketplaceRouter = router({
  listings: protectedProcedure
    .input(z.object({ productId: z.string(), category: z.string().optional() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(schema.listing)
        .where(
          and(
            eq(schema.listing.tenantId, ctx.user.tenantId),
            eq(schema.listing.productId, input.productId),
            eq(schema.listing.status, 'active'),
            input.category ? eq(schema.listing.category, input.category) : undefined,
          ),
        )
        .orderBy(desc(schema.listing.createdAt))
        .limit(100),
    ),

  myListings: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(schema.listing)
        .where(
          and(
            eq(schema.listing.tenantId, ctx.user.tenantId),
            eq(schema.listing.productId, input.productId),
            eq(schema.listing.sellerId, ctx.user.id),
          ),
        )
        .orderBy(desc(schema.listing.createdAt)),
    ),

  createListing: protectedProcedure
    .input(marketplaceSchemas.listingInput.omit({ tenantId: true, sellerId: true }).extend({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.listing)
        .values({
          ...input,
          tenantId: ctx.user.tenantId,
          sellerId: ctx.user.id,
        })
        .returning();
      if (!row) throw new Error('failed to create listing');
      await trackEvent({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        eventName: ANALYTICS_EVENTS.LISTING_CREATED,
        properties: { category: input.category },
      });
      return row;
    }),

  myOrders: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(schema.order)
      .where(and(eq(schema.order.tenantId, ctx.user.tenantId), eq(schema.order.buyerId, ctx.user.id)))
      .orderBy(desc(schema.order.createdAt)),
  ),
});
