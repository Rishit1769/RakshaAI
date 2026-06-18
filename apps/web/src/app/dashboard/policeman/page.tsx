'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricGrid, SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function PolicemanOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getPolicemanOverview();
        setData((response.data ?? {}) as Record<string, unknown>);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load policeman overview.');
      }
    })();
  }, [isAllowed]);

  const metrics = (data.metrics as Array<{ label: string; value: number }> | undefined) ?? [];
  const hotspots = (data.hotspots as Array<Record<string, unknown>> | undefined) ?? [];
  const profile = (data.profile as Record<string, unknown> | undefined) ?? {};

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Policeman Overview" subtitle={`Operational view for ${String(profile.fullName ?? 'assigned officer')}.`}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <MetricGrid items={metrics} />
        <SectionCard title="Assigned hotspots">
          <SimpleTable
            columns={[{ key: 'title', label: 'Hotspot' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'risk', label: 'Risk' }]}
            rows={hotspots.map((item) => ({
              title: String(item.title ?? 'Untitled'),
              city: String(item.city ?? 'Unknown'),
              state: String(item.state ?? 'Unknown'),
              risk: String(item.riskScore ?? 0),
            }))}
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
