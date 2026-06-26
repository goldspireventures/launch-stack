import { asc, isNull } from 'drizzle-orm';
import type { KnowledgeCorpusId } from '@goldspire/access';
import {
  STUDIO_VENTURE_CATEGORY_LABEL,
  STUDIO_VENTURE_STATUS_LABEL,
  type StudioVentureCategory,
  type StudioVentureStatus,
} from '@goldspire/commercial';
import * as schema from '@goldspire/db/schema';
import type { Database } from '@goldspire/db';

export type VentureKnowledgeSource = {
  corpusId: KnowledgeCorpusId;
  sourceType: string;
  sourcePath: string;
  title: string;
  summary: string | null;
  content: string;
  tenantId: string | null;
};

function formatVentureMarkdown(row: typeof schema.studioVenture.$inferSelect): string {
  const status = STUDIO_VENTURE_STATUS_LABEL[row.status as StudioVentureStatus];
  const category = STUDIO_VENTURE_CATEGORY_LABEL[row.category as StudioVentureCategory];
  const tags = (row.tags ?? []) as string[];
  const links = (row.links ?? []) as Array<{ label: string; url: string }>;

  const lines = [
    `# ${row.name}`,
    '',
    row.tagline ? `> ${row.tagline}` : '',
    row.tagline ? '' : null,
    '## Snapshot',
    `- **Status:** ${status}`,
    `- **Category:** ${category}`,
    `- **Priority:** ${row.priority} (1 = highest)`,
    tags.length > 0 ? `- **Tags:** ${tags.join(', ')}` : null,
    row.nextAction ? `- **Next action:** ${row.nextAction}` : '- **Next action:** (not set)',
    row.nextActionDue ? `- **Due:** ${row.nextActionDue.toISOString()}` : null,
    row.repoUrl ? `- **Repo:** ${row.repoUrl}` : null,
    row.localPath ? `- **Local path:** ${row.localPath}` : null,
    row.cursorWorkspace ? `- **Cursor workspace:** ${row.cursorWorkspace}` : null,
    '',
    '## Notes',
    '',
    row.docsMarkdown?.trim() || '_No notes yet._',
  ].filter((l): l is string => l !== null);

  if (links.length > 0) {
    lines.push('', '## Links', '');
    for (const link of links) {
      lines.push(`- [${link.label}](${link.url})`);
    }
  }

  return lines.join('\n');
}

export function ventureKnowledgeSourcePath(slug: string): string {
  return `studio.venture/${slug}.md`;
}

/** Load all non-archived ventures as Atlas knowledge sources. */
export async function collectStudioVentureSources(db: Database): Promise<VentureKnowledgeSource[]> {
  const rows = await db
    .select()
    .from(schema.studioVenture)
    .where(isNull(schema.studioVenture.archivedAt))
    .orderBy(asc(schema.studioVenture.priority), asc(schema.studioVenture.name));

  return rows.map((row) => {
    const content = formatVentureMarkdown(row);
    return {
      corpusId: 'studio.ventures' as const,
      sourceType: 'venture',
      sourcePath: ventureKnowledgeSourcePath(row.slug),
      title: row.name,
      summary: row.tagline ?? `${STUDIO_VENTURE_STATUS_LABEL[row.status as StudioVentureStatus]} venture`,
      content,
      tenantId: null,
    };
  });
}
