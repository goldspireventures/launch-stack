import fs from 'node:fs/promises';
import path from 'node:path';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import {
  getStudioDocByPath,
  listStudioDocsByCategory,
  normalizeDocPath,
  studioDocViewHref,
} from '@goldspire/commercial';
import { Button } from '@goldspire/ui';
import { StudioPageHeader } from '@/components/studio-page-header';
import { StudioDocMarkdown } from '@/components/studio-doc-markdown';
import { findMonorepoRoot } from '@/lib/repo-root';

export default async function StudioDocViewPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>;
}) {
  const { path: raw } = await searchParams;
  if (!raw) notFound();

  const docPath = normalizeDocPath(raw);
  const entry = getStudioDocByPath(docPath);
  if (!entry) notFound();

  const root = findMonorepoRoot();
  const abs = path.join(root, docPath);
  let markdown: string;
  try {
    markdown = await fs.readFile(abs, 'utf8');
  } catch {
    notFound();
  }

  const related = listStudioDocsByCategory()
    .find((g) => g.category === entry.category)
    ?.docs.filter((d) => d.path !== docPath)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <StudioPageHeader
        eyebrow="Documentation"
        title={entry.title}
        description={entry.summary}
        actions={
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/docs">
                <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
                All docs
              </Link>
            </Button>
            {entry.consoleHref ? (
              <Button asChild size="sm">
                <Link href={entry.consoleHref}>
                  Open in Console
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0 rounded-lg border border-border/60 bg-card/30 px-6 py-6">
          <StudioDocMarkdown markdown={markdown} basePath={docPath} />
        </div>

        <aside className="space-y-4 text-sm">
          <p className="font-mono text-[10px] text-muted-foreground">{docPath}</p>
          {related && related.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Related in section
              </p>
              <ul className="space-y-2">
                {related.map((d) => (
                  <li key={d.path}>
                    <Link
                      href={studioDocViewHref(d.path)}
                      className="text-primary underline-offset-2 hover:underline"
                    >
                      {d.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Button asChild variant="ghost" size="sm" className="w-full justify-start">
            <Link href="/delivery">Delivery lifecycle map →</Link>
          </Button>
        </aside>
      </div>
    </div>
  );
}
