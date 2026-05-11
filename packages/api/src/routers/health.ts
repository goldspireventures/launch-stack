import { sql } from 'drizzle-orm';
import { router, publicProcedure } from '../trpc';
import { hasRealProvider, env } from '@goldspire/config';

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ ok: true, time: new Date().toISOString() })),

  status: publicProcedure.query(async ({ ctx }) => {
    let dbOk = false;
    try {
      await ctx.db.execute(sql`select 1`);
      dbOk = true;
    } catch {
      dbOk = false;
    }
    return {
      ok: dbOk,
      env: env.NODE_ENV,
      providers: {
        auth: hasRealProvider.auth ? 'live' : 'mock',
        payments: hasRealProvider.payments ? 'live' : 'mock',
        ai: hasRealProvider.ai ? 'live' : 'mock',
        email: hasRealProvider.email ? 'live' : 'mock',
        jobs: hasRealProvider.jobs ? 'live' : 'mock',
        analytics: hasRealProvider.analytics ? 'live' : 'mock',
        errors: hasRealProvider.errors ? 'live' : 'mock',
      },
      time: new Date().toISOString(),
    };
  }),
});
