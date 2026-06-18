'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MetricGrid, SectionCard, EmptyBlock } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function SuperadminOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [metrics, setMetrics] = useState<Array<{ label: string; value: number }>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await dashboardApi.getSuperadminOverview();
        setMetrics(response.data?.metrics ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load superadmin overview.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Superadmin Overview" subtitle="Global platform metrics across every response layer.">
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <MetricGrid items={metrics} />
        <SectionCard title="Control Center" subtitle="Use the sidebar to move between user governance, moderation, hotspot oversight, analytics, and audit visibility.">
          <EmptyBlock message="This overview is wired to live aggregate counts and serves as the launch point for the remaining superadmin pages." />
        </SectionCard>
      </div>
    </AppShell>
  );
}
