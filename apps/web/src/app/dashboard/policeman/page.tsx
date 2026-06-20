'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { officerApi } from '@/lib/api/officer.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading hotspot preview..." className="h-[28rem] w-full" />,
});

type OverviewResponse = {
  assignment: { name: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; latitude: number; longitude: number; radiusMeters: number } | null;
  metrics: Array<{ label: string; value: string | number }>;
  map: {
    center: { latitude: number; longitude: number };
    radiusMeters: number;
    incidents: Array<{ id: string; latitude: number; longitude: number; severity: 'LOW' | 'MEDIUM' | 'HIGH'; type: string; status: string }>;
  } | null;
};

export default function PolicemanOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await officerApi.getOverview();
        setData((response.data ?? null) as OverviewResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load officer overview.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  const markers: MapMarker[] = (data?.map?.incidents ?? []).map((incident) => ({
    id: incident.id,
    latitude: incident.latitude,
    longitude: incident.longitude,
    type: 'incident',
    pinColor: incident.severity === 'HIGH' ? 'red' : incident.severity === 'MEDIUM' ? 'yellow' : 'white',
    popupHtml: `<div style="min-width:220px"><strong>${incident.type}</strong><br/><span>${incident.status}</span></div>`,
  }));

  return (
    <AppShell title="Officer Overview" subtitle="Assigned hotspot status, daily zone demand, and a quick operational map centered on your current coverage.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className={`surface-panel-modern ${data?.assignment ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
          <SectionBadge label="Assignment status" pulse={Boolean(data?.assignment)} />
          <h2 className="mt-5 text-2xl font-semibold text-ink">
            {data?.assignment ? `You are assigned to ${data.assignment.name}` : 'You are currently unassigned'}
          </h2>
          <p className="mt-2 text-sm leading-7 text-muted">
            {data?.assignment ? `Severity ${data.assignment.severity} hotspot with a ${Math.round(data.assignment.radiusMeters)}m zone radius.` : 'Contact your department to receive a hotspot assignment before responding to zone-scoped incidents.'}
          </p>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(data?.metrics ?? []).map((metric) => (
            <Card key={metric.label} className="metric-card">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">{metric.value}</p>
            </Card>
          ))}
        </section>

        {data?.map ? (
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Zone preview" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Assigned hotspot map</h2>
            <div className="mt-6">
              <SafetyMap
                center={data.map.center}
                zoom={13}
                markers={markers}
                radiusKm={data.map.radiusMeters / 1000}
                className="h-[28rem] w-full"
              />
            </div>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}
