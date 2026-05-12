export type FlagKind = 'module' | 'feature' | 'limit' | 'operation';

export type FlagScope = 'global' | 'tenant' | 'both';

/**
 * Lifecycle stage. Surfaced in the Studio catalog view; lets operators retire
 * flags safely instead of carrying dead switches forever.
 *
 *   experimental  — recently introduced, may move or be removed without notice
 *   stable        — committed surface, safe for clients to rely on
 *   deprecated    — slated for removal; admins should migrate tenants off it
 *
 * `removeAfter` is an ISO date hint for deprecated flags (rendered as
 * "Removes after Aug 2026"). Purely advisory; nothing enforces it.
 */
export type FlagLifecycle = 'experimental' | 'stable' | 'deprecated';

type Common = {
  description: string;
  scope: FlagScope;
  tags: string[];
  studioOnly: boolean;
  blueprintKinds?: string[];
  /** Lifecycle stage. Defaults to `stable` if omitted. */
  lifecycle?: FlagLifecycle;
  /** ISO date string — only meaningful when lifecycle = 'deprecated'. */
  removeAfter?: string;
  /** Limits only — optional UI / validation hints */
  minNumeric?: number;
  maxNumeric?: number;
};

export type ModuleFlagDefinition = Common & {
  kind: 'module';
  key: `module.${string}`;
  defaultEnabled: boolean;
};

export type FeatureFlagDefinition = Common & {
  kind: 'feature';
  key: string;
  defaultEnabled: boolean;
};

export type LimitFlagDefinition = Common & {
  kind: 'limit';
  key: `limit.${string}`;
  defaultNumeric: number;
};

export type OperationFlagDefinition = Common & {
  kind: 'operation';
  key: `ops.${string}`;
  defaultEnabled: boolean;
};

export type FlagDefinition =
  | ModuleFlagDefinition
  | FeatureFlagDefinition
  | LimitFlagDefinition
  | OperationFlagDefinition;

export function isLimitDef(d: FlagDefinition): d is LimitFlagDefinition {
  return d.kind === 'limit';
}

export function isBooleanKind(d: FlagDefinition): d is ModuleFlagDefinition | FeatureFlagDefinition | OperationFlagDefinition {
  return d.kind !== 'limit';
}
