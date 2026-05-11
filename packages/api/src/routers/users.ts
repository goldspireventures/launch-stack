import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { userSchemas } from '@goldspire/validation';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

export const usersRouter = router({
  me: protectedProcedure.query(({ ctx }) => ctx.user),

  list: tenantAdminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const conditions = [eq(schema.user.tenantId, ctx.user.tenantId)];
      if (input?.status) conditions.push(eq(schema.user.status, input.status as schema.User['status']));
      return ctx.db
        .select()
        .from(schema.user)
        .where(and(...conditions))
        .orderBy(desc(schema.user.createdAt))
        .limit(200);
    }),

  byId: tenantAdminProcedure.input(z.object({ id: z.string() })).query(async ({ ctx, input }) => {
    const [u] = await ctx.db
      .select()
      .from(schema.user)
      .where(and(eq(schema.user.id, input.id), eq(schema.user.tenantId, ctx.user.tenantId)))
      .limit(1);
    if (!u) throw new NotFoundError('user', input.id);
    return u;
  }),

  create: tenantAdminProcedure.input(userSchemas.createUser).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db.insert(schema.user).values(input).returning();
    if (!row) throw new Error('failed to create user');
    await logAudit({
      tenantId: row.tenantId,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'user_created',
      entityType: 'user',
      entityId: row.id,
      metadata: { role: row.role },
    });
    await trackEvent({
      tenantId: row.tenantId,
      userId: row.id,
      eventName: ANALYTICS_EVENTS.USER_SIGNED_UP,
    });
    return row;
  }),

  update: tenantAdminProcedure.input(userSchemas.updateUser).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const [row] = await ctx.db
      .update(schema.user)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(schema.user.id, id), eq(schema.user.tenantId, ctx.user.tenantId)))
      .returning();
    if (!row) throw new NotFoundError('user', id);
    await logAudit({
      tenantId: row.tenantId,
      actorId: ctx.user.id,
      actorRole: ctx.user.role,
      action: 'user_updated',
      entityType: 'user',
      entityId: row.id,
      metadata: patch,
    });
    return row;
  }),
});
