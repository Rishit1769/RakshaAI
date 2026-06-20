'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { FieldShell, Input, Select } from '@/components/ui/field';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  isSeed: boolean;
  isSuspended: boolean;
  createdAt: string;
};

const ROLE_OPTIONS = ['SUPERADMIN', 'POLICE_DEPARTMENT', 'POLICEMAN', 'NGO', 'VOLUNTEER', 'user'];

export default function SuperadminUsersPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [rows, setRows] = useState<UserRow[]>([]);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchDraft, setSearchDraft] = useState('');
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<UserRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (role) params.set('role', role);
    if (status) params.set('status', status);
    if (search) params.set('search', search);
    return params;
  }, [page, role, search, status]);

  async function loadUsers() {
    try {
      const response = await adminApi.getUsers(query);
      const data = (response.data ?? {}) as { items?: UserRow[]; pagination?: { totalPages?: number } };
      setRows(data.items ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadUsers();
  }, [isAllowed, query]);

  async function handleRoleChange(userId: string, nextRole: string) {
    setBusyId(userId);
    setError('');
    try {
      await adminApi.updateUserRole(userId, nextRole);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update role.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSuspendToggle(row: UserRow) {
    setBusyId(row.id);
    setError('');
    try {
      await adminApi.toggleUserSuspension(row.id, !row.isSuspended);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update suspension state.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError('');
    try {
      await adminApi.deleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete user.');
    } finally {
      setBusyId(null);
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="User Management" subtitle="Search, filter, reassign roles, suspend accounts, and protect seeded records." showBack={false}>
      <div className="space-y-6">
        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Filters" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <FieldShell label="Search">
              <div className="flex gap-2">
                <Input value={searchDraft} onChange={(event) => setSearchDraft(event.target.value)} placeholder="Search by name or email" />
                <button type="button" className="btn-primary" onClick={() => { setPage(1); setSearch(searchDraft.trim()); }}>
                  Search
                </button>
              </div>
            </FieldShell>
            <FieldShell label="Role">
              <Select value={role} onChange={(event) => { setPage(1); setRole(event.target.value); }}>
                <option value="">All roles</option>
                {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </Select>
            </FieldShell>
            <FieldShell label="Status">
              <Select value={status} onChange={(event) => { setPage(1); setStatus(event.target.value); }}>
                <option value="">All statuses</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </Select>
            </FieldShell>
            <FieldShell label="Reset">
              <button type="button" className="btn-secondary w-full" onClick={() => { setPage(1); setRole(''); setStatus(''); setSearch(''); setSearchDraft(''); }}>
                Clear filters
              </button>
            </FieldShell>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          {error ? <div className="m-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
          <div className="overflow-x-auto">
            <table className="min-w-[1080px] w-full text-left text-sm">
              <thead className="bg-surface-soft/70">
                <tr>
                  {['Name', 'Email', 'Role', 'Status', 'Seed', 'Created At', 'Actions'].map((label) => (
                    <th key={label} className="px-5 py-4 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-hairline align-top hover:bg-primary/[0.03]">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{row.fullName}</p>
                    </td>
                    <td className="px-5 py-4 text-body">{row.email}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="eyebrow">{row.role}</span>
                        <select
                          value={row.role}
                          onChange={(event) => void handleRoleChange(row.id, event.target.value)}
                          disabled={busyId === row.id}
                          className="select-field min-h-10 w-44 py-2 text-sm"
                        >
                          {ROLE_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={row.isSuspended ? 'badge-emergency' : 'badge-safe'}>{row.isSuspended ? 'Suspended' : 'Active'}</span>
                    </td>
                    <td className="px-5 py-4">
                      {row.isSeed ? <span className="eyebrow">Seed</span> : <span className="text-muted">No</span>}
                    </td>
                    <td className="px-5 py-4 text-body">{new Date(row.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className={row.isSuspended ? 'btn-primary' : 'btn-secondary'} disabled={busyId === row.id} onClick={() => void handleSuspendToggle(row)}>
                          {row.isSuspended ? 'Unsuspend' : 'Suspend'}
                        </button>
                        <button type="button" className="btn-secondary" disabled={row.isSeed || busyId === row.id} onClick={() => setDeleteTarget(row)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-hairline px-5 py-4">
            <p className="text-sm text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        </Card>
      </div>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title="Delete user" description="Hard delete is only allowed for non-seed users. This can fail if related records still exist.">
        <div className="space-y-4">
          <p className="text-sm text-body">Delete <span className="font-semibold text-ink">{deleteTarget?.fullName}</span> permanently?</p>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleDelete()} disabled={!deleteTarget || busyId === deleteTarget.id}>
              Confirm delete
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
