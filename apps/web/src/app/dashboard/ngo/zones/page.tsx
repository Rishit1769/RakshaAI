'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ngoApi } from '@/lib/api/ngo.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading awareness map..." className="h-[36rem] w-full" />,
});

type Zone = {
  id: string;
  name: string;
  type: 'SAFE' | 'RED';
  latitude: number;
  longitude: number;
  radiusMeters: number;
  createdBy: string;
};

export default function NgoZonesPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [zones, setZones] = useState<Zone[]>([]);
  const [showSafe, setShowSafe] = useState(true);
  const [showRed, setShowRed] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await ngoApi.getZones();
        setZones((response.data ?? []) as Zone[]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load visible zones.');
      }
    })();
  }, [isAllowed]);

  const filteredZones = useMemo(
    () => zones.filter((zone) => (zone.type === 'SAFE' ? showSafe : showRed)),
    [zones, showSafe, showRed]
  );

  const markers: MapMarker[] = filteredZones.map((zone) => ({
    id: zone.id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    type: 'safe_zone',
    markerColor: zone.type === 'SAFE' ? '#16a34a' : '#dc2626',
    markerText: zone.type,
    popupHtml: `<div style="min-width:220px"><strong>${zone.name}</strong><br/><span>${zone.type} zone</span><br/><span>Radius: ${Math.round(zone.radiusMeters)}m</span><br/><span>Created by ${zone.createdBy}</span></div>`,
  }));

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SafeZone Awareness" subtitle="Read-only situational awareness for SafeZones and RedZones created by police departments, so volunteer deployment stays informed.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionBadge label="Awareness map" pulse />
                <h2 className="mt-5 text-xl font-semibold text-ink">Visible SafeZones and RedZones</h2>
              </div>
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
              <SafetyMap center={filteredZones[0] ? { latitude: filteredZones[0].latitude, longitude: filteredZones[0].longitude } : { latitude: 20.5937, longitude: 78.9629 }} zoom={11} markers={markers} className="h-[36rem] w-full" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Zone list" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Visible zones</h2>
            <div className="mt-6 space-y-3 overflow-y-auto pr-2 xl:max-h-[36rem]">
              {filteredZones.map((zone) => (
                <div key={zone.id} className="rounded-[1.35rem] border border-border/70 bg-white/95 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{zone.name}</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${zone.type === 'SAFE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                      {zone.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">Radius: {Math.round(zone.radiusMeters)}m</p>
                  <p className="mt-1 text-sm text-muted">Created by {zone.createdBy}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
