import { and, desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { reportSchemas } from '@goldspire/validation';
import { logAudit } from '@goldspire/audit';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { router, tenantAdminProcedure, protectedProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

export const reportsRouter = router({
  list: tenantAdminProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(schema.report)
      .where(eq(schema.report.tenantId, ctx.user.tenantId))
      .orderBy(desc(schema.report.createdAt))
      .limit(200);
  }),

  create: protectedProcedure
    .input(reportSchemas.createReport.omit({ tenantId: true }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.report)
        .values({
          tenantId: ctx.user.tenantId,
          reporterId: ctx.user.id,
          targetType: input.targetType,
          targetId: input.targetId,
          reason: input.reason,
          details: input.details,
          metadata: input.metadata,
        })
        .returning();
      if (!row) throw new Error('failed to create report');
      await logAudit({
        tenantId: row.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'report_created',
        entityType: 'report',
        entityId: row.id,
        metadata: { reason: input.reason, targetType: input.targetType },
      });
      await trackEvent({
        tenantId: row.tenantId,
        userId: ctx.user.id,
        eventName: ANALYTICS_EVENTS.REPORT_CREATED,
        properties: { reason: input.reason },
      });
      return row;
    }),

  updateStatus: tenantAdminProcedure
    .input(reportSchemas.updateReportStatus)
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .update(schema.report)
        .set({
          status: input.status,
          resolution: input.resolution,
          resolvedById: ctx.user.id,
          resolvedAt: input.status === 'resolved' || input.status === 'dismissed' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(eq(schema.report.id, input.id), eq(schema.report.tenantId, ctx.user.tenantId)))
        .returning();
      if (!row) throw new NotFoundError('report', input.id);
      await logAudit({
        tenantId: row.tenantId,
        actorId: ctx.user.id,
        actorRole: ctx.user.role,
        action: 'report_updated',
        entityType: 'report',
        entityId: row.id,
        metadata: { status: input.status },
      });
      return row;
    }),
});
