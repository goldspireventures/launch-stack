/**
 * CLI: rebuild Atlas knowledge index (docs + selected code paths).
 * Requires DATABASE_URL and studio context via system migration user.
 *
 *   pnpm atlas:reindex
 */
import '../packages/db/scripts/_load-env';
import { db } from '@goldspire/db';
import { withSystemStudioContext } from '@goldspire/db/tenant-context';
import { ingestKnowledgeIndex } from '@goldspire/knowledge';

async function main() {
  const result = await withSystemStudioContext(db, async (tx) => ingestKnowledgeIndex(tx));
  console.log(
    `Atlas reindex complete: ${result.documentsProcessed} documents, ${result.chunksWritten} chunks`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
