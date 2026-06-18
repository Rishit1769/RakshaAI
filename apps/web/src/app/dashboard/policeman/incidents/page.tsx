'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { buildIncidentPopupHtml } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/dashboard/DashboardPrimitives';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-[32rem] w-full" />,
});

export default function PolicemanIncidentsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [markers, setMarkers] = useState<MapMarker[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await api.get<Array<Record<string, unknown>>>('/incidents');
        setMarkers(
          (response.data ?? []).map((incident) => ({
            id: String(incident.id),
            latitude: Number(incident.latitude ?? 0),
            longitude: Number(incident.longitude ?? 0),
            type: 'incident' as const,
            pinColor: (incident.pinColor as 'white' | 'yellow' | 'red' | undefined) ?? 'white',
            popupHtml: buildIncidentPopupHtml({
              id: String(incident.id),
              type: String(incident.type ?? incident.category ?? 'incident'),
              description: String(incident.description ?? ''),
              score: Number(incident.score ?? 0),
              likes: Number(incident.likes ?? incident.upvoteCount ?? 0),
              comments: Number(incident.comments ?? 0),
            }),
          }))
        );
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load incident map.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Incident Map" subtitle="Community and operational incidents overlaid for response triage.">
      <SectionCard title="Nearby incident intelligence">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SafetyMap center={{ latitude: 20.5937, longitude: 78.9629 }} zoom={5} markers={markers} className="h-[calc(100vh-16rem)] min-h-[32rem] w-full" showLegend />
      </SectionCard>
    </AppShell>
  );
}
