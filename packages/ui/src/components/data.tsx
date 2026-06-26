'use client';

import * as React from 'react';
import { AlertCircle, Inbox, Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../utils/cn';
import { Badge, type BadgeProps, Card, CardContent } from './primitives';

/* ─── StatusBadge ─────────────────────────────────────────────────────── */

type StatusKind =
  | 'active'
  | 'trial'
  | 'inactive'
  | 'archived'
  | 'pending'
  | 'success'
  | 'failed'
  | 'warning'
  | 'live'
  | 'draft'
  | 'staging'
  | 'paused'
  | 'suspended'
  | 'past_due'
  | 'open'
  | 'investigating'
  | 'resolved'
  | 'dismissed'
  | 'canceled'
  | 'completed';

const STATUS_TO_VARIANT: Record<StatusKind, BadgeProps['variant']> = {
  active: 'success',
  live: 'success',
  success: 'success',
  trial: 'default',
  pending: 'secondary',
  draft: 'secondary',
  staging: 'secondary',
  inactive: 'outline',
  archived: 'outline',
  paused: 'outline',
  failed: 'destructive',
  suspended: 'destructive',
  past_due: 'destructive',
  warning: 'warning',
  open: 'warning',
  investigating: 'warning',
  resolved: 'success',
  dismissed: 'outline',
  canceled: 'destructive',
  completed: 'success',
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const variant = STATUS_TO_VARIANT[status as StatusKind] ?? 'outline';
  return (
    <Badge variant={variant} className={cn('capitalize', className)}>
      {status.replace(/_/g, ' ')}
    </Badge>
  );
}

/* ─── MetricCard ──────────────────────────────────────────────────────── */

export interface MetricCardProps {
  label: string;
  value: string | number;
  /** Optional delta line, e.g. "+12% vs last week" */
  delta?: { value: string; trend: 'up' | 'down' | 'flat' };
  icon?: LucideIcon;
  href?: string;
  /** Makes the card a button (use instead of href for in-page actions). */
  onClick?: () => void;
  className?: string;
}

export function MetricCard({ label, value, delta, icon: Icon, href, onClick, className }: MetricCardProps) {
  const inner = (
    <Card
      className={cn(
        'transition-colors',
        (href || onClick) && 'hover:bg-muted/40',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      <CardContent className="flex items-start justify-between p-6">
        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-semibold tracking-tight">{value}</p>
          {delta && (
            <p
              className={cn(
                'text-xs',
                delta.trend === 'up' && 'text-success',
                delta.trend === 'down' && 'text-destructive',
                delta.trend === 'flat' && 'text-muted-foreground',
              )}
            >
              {delta.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="rounded-md bg-primary/10 p-2 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  if (href) {
    return (
      <a href={href} className="block focus:outline-none">
        {inner}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="block w-full text-left focus:outline-none">
        {inner}
      </button>
    );
  }
  return inner;
}

/* ─── DataTable (lightweight, no external deps) ───────────────────────── */

export interface Column<T> {
  key: keyof T | string;
  header: string;
  className?: string;
  cell?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
}

export interface DataTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  empty?: React.ReactNode;
  /** Row key resolver. Falls back to `row.id` if the row has one, else array index. */
  rowKey?: (row: T) => string | number;
  className?: string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>(props: DataTableProps<T>) {
  if (props.rows.length === 0) {
    return (
      <Card className={cn(props.className)}>
        <CardContent className="py-12">
          {props.empty ?? <EmptyState icon={Inbox} title="No data yet" />}
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className={cn('overflow-hidden', props.className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              {props.columns.map((c) => (
                <th
                  key={String(c.key)}
                  className={cn(
                    'px-4 py-3 text-left font-medium',
                    c.align === 'right' && 'text-right',
                    c.align === 'center' && 'text-center',
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {props.rows.map((row, idx) => {
              const key = props.rowKey
                ? props.rowKey(row)
                : ((row as { id?: string | number }).id ?? idx);
              return (
                <tr
                  key={key}
                  className={cn(
                    'transition-colors hover:bg-muted/20',
                    props.onRowClick && 'cursor-pointer',
                  )}
                  onClick={props.onRowClick ? () => props.onRowClick?.(row) : undefined}
                >
                  {props.columns.map((c) => (
                    <td
                      key={String(c.key)}
                      className={cn(
                        'px-4 py-3 align-middle',
                        c.align === 'right' && 'text-right',
                        c.align === 'center' && 'text-center',
                        c.className,
                      )}
                    >
                      {c.cell ? c.cell(row) : ((row as Record<string, unknown>)[String(c.key)] as React.ReactNode)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* ─── EmptyState / LoadingState / ErrorState ──────────────────────────── */

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center', className)}>
      <div className="mb-4 rounded-full border bg-muted/30 p-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="font-medium">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive">
        <AlertCircle className="h-6 w-6" />
      </div>
      <h3 className="font-medium">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
