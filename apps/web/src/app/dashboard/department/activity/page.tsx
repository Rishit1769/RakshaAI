'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function DepartmentActivityPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [activity, setActivity] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getDepartmentActivity();
        setActivity(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load department activity.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Department Activity" subtitle="Recent department and officer activity drawn from the audit stream.">
      <SectionCard title="Latest activity">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[{ key: 'actor', label: 'Actor' }, { key: 'action', label: 'Action' }, { key: 'target', label: 'Target' }, { key: 'time', label: 'Timestamp' }]}
          rows={activity.map((item) => ({
            actor: String((item.actor as Record<string, unknown> | undefined)?.fullName ?? 'Unknown'),
            action: String(item.action ?? 'Unknown'),
            target: String(item.entityType ?? 'Unknown'),
            time: new Date(String(item.createdAt ?? '')).toLocaleString(),
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
