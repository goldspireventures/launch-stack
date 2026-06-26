'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  LoadingState,
  Textarea,
  useToast,
} from '@goldspire/ui';
import type { StudioPlaybook } from '@goldspire/commercial';
import { StudioPageHeader } from '@/components/studio-page-header';
import { trpc } from '@/lib/trpc';

const CATEGORY_LABEL: Record<StudioPlaybook['category'], string> = {
  operating: 'Operating',
  sales: 'Sales',
  delivery: 'Delivery',
  commercial: 'Commercial',
};

export default function PlaybooksPage() {
  const { toast } = useToast();
  const list = trpc.studio.playbooksList.useQuery();
  const [activeKey, setActiveKey] = React.useState<string | null>(null);
  const detail = trpc.studio.playbookGet.useQuery(
    { key: activeKey ?? '' },
    { enabled: Boolean(activeKey) },
  );
  const upsert = trpc.studio.playbookUpsert.useMutation({
    onSuccess: () => {
      void list.refetch();
      void detail.refetch();
      toast({ title: 'Playbook saved', tone: 'success' });
    },
    onError: (e) => toast({ title: 'Save failed', description: e.message, tone: 'danger' }),
  });

  const [editTitle, setEditTitle] = React.useState('');
  const [editBody, setEditBody] = React.useState('');

  React.useEffect(() => {
    if (detail.data) {
      setEditTitle(detail.data.title);
      setEditBody(detail.data.bodyMarkdown);
    }
  }, [detail.data]);

  React.useEffect(() => {
    if (!activeKey && list.data?.[0]) setActiveKey(list.data[0].key);
  }, [list.data, activeKey]);

  if (list.isLoading) {
    return (
      <LoadingState label="Loading playbooks" />
    );
  }

  const playbooks = list.data ?? [];
  const active = detail.data;

  return (
    <div className="space-y-8">
      <StudioPageHeader
        eyebrow="Studio OS"
        title="Playbooks"
        description="Operating procedures live here — not Notion. Edit when you learn; Desk and Enquiries link back to these SOPs."
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/docs">Markdown runbooks</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/">Back to Desk</Link>
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Library</CardTitle>
            <CardDescription>{playbooks.length} playbooks</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            {playbooks.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setActiveKey(p.key)}
                className={`w-full rounded-md px-3 py-2.5 text-left text-sm transition-colors ${
                  activeKey === p.key ? 'bg-primary/15 text-foreground' : 'hover:bg-muted/50'
                }`}
              >
                <span className="font-medium">{p.title}</span>
                <span className="mt-0.5 flex flex-wrap gap-1">
                  <Badge variant="outline" className="text-[10px]">
                    {CATEGORY_LABEL[p.category]}
                  </Badge>
                  {p.isCustomized ? (
                    <Badge variant="secondary" className="text-[10px]">
                      edited
                    </Badge>
                  ) : null}
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          {active ? (
            <>
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <CardTitle>{active.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {active.tags.map((t) => (
                        <Badge key={t} variant="outline" className="mr-1 text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </CardDescription>
                  </div>
                  <Button
                    size="sm"
                    disabled={upsert.isPending}
                    onClick={() =>
                      upsert.mutate({
                        key: active.key,
                        title: editTitle,
                        bodyMarkdown: editBody,
                        tags: active.tags,
                      })
                    }
                  >
                    Save
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">Title</label>
                  <input
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium uppercase text-muted-foreground">
                    Body (Markdown)
                  </label>
                  <Textarea value={editBody} onChange={(e) => setEditBody(e.target.value)} rows={22} className="font-mono text-xs" />
                </div>
                <article className="prose prose-sm dark:prose-invert max-w-none rounded-md border bg-muted/20 p-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{editBody}</pre>
                </article>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center text-sm text-muted-foreground">Select a playbook</CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
