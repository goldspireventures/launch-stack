import { pgTable, text, varchar, timestamp, jsonb, boolean, index } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums';
import { tenant, user } from './core';
import { newId } from '../types';

/**
 * Per-tenant or global capability/policy overrides — merged at evaluation time.
 * Studio owners manage via Console/API; avoids hardcoding exceptions in code.
 */
export const accessPolicyOverride = pgTable(
  'access_policy_override',
  {
    id: varchar('id', { length: 26 }).$defaultFn(newId).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 }).references(() => tenant.id, {
      onDelete: 'cascade',
    }),
    role: roleEnum('role'),
    /** Capability keys to add for matching actors. */
    grantCapabilities: jsonb('grant_capabilities').$type<string[]>().default([]).notNull(),
    /** Capability keys to revoke (applied after grants). */
    denyCapabilities: jsonb('deny_capabilities').$type<string[]>().default([]).notNull(),
    /** Optional extra policy rules (same shape as ACCESS_POLICY_REGISTRY entries). */
    policyRules: jsonb('policy_rules').$type<unknown[]>().default([]).notNull(),
    enabled: boolean('enabled').default(true).notNull(),
    note: text('note'),
    createdByUserId: varchar('created_by_user_id', { length: 26 }).references(() => user.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => ({
    tenantIx: index('access_policy_override_tenant_ix').on(t.tenantId),
    enabledIx: index('access_policy_override_enabled_ix').on(t.enabled),
  }),
);

export type AccessPolicyOverrideRow = typeof accessPolicyOverride.$inferSelect;
