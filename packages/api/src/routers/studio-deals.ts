import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { schema } from '@goldspire/db';
import {
  buildCommercialPlan,
  commercialPlanToMarkdown,
  createStudioDealInputSchema,
  studioDealPlanInputSchema,
  updateStudioDealInputSchema,
} from '@goldspire/commercial';
import { router, studioProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

export const studioDealsRouter = router({
  /** Preview milestone splits without persisting. */
  previewPlan: studioProcedure.input(studioDealPlanInputSchema).mutation(({ input }) => {
    return buildCommercialPlan(input);
  }),

  list: studioProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(schema.studioDeal).orderBy(desc(schema.studioDeal.createdAt));
  }),

  byId: studioProcedure.input(z.object({ id: z.string().length(26) })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(schema.studioDeal)
      .where(eq(schema.studioDeal.id, input.id))
      .limit(1);
    if (!row) throw new NotFoundError('studio_deal', input.id);
    return row;
  }),

  create: studioProcedure.input(createStudioDealInputSchema).mutation(async ({ ctx, input }) => {
    const { title, clientName, notes, linkedTenantId, ...planInput } = input;
    const planSnapshot = buildCommercialPlan(planInput);
    const [row] = await ctx.db
      .insert(schema.studioDeal)
      .values({
        title,
        clientName,
        engagementKind: planInput.engagementKind,
        clientRisk: planInput.clientRisk,
        subcontracting: planInput.subcontracting,
        weeksMin: planInput.weeksMin,
        weeksMax: planInput.weeksMax,
        totalFeeMinorUnits: planInput.totalFeeMinorUnits,
        currency: planInput.currency,
        status: 'pipeline',
        planSnapshot,
        notes: notes ?? null,
        linkedTenantId: linkedTenantId ?? null,
        createdByUserId: ctx.user.id,
      })
      .returning();
    if (!row) throw new Error('failed to create studio deal');
    return row;
  }),

  update: studioProcedure.input(updateStudioDealInputSchema).mutation(async ({ ctx, input }) => {
    const { id, ...patch } = input;
    const [existing] = await ctx.db
      .select({ id: schema.studioDeal.id })
      .from(schema.studioDeal)
      .where(eq(schema.studioDeal.id, id))
      .limit(1);
    if (!existing) throw new NotFoundError('studio_deal', id);

    const setPayload: Partial<typeof schema.studioDeal.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (patch.title !== undefined) setPayload.title = patch.title;
    if (patch.clientName !== undefined) setPayload.clientName = patch.clientName;
    if (patch.notes !== undefined) setPayload.notes = patch.notes;
    if (patch.status !== undefined) setPayload.status = patch.status;
    if (patch.linkedTenantId !== undefined) setPayload.linkedTenantId = patch.linkedTenantId;

    const [row] = await ctx.db
      .update(schema.studioDeal)
      .set(setPayload)
      .where(eq(schema.studioDeal.id, id))
      .returning();
    if (!row) throw new NotFoundError('studio_deal', id);
    return row;
  }),

  markdown: studioProcedure.input(z.object({ id: z.string().length(26) })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select()
      .from(schema.studioDeal)
      .where(eq(schema.studioDeal.id, input.id))
      .limit(1);
    if (!row) throw new NotFoundError('studio_deal', input.id);
    return commercialPlanToMarkdown(row.title, row.clientName, row.planSnapshot, row.notes);
  }),
});
