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
  loading: () => <LoadingState label="Loading incident map..." className="h-[38rem] w-full" />,
});

type Incident = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  timestamp: string;
  description: string;
  distanceKm: number;
};

export default function VolunteerIncidentMapPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [days, setDays] = useState(7);
  const [severity, setSeverity] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await volunteerDashboardApi.getIncidentMap(days);
        setIncidents((response.data ?? []) as Incident[]);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load volunteer incident map.');
      }
    })();
  }, [isAllowed, days]);

  const filtered = useMemo(
    () => incidents.filter((incident) => severity === 'ALL' || incident.severity === severity),
    [incidents, severity]
  );
  const selectedIncident = filtered.find((incident) => incident.id === selectedId) ?? filtered[0] ?? null;
  const markers: MapMarker[] = filtered.map((incident) => ({
    id: incident.id,
    latitude: incident.latitude,
    longitude: incident.longitude,
    type: 'incident',
    pinColor: incident.severity === 'HIGH' ? 'red' : incident.severity === 'MEDIUM' ? 'yellow' : 'white',
    popupHtml: `<div style="min-width:240px"><strong>${incident.type}</strong><br/><span>${incident.description}</span><br/><span>${new Date(incident.timestamp).toLocaleString()}</span><br/><span>${incident.distanceKm.toFixed(1)}km away</span></div>`,
  }));

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Incident Map" subtitle="Read-only incident awareness map for open reports near your NGO coverage area, filtered by severity and recent activity window.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionBadge label="Incident awareness" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Open incidents near your NGO coverage</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="input-base h-11 rounded-xl border border-border bg-white px-4 text-sm text-ink" value={severity} onChange={(event) => setSeverity(event.target.value as 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH')}>
                <option value="ALL">All severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <select className="input-base h-11 rounded-xl border border-border bg-white px-4 text-sm text-ink" value={days} onChange={(event) => setDays(Number(event.target.value))}>
                <option value={1}>Last 1 day</option>
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SafetyMap center={selectedIncident ? { latitude: selectedIncident.latitude, longitude: selectedIncident.longitude } : { latitude: 20.5937, longitude: 78.9629 }} zoom={12} markers={markers} className="h-[38rem] w-full" />
            <div className="space-y-4 overflow-y-auto pr-2 xl:max-h-[38rem]">
              {filtered.map((incident) => (
                <button key={incident.id} type="button" className={`w-full rounded-[1.35rem] border p-4 text-left transition-all ${selectedIncident?.id === incident.id ? 'border-primary bg-primary/5 shadow-accent' : 'border-border/70 bg-white hover:-translate-y-0.5 hover:shadow-soft'}`} onClick={() => setSelectedId(incident.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{incident.type}</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${incident.severity === 'HIGH' ? 'bg-red-50 text-red-600' : incident.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted">{incident.description}</p>
                  <p className="mt-2 text-xs text-muted">{new Date(incident.timestamp).toLocaleString()} • {incident.distanceKm.toFixed(1)}km away</p>
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
