import { and, asc, desc, eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { aiAgentSchemas } from '@goldspire/validation';
import { getAIProvider } from '@goldspire/ai';
import { trackEvent } from '@goldspire/analytics';
import { ANALYTICS_EVENTS } from '@goldspire/config';
import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { NotFoundError } from '@goldspire/platform';

export const aiAgentRouter = router({
  sessions: protectedProcedure.input(z.object({ productId: z.string() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(schema.assistantSession)
      .where(
        and(
          eq(schema.assistantSession.tenantId, ctx.user.tenantId),
          eq(schema.assistantSession.productId, input.productId),
          eq(schema.assistantSession.userId, ctx.user.id),
        ),
      )
      .orderBy(desc(schema.assistantSession.updatedAt)),
  ),

  startSession: protectedProcedure
    .input(aiAgentSchemas.createAssistantSession.omit({ tenantId: true }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.assistantSession)
        .values({
          tenantId: ctx.user.tenantId,
          productId: input.productId,
          userId: ctx.user.id,
          systemPrompt: input.systemPrompt,
          toolPolicy: input.toolPolicy,
        })
        .returning();
      return row;
    }),

  messages: protectedProcedure.input(z.object({ sessionId: z.string() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(schema.assistantMessage)
      .where(
        and(
          eq(schema.assistantMessage.tenantId, ctx.user.tenantId),
          eq(schema.assistantMessage.sessionId, input.sessionId),
        ),
      )
      .orderBy(asc(schema.assistantMessage.createdAt)),
  ),

  sendMessage: protectedProcedure
    .input(aiAgentSchemas.sendAssistantMessage.omit({ tenantId: true }))
    .mutation(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select()
        .from(schema.assistantSession)
        .where(eq(schema.assistantSession.id, input.sessionId))
        .limit(1);
      if (!session) throw new NotFoundError('assistant_session', input.sessionId);

      // Persist user message
      await ctx.db.insert(schema.assistantMessage).values({
        tenantId: ctx.user.tenantId,
        sessionId: input.sessionId,
        role: 'user',
        content: input.content,
        parts: input.attachments,
      });

      // Pull prior context (last 20)
      const prior = await ctx.db
        .select()
        .from(schema.assistantMessage)
        .where(eq(schema.assistantMessage.sessionId, input.sessionId))
        .orderBy(desc(schema.assistantMessage.createdAt))
        .limit(20);

      const provider = getAIProvider();
      const result = await provider.generateText({
        messages: [
          ...(session.systemPrompt
            ? ([{ role: 'system' as const, content: session.systemPrompt }] as const)
            : []),
          ...prior
            .slice()
            .reverse()
            .map((m) => ({
              role: m.role as 'user' | 'assistant' | 'system' | 'tool',
              content: m.content,
            })),
          { role: 'user' as const, content: input.content },
        ],
      });

      const [assistantRow] = await ctx.db
        .insert(schema.assistantMessage)
        .values({
          tenantId: ctx.user.tenantId,
          sessionId: input.sessionId,
          role: 'assistant',
          content: result.text,
          tokenCount: result.usage.totalTokens,
          model: result.model,
        })
        .returning();

      return assistantRow;
    }),

  tasks: protectedProcedure.input(z.object({ productId: z.string() })).query(({ ctx, input }) =>
    ctx.db
      .select()
      .from(schema.agentTask)
      .where(
        and(
          eq(schema.agentTask.tenantId, ctx.user.tenantId),
          eq(schema.agentTask.productId, input.productId),
          eq(schema.agentTask.ownerId, ctx.user.id),
        ),
      )
      .orderBy(desc(schema.agentTask.createdAt)),
  ),

  createTask: protectedProcedure
    .input(aiAgentSchemas.createAgentTask.omit({ tenantId: true }).extend({ productId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .insert(schema.agentTask)
        .values({
          tenantId: ctx.user.tenantId,
          productId: input.productId,
          ownerId: ctx.user.id,
          sessionId: input.sessionId,
          title: input.title,
          description: input.description,
          toolPlan: input.toolPlan,
          status: 'pending',
        })
        .returning();
      if (row) {
        await trackEvent({
          tenantId: ctx.user.tenantId,
          userId: ctx.user.id,
          productId: input.productId,
          eventName: ANALYTICS_EVENTS.ASSISTANT_TASK_CREATED,
          properties: { title: input.title },
        });
      }
      return row;
    }),
});
