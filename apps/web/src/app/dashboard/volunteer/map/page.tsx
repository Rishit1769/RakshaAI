'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-[32rem] w-full" />,
});

export default function VolunteerMapPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const [zonesResponse, alertsResponse] = await Promise.all([
          api.get<Array<Record<string, unknown>>>('/zones'),
          api.get<Array<Record<string, unknown>>>('/volunteers/alerts'),
        ]);

        const zoneMarkers = (zonesResponse.data ?? []).map((zone) => ({
          id: `zone-${String(zone.id)}`,
          latitude: Number(zone.latitude ?? 0),
          longitude: Number(zone.longitude ?? 0),
          type: 'safe_zone' as const,
          label: String(zone.name ?? 'Safe zone'),
        }));

        const alertMarkers = (alertsResponse.data ?? []).map((alert) => ({
          id: `alert-${String(alert.id)}`,
          latitude: Number(alert.triggerLatitude ?? 0),
          longitude: Number(alert.triggerLongitude ?? 0),
          type: 'alert' as const,
          label: String(alert.alertCode ?? 'SOS'),
          popupHtml: `<strong>${String(alert.alertCode ?? 'SOS')}</strong><br/>${String(alert.triggerAddress ?? 'Location unavailable')}`,
        }));

        setMarkers([...zoneMarkers, ...alertMarkers].filter((item) => item.latitude && item.longitude));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load volunteer map.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Volunteer Map" subtitle="Case-adjacent map with nearby alert and zone context.">
      <div className="space-y-4">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SafetyMap center={{ latitude: 20.5937, longitude: 78.9629 }} zoom={5} markers={markers} className="h-[calc(100vh-12rem)] min-h-[32rem] w-full" showPoliceStations />
      </div>
    </AppShell>
  );
}
