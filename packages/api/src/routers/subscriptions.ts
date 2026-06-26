import { desc, eq, and } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { billingSchemas } from '@goldspire/validation';
import { createCheckoutSession } from '@goldspire/payments';
import { z } from 'zod';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';
import { tenantScopeId } from '../lib/tenant-scope';

export const subscriptionsRouter = router({
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.subscription)
      .where(eq(schema.subscription.tenantId, tenantScopeId(ctx)))
      .orderBy(desc(schema.subscription.createdAt))
      .limit(200);
  }),

  mine: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.subscription)
      .where(
        and(
          eq(schema.subscription.tenantId, ctx.user.tenantId),
          eq(schema.subscription.userId, ctx.user.id),
        ),
      );
  }),

  checkout: protectedProcedure
    .input(billingSchemas.checkoutInput.omit({ tenantId: true, userId: true }))
    .mutation(async ({ ctx, input }) => {
      const session = await createCheckoutSession({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        priceId: input.priceId,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        metadata: Object.fromEntries(
          Object.entries(input.metadata).map(([k, v]) => [k, String(v)]),
        ),
      });
      return session;
    }),

  cancel: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.subscription)
        .set({ cancelAtPeriodEnd: true, updatedAt: new Date() })
        .where(
          and(
            eq(schema.subscription.id, input.subscriptionId),
            eq(schema.subscription.tenantId, ctx.user.tenantId),
            eq(schema.subscription.userId, ctx.user.id),
          ),
        )
        .returning();
      return row;
    }),
});
