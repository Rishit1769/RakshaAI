'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function SuperadminAnalyticsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await dashboardApi.getAnalytics();
        setData((response.data ?? {}) as Record<string, unknown>);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load analytics.');
      }
    })();
  }, [isAllowed]);

  const alertsByStatus = (data.alertsByStatus as Array<Record<string, unknown>> | undefined) ?? [];
  const alertsByType = (data.alertsByType as Array<Record<string, unknown>> | undefined) ?? [];

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Platform Analytics" subtitle="Live SOS and report distribution across the system.">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Alerts by status">
          {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
          <SimpleTable columns={[{ key: 'status', label: 'Status' }, { key: 'count', label: 'Count' }]} rows={alertsByStatus.map((item) => ({ status: String(item.status ?? ''), count: String((item._count as Record<string, unknown> | undefined)?.status ?? 0) }))} />
        </SectionCard>
        <SectionCard title="Alerts by type">
          <SimpleTable columns={[{ key: 'type', label: 'Alert type' }, { key: 'count', label: 'Count' }]} rows={alertsByType.map((item) => ({ type: String(item.alertType ?? ''), count: String((item._count as Record<string, unknown> | undefined)?.alertType ?? 0) }))} />
        </SectionCard>
      </div>
    </AppShell>
  );
}
