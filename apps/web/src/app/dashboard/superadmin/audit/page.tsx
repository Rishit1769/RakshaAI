'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function SuperadminAuditPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await dashboardApi.getAuditLogs();
        setLogs(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load audit logs.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Audit Log" subtitle="Administrative actions across hierarchy creation, status changes, and field operations.">
      <SectionCard title="Recent actions">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[
            { key: 'actor', label: 'Actor' },
            { key: 'action', label: 'Action' },
            { key: 'entity', label: 'Entity' },
            { key: 'when', label: 'When' },
          ]}
          rows={logs.map((log) => ({
            actor: String((log.actor as Record<string, unknown> | undefined)?.fullName ?? 'System'),
            action: String(log.action ?? ''),
            entity: `${String(log.entityType ?? '')} ${String(log.entityId ?? '')}`.trim(),
            when: new Date(String(log.createdAt ?? '')).toLocaleString(),
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
