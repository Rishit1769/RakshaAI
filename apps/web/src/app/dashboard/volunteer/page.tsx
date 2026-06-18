'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricGrid, SectionCard, EmptyBlock } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function VolunteerOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getVolunteerOverview();
        setData((response.data ?? {}) as Record<string, unknown>);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load volunteer overview.');
      }
    })();
  }, [isAllowed]);

  const metrics = (data.metrics as Array<{ label: string; value: number }> | undefined) ?? [];
  const profile = (data.profile as Record<string, unknown> | undefined) ?? {};

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Volunteer Overview" subtitle={`Support workspace for ${String(profile.fullName ?? 'field volunteer')}.`}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <MetricGrid items={metrics} />
        <SectionCard title="Volunteer workflow">
          <EmptyBlock message="Use the sidebar to move between live alerts, assigned cases, nearby support maps, check-ins, and safe zone visibility." />
        </SectionCard>
      </div>
    </AppShell>
  );
}
