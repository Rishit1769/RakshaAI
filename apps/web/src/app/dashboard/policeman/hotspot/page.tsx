'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function PolicemanHotspotPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [hotspots, setHotspots] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getPolicemanHotspot();
        setHotspots(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load hotspot data.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Assigned Hotspots" subtitle="Detailed hotspot context for this officer's current coverage.">
      <SectionCard title="Hotspot queue">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[{ key: 'title', label: 'Hotspot' }, { key: 'category', label: 'Category' }, { key: 'city', label: 'City' }, { key: 'reports', label: 'Reports' }, { key: 'risk', label: 'Risk' }]}
          rows={hotspots.map((item) => ({
            title: String(item.title ?? 'Untitled'),
            category: String(item.category ?? 'unknown'),
            city: String(item.city ?? 'Unknown'),
            reports: String(item.reportCount ?? 0),
            risk: String(item.riskScore ?? 0),
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
