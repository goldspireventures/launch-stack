'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { studioDocViewHref, normalizeDocPath, getStudioDocByPath } from '@goldspire/commercial';

function resolveMdHref(href: string | undefined, basePath: string): string | undefined {
  if (!href) return href;
  if (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('#')) return href;

  let target = href;
  if (target.startsWith('./') || target.startsWith('../')) {
    const parts = basePath.split('/').slice(0, -1);
    for (const seg of target.split('/')) {
      if (seg === '..') parts.pop();
      else if (seg !== '.' && seg) parts.push(seg);
    }
    target = parts.join('/');
  }
  target = normalizeDocPath(target);

  if (target.endsWith('.md') && getStudioDocByPath(target)) {
    return studioDocViewHref(target);
  }
  return href;
}

export function StudioDocMarkdown({
  markdown,
  basePath,
}: {
  markdown: string;
  /** Current doc path for resolving relative links */
  basePath: string;
}) {
  const baseDir = basePath.includes('/') ? basePath.replace(/\/[^/]+$/, '/') : '';

  return (
    <article className="studio-doc-prose max-w-none text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children, ...props }) => {
            const resolved = resolveMdHref(href, basePath) ?? href;
            if (resolved?.startsWith('/docs/')) {
              return (
                <Link href={resolved} className="text-primary underline-offset-2 hover:underline" {...props}>
                  {children}
                </Link>
              );
            }
            return (
              <a href={resolved} className="text-primary underline-offset-2 hover:underline" {...props}>
                {children}
              </a>
            );
          },
          h1: ({ children }) => (
            <h1 className="mb-4 mt-8 text-2xl font-semibold tracking-tight first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-3 mt-6 border-b border-border/60 pb-2 text-lg font-semibold">{children}</h2>
          ),
          h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>,
          p: ({ children }) => <p className="mb-3 text-muted-foreground">{children}</p>,
          ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-muted-foreground">{children}</ul>,
          ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-muted-foreground">{children}</ol>,
          li: ({ children }) => <li className="text-sm">{children}</li>,
          code: ({ children, className }) => {
            const inline = !className;
            if (inline) {
              return (
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">{children}</code>
              );
            }
            return (
              <code className="block overflow-x-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px]">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-4 overflow-x-auto rounded-md border bg-muted/30 p-0">{children}</pre>,
          table: ({ children }) => (
            <div className="mb-4 overflow-x-auto rounded-md border">
              <table className="w-full text-left text-xs">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="border-b bg-muted/50 px-3 py-2 font-medium">{children}</th>,
          td: ({ children }) => <td className="border-b border-border/40 px-3 py-2">{children}</td>,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
