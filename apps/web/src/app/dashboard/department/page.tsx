'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricGrid, SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function DepartmentOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await dashboardApi.getDepartmentOverview();
        setData((response.data ?? {}) as Record<string, unknown>);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load department overview.');
      }
    })();
  }, [isAllowed]);

  const metrics = ((data.metrics as Array<{ label: string; value: number }> | undefined) ?? []);
  const recentAssignments = ((data.recentAssignments as Array<Record<string, unknown>> | undefined) ?? []);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Police Department Overview" subtitle="Department-level metrics, assignments, and operational readiness.">
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <MetricGrid items={metrics} />
        <SectionCard title="Recent hotspot assignments">
          <SimpleTable
            columns={[{ key: 'title', label: 'Hotspot' }, { key: 'city', label: 'City' }, { key: 'risk', label: 'Risk' }, { key: 'assigned', label: 'Assigned officer' }]}
            rows={recentAssignments.map((item) => ({
              title: String(item.title ?? 'Untitled'),
              city: String(item.city ?? 'Unknown'),
              risk: String(item.riskScore ?? 0),
              assigned: String(((item.assignedPoliceman as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined)?.fullName ?? 'Unassigned'),
            }))}
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
