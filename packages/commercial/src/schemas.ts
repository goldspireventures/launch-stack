import { z } from 'zod';

export const engagementKindSchema = z.enum([
  'mvp',
  'mvp_plus_prod_planned',
  'discovery_sprint',
  'retainer',
]);
export const clientRiskSchema = z.enum(['referred', 'unknown', 'enterprise']);
export const subcontractingSchema = z.enum(['none', 'light', 'heavy']);

const weeksRefine = (d: { weeksMin: number; weeksMax: number }) => d.weeksMax >= d.weeksMin;

/** Raw shape before refinements (extendable). */
export const studioDealPlanBaseSchema = z
  .object({
    engagementKind: engagementKindSchema,
    clientRisk: clientRiskSchema,
    subcontracting: subcontractingSchema,
    weeksMin: z.number().int().min(1).max(52),
    weeksMax: z.number().int().min(1).max(104),
    /** Total contract value in minor units (e.g. cents). */
    totalFeeMinorUnits: z.number().int().positive(),
    currency: z.string().length(3).default('EUR'),
  })
  .strict();

/** Inputs used to generate milestone splits and copy. */
export const studioDealPlanInputSchema = studioDealPlanBaseSchema.refine(weeksRefine, {
  message: 'weeksMax must be >= weeksMin',
  path: ['weeksMax'],
});

export const createStudioDealInputSchema = studioDealPlanBaseSchema
  .extend({
    title: z.string().min(1).max(200),
    clientName: z.string().min(1).max(200),
    notes: z.string().max(8000).optional(),
    linkedTenantId: z.string().length(26).optional(),
    /** Which client-portal kickoff questionnaire to show (`none` skips). */
    intakeTemplateId: z.enum(['none', 'social_matching_v1']).optional(),
    /** Factory preset slug — locks runbook matching (tier1-dating, tier1-booking, …). */
    dealPresetSlug: z.string().max(64).nullable().optional(),
  })
  .strict()
  .refine(weeksRefine, {
    message: 'weeksMax must be >= weeksMin',
    path: ['weeksMax'],
  });

export const updateStudioDealInputSchema = z
  .object({
    id: z.string().length(26),
    title: z.string().min(1).max(200).optional(),
    clientName: z.string().min(1).max(200).optional(),
    notes: z.string().max(8000).nullable().optional(),
    status: z.enum(['draft', 'pipeline', 'won', 'lost', 'archived']).optional(),
    linkedTenantId: z.string().length(26).nullable().optional(),
    clientContactEmail: z.string().email().nullable().optional(),
    stagingUrl: z.string().max(2000).nullable().optional(),
    clientDeliveryFocus: z.string().max(280).nullable().optional(),
    intakeTemplateId: z.enum(['none', 'social_matching_v1']).optional(),
    nextDemoAt: z.coerce.date().nullable().optional(),
    nextDemoUrl: z.string().url().max(2000).nullable().or(z.literal('')).optional(),
    renewalDueAt: z.coerce.date().nullable().optional(),
    dealPresetSlug: z.string().max(64).nullable().optional(),
  })
  .strict();

/** Normalized plan input (defaults applied). */
export type StudioDealPlanInput = z.output<typeof studioDealPlanInputSchema>;
export type CreateStudioDealInput = z.infer<typeof createStudioDealInputSchema>;
export type UpdateStudioDealInput = z.infer<typeof updateStudioDealInputSchema>;
