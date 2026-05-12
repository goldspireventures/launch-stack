export type FlagKind = 'module' | 'feature' | 'limit' | 'operation';

export type FlagScope = 'global' | 'tenant' | 'both';

type Common = {
  description: string;
  scope: FlagScope;
  tags: string[];
  studioOnly: boolean;
  blueprintKinds?: string[];
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
