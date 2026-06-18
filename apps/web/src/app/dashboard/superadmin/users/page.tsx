'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export default function SuperadminUsersPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState('');

  async function loadUsers() {
    try {
      const response = await dashboardApi.getSuperadminUsers();
      setUsers((response.data ?? []) as unknown as UserRow[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadUsers();
  }, [isAllowed]);

  async function toggleUser(user: UserRow) {
    try {
      await dashboardApi.setUserStatus(user.id, !user.isActive);
      await loadUsers();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update user status.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="User Management" subtitle="View every account and suspend or reactivate access from one surface.">
      <SectionCard title="Accounts">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'email', label: 'Email' },
            { key: 'role', label: 'Role' },
            { key: 'status', label: 'Status' },
            { key: 'actions', label: 'Actions' },
          ]}
          rows={users.map((user) => ({
            name: user.fullName,
            email: user.email,
            role: user.role,
            status: user.isActive ? 'Active' : 'Suspended',
            actions: (
              <button className={user.isActive ? 'btn-secondary' : 'btn-primary'} onClick={() => void toggleUser(user)}>
                {user.isActive ? 'Suspend' : 'Reactivate'}
              </button>
            ),
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
