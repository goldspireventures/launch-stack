import { TRPCError } from '@trpc/server';
import { eq } from 'drizzle-orm';
import { schema } from '@goldspire/db';
import { getBlueprintByKind } from '@goldspire/blueprints';
import { router, studioTenantsManageProcedure } from '../trpc';
import {
  buildStampPreview,
  resolveStampTemplate,
  stampProductTenant,
  stampTenantInputSchema,
} from '../lib/stamp-product-tenant';

/**
 * Onboarding / blueprint-stamping router.
 *
 * The single most important demo flow in the Studio: pick a blueprint,
 * confirm a few details, and a tenant is born with users, products, flags,
 * and an audit trail. The "rebuild Heartline from scratch in 60 seconds"
 * party trick.
 *
 * Why a separate router (vs piling onto `tenants`):
 *   - The stamp is composite: tenant + owner user + N products + feature
 *     flag overrides + N audit events. Different from `tenants.create`
 *     which is a single-row insert.
 *   - Studio-only by design. Even tenant owners shouldn't be able to clone
 *     themselves. The procedure is `studioProcedure`-gated.
 */

export const onboardingRouter = router({
  /**
   * Preview the stamp WITHOUT writing anything. Used by the wizard's "review"
   * step to show the operator exactly what's about to be created.
   */
  preview: studioTenantsManageProcedure.input(stampTenantInputSchema).query(async ({ ctx, input }) => {
    const blueprint = getBlueprintByKind(input.blueprint);
    if (!blueprint) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Unknown blueprint: ${input.blueprint}` });
    }
    const template = resolveStampTemplate(blueprint, input.templateId);
    const slugCollision = await ctx.db
      .select({ id: schema.tenant.id })
      .from(schema.tenant)
      .where(eq(schema.tenant.slug, input.slug))
      .limit(1);
    return {
      ...buildStampPreview(blueprint, template, input),
      slugAvailable: slugCollision.length === 0,
    };
  }),

  /**
   * Commit the stamp. All operations run inside a single transaction so a
   * failure leaves the database untouched.
   */
  stamp: studioTenantsManageProcedure.input(stampTenantInputSchema).mutation(async ({ ctx, input }) => {
    return stampProductTenant(ctx.db, input, { id: ctx.user.id, role: ctx.user.role });
  }),
});
