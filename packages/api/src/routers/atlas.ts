import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { desc, eq } from 'drizzle-orm';
import {
  accessibleCorpora,
  actorHasCapability,
  evaluateAccess,
  CORPUS_REGISTRY,
  type AccessActor,
  type AccessPolicyOverrideRecord,
  type KnowledgeCorpusId,
} from '@goldspire/access';
import { STUDIO_CONSOLE_ROLES, TENANT_ADMIN_ROLES, inRoles } from '@goldspire/config';
import * as schema from '@goldspire/db/schema';
import {
  answerWithRag,
  getIndexStats,
  ingestKnowledgeIndex,
  searchKnowledge,
} from '@goldspire/knowledge';
import { buildAtlasLiveOpsContext } from '../lib/atlas-live-ops-context';
import { loadAccessPolicyOverrides } from '../lib/load-access-policy-overrides';
import { router } from '../trpc';
import { protectedProcedure } from '../trpc';

function toActor(user: {
  id: string;
  role: string;
  tenantId: string;
}): AccessActor {
  return {
    userId: user.id,
    role: user.role as AccessActor['role'],
    tenantId: user.tenantId,
  };
}

function policyOpts(overrides: readonly AccessPolicyOverrideRecord[]) {
  return overrides.length > 0 ? { overrides } : undefined;
}

function assertAtlasAccess(
  user: { id: string; role: string; tenantId: string },
  action: string,
  resource: { type: string; corpus?: KnowledgeCorpusId; tenantId?: string },
  overrides: readonly AccessPolicyOverrideRecord[],
) {
  const decision = evaluateAccess(toActor(user), { action, resource }, policyOpts(overrides));
  if (!decision.allowed) {
    throw new TRPCError({ code: 'FORBIDDEN', message: decision.reason });
  }
}

const atlasUserProcedure = protectedProcedure.use(async ({ next, ctx }) => {
  const user = ctx.user;
  if (
    !inRoles(user.role, STUDIO_CONSOLE_ROLES) &&
    !inRoles(user.role, TENANT_ADMIN_ROLES)
  ) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Atlas requires studio or tenant admin access',
    });
  }
  const overrides = await loadAccessPolicyOverrides(ctx.db);
  assertAtlasAccess(user, 'atlas:app.enter', { type: 'atlas.app' }, overrides);
  return next({ ctx: { ...ctx, accessOverrides: overrides } });
});

export const atlasRouter = router({
  corpora: atlasUserProcedure.query(async ({ ctx }) => {
    const actor = toActor(ctx.user);
    const opts = policyOpts(ctx.accessOverrides);
    const ids = accessibleCorpora(actor, opts);
    return ids.map((id) => CORPUS_REGISTRY[id]);
  }),

  indexStatus: atlasUserProcedure.query(async ({ ctx }) => {
    assertAtlasAccess(ctx.user, 'atlas:query', { type: 'knowledge' }, ctx.accessOverrides);
    return getIndexStats(ctx.db);
  }),

  search: atlasUserProcedure
    .input(
      z.object({
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(30).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      assertAtlasAccess(ctx.user, 'atlas:search', { type: 'knowledge' }, ctx.accessOverrides);
      return searchKnowledge(
        ctx.db,
        toActor(ctx.user),
        input.query,
        input.limit ?? 12,
        policyOpts(ctx.accessOverrides),
      );
    }),

  ask: atlasUserProcedure
    .input(
      z.object({
        question: z.string().min(1).max(4000),
        sessionId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertAtlasAccess(ctx.user, 'atlas:query', { type: 'knowledge' }, ctx.accessOverrides);
      const actor = toActor(ctx.user);
      const accessOptions = policyOpts(ctx.accessOverrides);
      const includeLiveOps = actorHasCapability(actor, 'atlas.live_ops', ctx.accessOverrides);
      const liveOpsContext = includeLiveOps
        ? await buildAtlasLiveOpsContext(ctx.db)
        : undefined;

      let sessionId = input.sessionId;
      if (!sessionId) {
        const [session] = await ctx.db
          .insert(schema.atlasSession)
          .values({
            userId: ctx.user.id,
            tenantId: ctx.user.tenantId,
            title: input.question.slice(0, 120),
          })
          .returning();
        sessionId = session?.id;
      }
      if (!sessionId) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create session' });
      }

      await ctx.db.insert(schema.atlasMessage).values({
        sessionId,
        tenantId: ctx.user.tenantId,
        role: 'user',
        content: input.question,
        citations: [],
      });

      const result = await answerWithRag(ctx.db, actor, input.question, {
        liveOpsContext,
        accessOptions,
      });

      await ctx.db.insert(schema.atlasMessage).values({
        sessionId,
        tenantId: ctx.user.tenantId,
        role: 'assistant',
        content: result.answer,
        citations: result.citations,
        model: result.model,
      });

      return { sessionId, ...result };
    }),

  sessions: atlasUserProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select({
        id: schema.atlasSession.id,
        title: schema.atlasSession.title,
        createdAt: schema.atlasSession.createdAt,
        updatedAt: schema.atlasSession.updatedAt,
      })
      .from(schema.atlasSession)
      .where(eq(schema.atlasSession.userId, ctx.user.id))
      .orderBy(desc(schema.atlasSession.updatedAt))
      .limit(30);
  }),

  sessionMessages: atlasUserProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [session] = await ctx.db
        .select()
        .from(schema.atlasSession)
        .where(eq(schema.atlasSession.id, input.sessionId))
        .limit(1);
      if (!session || session.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Session not found' });
      }
      return ctx.db
        .select()
        .from(schema.atlasMessage)
        .where(eq(schema.atlasMessage.sessionId, input.sessionId))
        .orderBy(schema.atlasMessage.createdAt);
    }),

  reindex: atlasUserProcedure.mutation(async ({ ctx }) => {
    assertAtlasAccess(ctx.user, 'atlas:reindex', { type: 'knowledge' }, ctx.accessOverrides);
    if (!actorHasCapability(toActor(ctx.user), 'atlas.reindex', ctx.accessOverrides)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'Requires atlas.reindex capability' });
    }

    const [run] = await ctx.db
      .insert(schema.knowledgeIndexRun)
      .values({ triggeredByUserId: ctx.user.id, status: 'running' })
      .returning();

    try {
      const result = await ingestKnowledgeIndex(ctx.db);
      await ctx.db
        .update(schema.knowledgeIndexRun)
        .set({
          status: 'completed',
          documentsProcessed: result.documentsProcessed,
          chunksWritten: result.chunksWritten,
          completedAt: new Date(),
        })
        .where(eq(schema.knowledgeIndexRun.id, run!.id));
      return { ok: true as const, ...result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await ctx.db
        .update(schema.knowledgeIndexRun)
        .set({ status: 'failed', error: message, completedAt: new Date() })
        .where(eq(schema.knowledgeIndexRun.id, run!.id));
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message });
    }
  }),
});
