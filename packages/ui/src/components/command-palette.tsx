'use client';

import * as React from 'react';
import { Command } from 'cmdk';
import * as Dialog from '@radix-ui/react-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';

/**
 * Global command palette.
 *
 * Opens with Cmd+K (Mac) or Ctrl+K (Win/Linux). Esc closes. Vim-flavored
 * arrow nav handled by `cmdk` under the hood.
 *
 * Items are passed in by the consumer — the palette doesn't know about
 * tenants or flags, only how to render a flat searchable list. The Console
 * app provides one set of items (cross-tenant), Admin provides another
 * (tenant-scoped). This is by design: each app owns its own item providers
 * so the palette stays a pure UI primitive.
 */

export interface CommandItem {
  id: string;
  label: string;
  /** Optional helper text shown to the right of the label. */
  hint?: string;
  /** Section header to group the item under. */
  group?: string;
  /** Lucide icon (or any React node). */
  icon?: LucideIcon | React.ReactNode;
  /** Keywords for fuzzy search (in addition to label). */
  keywords?: string[];
  /** Called when the item is selected. Palette closes afterwards. */
  onSelect: () => void;
}

export interface CommandPaletteProps {
  items: CommandItem[];
  /** Override default placeholder. */
  placeholder?: string;
  /** Override default empty state text. */
  emptyText?: string;
}

export function CommandPalette({
  items,
  placeholder = 'Search tenants, pages, flags…',
  emptyText = 'No matches.',
}: CommandPaletteProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');
      const meta = isMac ? e.metaKey : e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((s) => !s);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Group items by `group` while preserving original order.
  const grouped = React.useMemo(() => {
    const out = new Map<string, CommandItem[]>();
    for (const it of items) {
      const g = it.group ?? '';
      if (!out.has(g)) out.set(g, []);
      out.get(g)!.push(it);
    }
    return Array.from(out.entries());
  }, [items]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <AnimatePresence>
        {open && (
          <Dialog.Portal forceMount>
            <Dialog.Overlay asChild>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.12 }}
                className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
              />
            </Dialog.Overlay>
            <Dialog.Content asChild>
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                className="fixed left-1/2 top-[18%] z-50 w-[min(600px,calc(100vw-32px))] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl outline-none"
              >
                <Dialog.Title className="sr-only">Command palette</Dialog.Title>
                <Command label="Command palette" loop>
                  <div className="flex items-center gap-2 border-b border-border px-4 py-3">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Command.Input
                      placeholder={placeholder}
                      className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                    <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
                      esc
                    </kbd>
                  </div>
                  <Command.List className="max-h-[400px] overflow-y-auto px-2 py-2">
                    <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                      {emptyText}
                    </Command.Empty>
                    {grouped.map(([groupName, groupItems]) => (
                      <Command.Group
                        key={groupName || 'ungrouped'}
                        heading={groupName || undefined}
                        className={cn(
                          'mb-1',
                          '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-muted-foreground',
                        )}
                      >
                        {groupItems.map((it) => (
                          <Command.Item
                            key={it.id}
                            value={`${groupName} ${it.label} ${it.hint ?? ''} ${(it.keywords ?? []).join(' ')}`}
                            onSelect={() => {
                              it.onSelect();
                              setOpen(false);
                            }}
                            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-sm transition-colors data-[selected=true]:bg-muted"
                          >
                            <IconSlot icon={it.icon} />
                            <span className="flex-1 truncate">{it.label}</span>
                            {it.hint && (
                              <span className="truncate text-xs text-muted-foreground">{it.hint}</span>
                            )}
                          </Command.Item>
                        ))}
                      </Command.Group>
                    ))}
                  </Command.List>
                  <div className="border-t border-border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
                    <span className="font-mono">↑↓</span> to navigate ·{' '}
                    <span className="font-mono">enter</span> to select ·{' '}
                    <span className="font-mono">esc</span> to close
                  </div>
                </Command>
              </motion.div>
            </Dialog.Content>
          </Dialog.Portal>
        )}
      </AnimatePresence>
    </Dialog.Root>
  );
}

function IconSlot({ icon }: { icon?: CommandItem['icon'] }) {
  if (!icon) return <span className="h-4 w-4 shrink-0" aria-hidden />;
  if (typeof icon === 'function') {
    const Icon = icon as LucideIcon;
    return <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />;
  }
  return <span className="grid h-4 w-4 shrink-0 place-items-center text-muted-foreground">{icon as React.ReactNode}</span>;
}
