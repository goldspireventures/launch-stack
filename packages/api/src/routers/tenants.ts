import { desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { tenantSchemas } from '@goldspire/validation';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, studioProcedure, protectedProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

export const tenantsRouter = router({
  list: studioProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.tenant)
      .orderBy(desc(schema.tenant.createdAt));
  }),

  byId: studioProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [t] = await ctx.db.select().from(schema.tenant).where(eq(schema.tenant.id, input.id)).limit(1);
    if (!t) throw new NotFoundError('tenant', input.id);
    return t;
  }),

  current: protectedProcedure.query(async ({ ctx }) => {
    const [t] = await ctx.db
      .select()
      .from(schema.tenant)
      .where(eq(schema.tenant.id, ctx.user.tenantId))
      .limit(1);
    if (!t) throw new NotFoundError('tenant', ctx.user.tenantId);
    return t;
  }),

  create: studioProcedure.input(tenantSchemas.createTenant).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(schema.tenant)
      .values({
        name: input.name,
        slug: input.slug,
        plan: input.plan,
        metadata: input.metadata,
        status: 'trial',
      })
      .returning();
    if (!row) throw new Error('failed to create tenant');
    await logAudit({
      tenantId: row.id,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'tenant_created',
      entityType: 'tenant',
      entityId: row.id,
      metadata: { plan: input.plan, slug: input.slug },
    });
    await trackEvent({
      tenantId: row.id,
      userId: ctx.user.id,
      eventName: ANALYTICS_EVENTS.TENANT_CREATED,
      properties: { plan: input.plan },
    });
    return row;
  }),

  update: studioProcedure.input(tenantSchemas.updateTenant).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(schema.tenant)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(schema.tenant.id, id))
      .returning();
    if (!row) throw new NotFoundError('tenant', id);
    await logAudit({
      tenantId: row.id,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'tenant_updated',
      entityType: 'tenant',
      entityId: row.id,
      metadata: patch,
    });
    return row;
  }),
});
