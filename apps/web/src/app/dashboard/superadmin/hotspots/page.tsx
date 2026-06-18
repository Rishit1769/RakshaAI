'use client';

import { useEffect, useState } from 'react';
import SafetyMap, { buildIncidentPopupHtml, type MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function SuperadminHotspotsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await dashboardApi.getHotspots();
        const items = (response.data ?? []) as Array<Record<string, unknown>>;
        setMarkers(
          items.map((item) => ({
            id: String(item.id),
            latitude: Number(item.latitude ?? 20.5937),
            longitude: Number(item.longitude ?? 78.9629),
            type: 'hotspot',
            label: String(item.title ?? item.city ?? 'Hotspot'),
            popupHtml: buildIncidentPopupHtml({
              id: String(item.id),
              type: String(item.category ?? 'hotspot'),
              description: String(item.city ?? ''),
              score: Number(item.riskScore ?? 0),
              likes: Number(item.reportCount ?? 0),
              comments: Number(item.verifiedCount ?? 0),
            }),
          }))
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load hotspots.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Hotspot Oversight" subtitle="View live hotspot intensity and officer assignment coverage.">
      <SectionCard title="All hotspots">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SafetyMap center={{ latitude: 20.5937, longitude: 78.9629 }} markers={markers} className="h-[34rem] w-full" showLegend />
      </SectionCard>
    </AppShell>
  );
}
