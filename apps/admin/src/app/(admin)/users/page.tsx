'use client';

import { useEffect, useState } from 'react';
import {
  Badge,
  Button,
  Card,
  CardContent,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormField,
  Input,
  LoadingState,
  PageHeader,
  StatusBadge,
  useToast,
} from '@goldspire/ui';
import { trpc } from '@/lib/trpc';

type UserRow = NonNullable<ReturnType<typeof trpc.users.list.useQuery>['data']>[number];

/** All assignable roles (excludes `CUSTOMER` which is for end-users — they
 * shouldn't be promoted from the admin console). */
const ASSIGNABLE_ROLES = ['MEMBER', 'TENANT_ADMIN', 'TENANT_OWNER'] as const;
const STATUSES = ['active', 'invited', 'suspended', 'archived'] as const;

export default function UsersPage() {
  const q = trpc.users.list.useQuery();
  const [selected, setSelected] = useState<UserRow | null>(null);

  if (q.isLoading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Everyone who has signed up to this tenant. Click any row to edit role, status, or display name."
      />

      <Card>
        <CardContent className="px-0 py-0">
          <DataTable
            rows={q.data ?? []}
            columns={[
              { key: 'name', header: 'Name', cell: (r) => r.name ?? '—' },
              { key: 'email', header: 'Email' },
              {
                key: 'role',
                header: 'Role',
                cell: (r) => (
                  <Badge variant="outline" className="font-mono text-[11px]">
                    {r.role}
                  </Badge>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (r) => <StatusBadge status={r.status} />,
              },
              {
                key: 'createdAt',
                header: 'Joined',
                cell: (r) => new Date(r.createdAt).toLocaleDateString(),
              },
              {
                key: 'manage',
                header: '',
                cell: (r) => (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(r);
                    }}
                  >
                    Manage
                  </Button>
                ),
              },
            ]}
            onRowClick={(r) => setSelected(r)}
          />
        </CardContent>
      </Card>

      <ManageUserDialog
        user={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function ManageUserDialog({
  user,
  onClose,
}: {
  user: UserRow | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const utils = trpc.useUtils();

  const [name, setName] = useState('');
  const [role, setRole] = useState<(typeof ASSIGNABLE_ROLES)[number]>('MEMBER');
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('active');

  useEffect(() => {
    if (!user) return;
    setName(user.name ?? '');
    setRole(
      (ASSIGNABLE_ROLES as readonly string[]).includes(user.role)
        ? (user.role as (typeof ASSIGNABLE_ROLES)[number])
        : 'MEMBER',
    );
    setStatus(
      (STATUSES as readonly string[]).includes(user.status)
        ? (user.status as (typeof STATUSES)[number])
        : 'active',
    );
  }, [user]);

  const updateMut = trpc.users.update.useMutation({
    onSuccess: () => {
      void utils.users.list.invalidate();
      toast({ title: 'User updated', tone: 'success' });
      onClose();
    },
    onError: (err) => {
      toast({ title: 'Update failed', description: err.message, tone: 'danger' });
    },
  });

  if (!user) return null;

  const dirty =
    name !== (user.name ?? '') ||
    role !== user.role ||
    status !== user.status;

  function handleSave() {
    if (!user) return;
    updateMut.mutate({
      id: user.id,
      name: name.trim() || undefined,
      role,
      status,
    });
  }

  function handleSuspendToggle() {
    if (!user) return;
    updateMut.mutate({
      id: user.id,
      status: user.status === 'suspended' ? 'active' : 'suspended',
    });
  }

  return (
    <Dialog open={user != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Manage {user.name ?? user.email}</DialogTitle>
          <DialogDescription>
            Update role, status, or display name. Every change writes to the audit log.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted/40 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Email:</span>{' '}
              <span className="font-mono">{user.email}</span>
            </div>
            <div>
              <span className="text-muted-foreground">User id:</span>{' '}
              <span className="font-mono text-[11px]">{user.id}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Joined:</span>{' '}
              {new Date(user.createdAt).toLocaleString()}
            </div>
          </div>

          <FormField label="Display name" htmlFor="name">
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>

          <FormField label="Role" htmlFor="role">
            <select
              id="role"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Status" htmlFor="status">
            <select
              id="status"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <DialogFooter className="flex-wrap justify-between gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSuspendToggle}
            disabled={updateMut.isPending}
          >
            {user.status === 'suspended' ? 'Reactivate' : 'Suspend account'}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={updateMut.isPending}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!dirty || updateMut.isPending}>
              {updateMut.isPending ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
