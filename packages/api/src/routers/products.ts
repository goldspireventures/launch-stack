import { desc, eq, and } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { productSchemas } from '@goldspire/validation';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';
import { tenantScopeId } from '../lib/tenant-scope';
import { assertCtxSupportMutation } from '../lib/assert-support-scope';

export const productsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.product)
      .where(eq(schema.product.tenantId, tenantScopeId(ctx)))
      .orderBy(desc(schema.product.createdAt));
  }),

  byId: protectedProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [p] = await ctx.db
      .select()
      .from(schema.product)
      .where(and(eq(schema.product.id, input.id), eq(schema.product.tenantId, tenantScopeId(ctx))))
      .limit(1);
    if (!p) throw new NotFoundError('product', input.id);
    return p;
  }),

  bySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const [p] = await ctx.db
        .select()
        .from(schema.product)
        .where(and(eq(schema.product.slug, input.slug), eq(schema.product.tenantId, tenantScopeId(ctx))))
        .limit(1);
      if (!p) throw new NotFoundError('product', input.slug);
      return p;
    }),

  create: tenantAdminProcedure.input(productSchemas.createProduct).mutation(async ({ ctx, input }) => {
    assertCtxSupportMutation(ctx);
    const [row] = await ctx.db
      .insert(schema.product)
      .values({ ...input, tenantId: tenantScopeId(ctx) })
      .returning();
    if (!row) throw new Error('failed to create product');
    await logAudit({
      tenantId: row.tenantId,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'product_created',
      entityType: 'product',
      entityId: row.id,
      metadata: { blueprint: row.blueprint },
    });
    await trackEvent({
      tenantId: row.tenantId,
      productId: row.id,
      userId: ctx.user.id,
      eventName: ANALYTICS_EVENTS.PRODUCT_CREATED,
      properties: { blueprint: row.blueprint },
    });
    return row;
  }),

  update: tenantAdminProcedure.input(productSchemas.updateProduct).mutation(async ({ ctx, input }) => {
    assertCtxSupportMutation(ctx);
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(schema.product)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(schema.product.id, id), eq(schema.product.tenantId, tenantScopeId(ctx))))
      .returning();
    if (!row) throw new NotFoundError('product', id);
    return row;
  }),
});
