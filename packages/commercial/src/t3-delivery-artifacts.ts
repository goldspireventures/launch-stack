import type { DealPresetDefinition } from './deal-presets';

export interface T3ArtifactDraftInput {
  dealTitle: string;
  clientName: string;
  blueprintKind: string;
  productTemplateId: string;
  weeksMin: number;
  weeksMax: number;
  totalFeeMinorUnits: number;
  currency: string;
  notes?: string | null;
}

export function buildT3DiscoveryDraft(input: T3ArtifactDraftInput): string {
  return `# Blueprint discovery · ${input.clientName}

**Engagement:** ${input.dealTitle}  
**Foundation:** ${input.blueprintKind} (reference template: \`${input.productTemplateId}\`)  
**Timeline:** ${input.weeksMin}–${input.weeksMax} weeks · fee per commercial plan

## Target user & core loop
- Primary user:
- Job-to-be-done:
- Core loop (happy path):

## Scope boundary
### In scope (v1)
-

### Non-goals (explicit)
-

## Entities & flows (draft)
| Entity | Purpose | Key states |
|--------|---------|------------|
| | | |

## Integrations (client-owned vs studio-built)
| Integration | Owner | Notes |
|-------------|-------|-------|
| Stripe | Client account | |
| Email (Resend) | Studio env | |
| Analytics | | |

## Risks & open questions
-

## Sign-off
- [ ] Client confirms substance
- [ ] Studio confirms deliverability at fixed economics

${input.notes?.trim() ? `\n---\n**Operator notes:** ${input.notes.trim()}\n` : ''}`;
}

export function buildT3ArchitectureDraft(input: T3ArtifactDraftInput): string {
  return `# Architecture & milestone plan · ${input.clientName}

**Engagement:** ${input.dealTitle}

## System boundaries
- **Web app:**
- **API / data:** Supabase + tRPC (@goldspire/api patterns)
- **Background jobs:** Inngest where needed
- **Admin / ops:**

## Data model (sketch)
\`\`\`text
(tenant) ── users, profiles, …
\`\`\`

## App surfaces
| Surface | Route / app | Notes |
|---------|-------------|-------|
| Client product | | |
| Tenant admin | | |
| Client portal | | |

## Milestone plan (aligned to portal payments)
| Phase | Weeks | Outcome | Portal milestone |
|-------|-------|---------|------------------|
| Discovery lock | 1–2 | Signed scope doc | |
| Foundation | | Schema + golden path | |
| Build | | Feature-complete staging | |
| UAT & launch | | Production + handover | |

## Test strategy
- Golden path smoke + Playwright E2E for core loop
- \`pnpm verify:local\` before each demo

## Rollback / cutover
-

## Sign-off
- [ ] Client agrees to phased plan
- [ ] Studio commits to blueprint + template promotion path

${input.notes?.trim() ? `\n---\n**Operator notes:** ${input.notes.trim()}\n` : ''}`;
}

export function t3ArtifactDraftFromPreset(
  preset: DealPresetDefinition,
  deal: {
    title: string;
    clientName: string;
    weeksMin: number;
    weeksMax: number;
    totalFeeMinorUnits: number;
    currency: string;
    notes?: string | null;
  },
): { discovery: string; architecture: string } {
  const base: T3ArtifactDraftInput = {
    dealTitle: deal.title,
    clientName: deal.clientName,
    blueprintKind: preset.blueprintKind,
    productTemplateId: preset.productTemplateId,
    weeksMin: deal.weeksMin,
    weeksMax: deal.weeksMax,
    totalFeeMinorUnits: deal.totalFeeMinorUnits,
    currency: deal.currency,
    notes: deal.notes,
  };
  return {
    discovery: buildT3DiscoveryDraft(base),
    architecture: buildT3ArchitectureDraft(base),
  };
}
