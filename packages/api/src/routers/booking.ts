import { desc, eq, and } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { bookingSchemas } from '@goldspire/validation';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, protectedProcedure, tenantAdminProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';
import { tenantScopeId } from '../lib/tenant-scope';
import { assertCtxSupportMutation } from '../lib/assert-support-scope';

export const bookingRouter = router({
  /**
   * All bookable locations for the caller's tenant (no product filter).
   * Prefer this over `businesses` + `products.list[0]` — Nova Care seeds
   * multiple products but only one business (linked to a single product).
   */
  tenantBusinesses: protectedProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(schema.business)
      .where(eq(schema.business.tenantId, ctx.user.tenantId))
      .orderBy(desc(schema.business.createdAt)),
  ),

  businesses: protectedProcedure
    .input(z.object({ productId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(schema.business)
        .where(
          and(eq(schema.business.tenantId, ctx.user.tenantId), eq(schema.business.productId, input.productId)),
        ),
    ),

  services: protectedProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(schema.service)
        .where(
          and(eq(schema.service.tenantId, ctx.user.tenantId), eq(schema.service.businessId, input.businessId)),
        ),
    ),

  staff: protectedProcedure.input(z.object({ businessId: z.string() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(schema.staff)
      .where(
        and(eq(schema.staff.tenantId, ctx.user.tenantId), eq(schema.staff.businessId, input.businessId)),
      ),
  ),

  bookings: tenantAdminProcedure
    .input(z.object({ businessId: z.string() }))
    .query(({ ctx, input }) =>
      ctx.db
        .select()
        .from(schema.booking)
        .where(
          and(eq(schema.booking.tenantId, ctx.user.tenantId), eq(schema.booking.businessId, input.businessId)),
        )
        .orderBy(desc(schema.booking.startsAt))
        .limit(200),
    ),

  createBusiness: tenantAdminProcedure
    .input(bookingSchemas.businessInput.extend({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.business)
        .values({ ...input, tenantId: ctx.user.tenantId })
        .returning();
      return row;
    }),

  createService: tenantAdminProcedure.input(bookingSchemas.serviceInput).mutation(async ({ ctx, input }) => {
    assertCtxSupportMutation(ctx);
    const [row] = await ctx.db
      .insert(schema.service)
      .values({ ...input, tenantId: tenantScopeId(ctx) })
      .returning();
    return row;
  }),

  createBooking: protectedProcedure
    .input(bookingSchemas.bookingInput.omit({ tenantId: true }))
    .mutation(async ({ ctx, input }) => {
      // Resolve service to compute end time and price snapshot
      const [svc] = await ctx.db
        .select()
        .from(schema.service)
        .where(eq(schema.service.id, input.serviceId))
        .limit(1);
      if (!svc) throw new NotFoundError('service', input.serviceId);
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(startsAt.getTime() + svc.durationMinutes * 60 * 1000);

      const [row] = await ctx.db
        .insert(schema.booking)
        .values({
          tenantId: ctx.user.tenantId,
          businessId: input.businessId,
          serviceId: input.serviceId,
          staffId: input.staffId,
          customerUserId: ctx.user.id,
          customerEmail: input.customerEmail,
          customerName: input.customerName,
          startsAt,
          endsAt,
          status: 'pending',
          priceCents: svc.priceCents,
          notes: input.notes,
        })
        .returning();
      if (!row) throw new Error('failed to create booking');

      await trackEvent({
        tenantId: ctx.user.tenantId,
        userId: ctx.user.id,
        eventName: ANALYTICS_EVENTS.BOOKING_CREATED,
        properties: { businessId: input.businessId, serviceId: input.serviceId },
      });

      return row;
    }),
});
