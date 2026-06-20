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
  loading: () => <LoadingState label="Loading assigned hotspot..." className="h-[38rem] w-full" />,
});

type HotspotResponse = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: string;
  assignmentHistory: Array<{ id: string; action: string; hotspotName?: string | null; createdAt: string }>;
  incidents: Array<{ id: string; type: string; severity: 'LOW' | 'MEDIUM' | 'HIGH'; latitude: number; longitude: number; description: string; timestamp: string; status: string }>;
} | null;

export default function PolicemanHotspotPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [data, setData] = useState<HotspotResponse>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await officerApi.getHotspot();
        setData((response.data ?? null) as HotspotResponse);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load assigned hotspot.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  if (!data) {
    return (
      <AppShell title="My Hotspot" subtitle="Assigned hotspot detail for your current operational zone.">
        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="No assignment" />
          <h2 className="mt-5 text-2xl font-semibold text-ink">You have not been assigned to a hotspot yet.</h2>
          <p className="mt-2 text-sm text-muted">Contact your department for assignment before trying to monitor zone incidents from this page.</p>
        </Card>
      </AppShell>
    );
  }

  const markers: MapMarker[] = data.incidents.map((incident) => ({
    id: incident.id,
    latitude: incident.latitude,
    longitude: incident.longitude,
    type: 'incident',
    pinColor: incident.severity === 'HIGH' ? 'red' : incident.severity === 'MEDIUM' ? 'yellow' : 'white',
    popupHtml: `<div style="min-width:240px"><strong>${incident.type}</strong><br/><span>${incident.description}</span><br/><span>${new Date(incident.timestamp).toLocaleString()}</span><br/><span>${incident.status}</span></div>`,
  }));

  return (
    <AppShell title="My Hotspot" subtitle="Full hotspot detail, recent incidents inside the zone, and assignment history for your current coverage area.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Assigned zone" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">{data.name}</h2>
            <div className="mt-6">
              <SafetyMap center={{ latitude: data.latitude, longitude: data.longitude }} zoom={13} markers={markers} radiusKm={data.radiusMeters / 1000} className="h-[38rem] w-full" />
            </div>
          </Card>

          <div className="space-y-6">
            <Card padding="lg" className="surface-panel-modern">
              <SectionBadge label="Zone info" />
              <div className="mt-5 grid gap-3 text-sm text-body">
                <p>Name: <span className="font-medium text-ink">{data.name}</span></p>
                <p>Severity: <span className="font-medium text-ink">{data.severity}</span></p>
                <p>Radius: <span className="font-medium text-ink">{Math.round(data.radiusMeters)}m</span></p>
                <p>Total incidents: <span className="font-medium text-ink">{data.incidents.length}</span></p>
              </div>
            </Card>

            <Card padding="lg" className="surface-panel-modern">
              <SectionBadge label="Recent incidents" />
              <div className="mt-5 space-y-3">
                {data.incidents.slice(0, 5).map((incident) => (
                  <div key={incident.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4">
                    <p className="text-sm font-semibold text-ink">{incident.type}</p>
                    <p className="mt-1 text-sm text-muted">{incident.description}</p>
                    <p className="mt-2 text-xs text-muted">{new Date(incident.timestamp).toLocaleString()} • {incident.status}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
