'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { volunteerDashboardApi } from '@/lib/api/volunteer-dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading zone awareness map..." className="h-[36rem] w-full" />,
});

type Zone = {
  id: string;
  name: string;
  type: 'SAFE' | 'RED';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  description: string;
};

export default function VolunteerZonesPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [zones, setZones] = useState<Zone[]>([]);
  const [showSafe, setShowSafe] = useState(true);
  const [showRed, setShowRed] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await volunteerDashboardApi.getZones();
        setZones((response.data ?? []) as Zone[]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load volunteer zone map.');
      }
    })();
  }, [isAllowed]);

  const filtered = useMemo(
    () => zones.filter((zone) => (zone.type === 'SAFE' ? showSafe : showRed)),
    [zones, showSafe, showRed]
  );

  const markers: MapMarker[] = filtered.map((zone) => ({
    id: zone.id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    type: 'safe_zone',
    markerColor: zone.type === 'SAFE' ? '#16a34a' : '#dc2626',
    markerText: zone.type,
    popupHtml: `<div style="min-width:220px"><strong>${zone.name}</strong><br/><span>${zone.description || 'No description'}</span><br/><span>${Math.round(zone.radiusMeters)}m radius</span></div>`,
  }));

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SafeZone Map" subtitle="Read-only zone awareness so you can understand dangerous areas and support locations before heading into the field.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <div className="flex items-center justify-between gap-4">
              <SectionBadge label="Zone awareness" pulse />
              <div className="flex gap-2">
                <button type="button" className={`btn-secondary ${showSafe ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : ''}`} onClick={() => setShowSafe((value) => !value)}>
                  {showSafe ? 'Hide SafeZones' : 'Show SafeZones'}
                </button>
                <button type="button" className={`btn-secondary ${showRed ? 'border-red-200 bg-red-50 text-red-700' : ''}`} onClick={() => setShowRed((value) => !value)}>
                  {showRed ? 'Hide RedZones' : 'Show RedZones'}
                </button>
              </div>
            </div>
            <div className="mt-6">
              <SafetyMap center={filtered[0] ? { latitude: filtered[0].latitude, longitude: filtered[0].longitude } : { latitude: 20.5937, longitude: 78.9629 }} zoom={11} markers={markers} className="h-[36rem] w-full" showLegend />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Zone list" />
            <div className="mt-5 space-y-3 overflow-y-auto pr-2 xl:max-h-[36rem]">
              {filtered.map((zone) => (
                <div key={zone.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{zone.name}</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${zone.type === 'SAFE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {zone.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{zone.description || 'No description available.'}</p>
                  <p className="mt-2 text-xs text-muted">Radius: {Math.round(zone.radiusMeters)}m</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
