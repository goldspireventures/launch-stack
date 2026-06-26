'use client';

import * as React from 'react';
import Link from 'next/link';
import { BookOpen, ArrowRight, Search } from 'lucide-react';
import {
  Button,
  CommandPanel,
  Input,
  FadeIn,
} from '@goldspire/ui';
import {
  listStudioDocsByCategory,
  searchStudioDocs,
  studioDocViewHref,
} from '@goldspire/commercial';
import { StudioPageHeader } from '@/components/studio-page-header';

export default function StudioDocsHubPage() {
  const [query, setQuery] = React.useState('');

  const groups = React.useMemo(() => {
    const hits = searchStudioDocs(query);
    const hitPaths = new Set(hits.map((d) => d.path));
    return listStudioDocsByCategory()
      .map((g) => ({ ...g, docs: g.docs.filter((d) => hitPaths.has(d.path)) }))
      .filter((g) => g.docs.length > 0);
  }, [query]);

  return (
    <div className="space-y-8">
      <FadeIn>
        <StudioPageHeader
          eyebrow="Studio · Knowledge"
          title="Documentation"
          description="Internal runbooks, client delivery policies, deployment gates, and QA — linked from Factory runbooks and the Delivery guide."
          actions={
            <Button asChild variant="outline" size="sm">
              <Link href="/delivery">
                Delivery guide
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </Button>
          }
        />
      </FadeIn>

      <CommandPanel
        title={
          <span className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Search docs
          </span>
        }
        description="All paths are whitelisted and open in-app — no leaving the Console for runbooks."
      >
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="provision, handover, certify, tier 2…"
          className="max-w-md"
        />
      </CommandPanel>

      <div className="space-y-8">
        {groups.map((group) => (
          <section key={group.category}>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              {group.label}
            </h2>
            <ul className="grid gap-2 md:grid-cols-2">
              {group.docs.map((doc) => (
                <li key={doc.path}>
                  <Link
                    href={studioDocViewHref(doc.path)}
                    className="flex flex-col rounded-lg border border-border/60 px-4 py-3 transition-colors hover:border-primary/40 hover:bg-muted/20"
                  >
                    <span className="font-medium text-foreground">{doc.title}</span>
                    <span className="mt-1 text-xs text-muted-foreground">{doc.summary}</span>
                    {doc.consoleHref ? (
                      <span className="mt-2 text-[10px] text-primary">
                        Console · {doc.consoleHref}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
