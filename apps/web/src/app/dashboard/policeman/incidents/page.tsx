'use client';

import { useEffect, useMemo, useState } from 'react';
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
  loading: () => <LoadingState label="Loading incident map..." className="h-[38rem] w-full" />,
});

type Incident = {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  latitude: number;
  longitude: number;
  description: string;
  pinScore: number;
  timestamp: string;
  status: 'OPEN' | 'RESOLVED';
};

export default function PolicemanIncidentsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [radius, setRadius] = useState(5);
  const [severity, setSeverity] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [status, setStatus] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load(nextRadius = radius) {
    try {
      const response = await officerApi.getIncidents(nextRadius);
      setIncidents((response.data ?? []) as Incident[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load nearby incidents.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load(radius);
  }, [isAllowed, radius]);

  const filtered = useMemo(
    () =>
      incidents.filter((incident) => {
        const matchesSeverity = severity === 'ALL' || incident.severity === severity;
        const matchesStatus = status === 'ALL' || incident.status === status;
        return matchesSeverity && matchesStatus;
      }),
    [incidents, severity, status]
  );

  const selectedIncident = filtered.find((incident) => incident.id === selectedId) ?? filtered[0] ?? null;
  const markers: MapMarker[] = filtered.map((incident) => ({
    id: incident.id,
    latitude: incident.latitude,
    longitude: incident.longitude,
    type: 'incident',
    pinColor: incident.severity === 'HIGH' ? 'red' : incident.severity === 'MEDIUM' ? 'yellow' : 'white',
    popupHtml: `<div style="min-width:240px"><strong>${incident.type}</strong><br/><span>${incident.description}</span><br/><span>Score: ${incident.pinScore}</span><br/><span>${new Date(incident.timestamp).toLocaleString()}</span><br/><span>${incident.status}</span></div>`,
  }));

  async function resolveIncident(id: string) {
    try {
      await officerApi.resolveIncident(id);
      await load(radius);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to resolve incident.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Nearby Incidents" subtitle="Radius-based incident map for your assigned zone, with status filters and direct resolve actions for eligible reports.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionBadge label="Incident filters" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Nearby incident intelligence</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="input-base h-11 rounded-xl border border-border bg-white px-4 text-sm text-ink" value={severity} onChange={(event) => setSeverity(event.target.value as 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH')}>
                <option value="ALL">All severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <select className="input-base h-11 rounded-xl border border-border bg-white px-4 text-sm text-ink" value={status} onChange={(event) => setStatus(event.target.value as 'ALL' | 'OPEN' | 'RESOLVED')}>
                <option value="ALL">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <label className="block">
              <span className="mb-2 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Radius: {radius}km</span>
              <input type="range" min={1} max={20} value={radius} onChange={(event) => setRadius(Number(event.target.value))} className="w-full" />
            </label>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SafetyMap center={selectedIncident ? { latitude: selectedIncident.latitude, longitude: selectedIncident.longitude } : { latitude: 20.5937, longitude: 78.9629 }} zoom={13} markers={markers} className="h-[38rem] w-full" />

            <div className="space-y-4 overflow-y-auto pr-2 xl:max-h-[38rem]">
              {filtered.map((incident) => (
                <button key={incident.id} type="button" className={`w-full rounded-[1.4rem] border p-4 text-left transition-all ${selectedIncident?.id === incident.id ? 'border-primary bg-primary/5 shadow-accent' : 'border-border/70 bg-white hover:-translate-y-0.5 hover:shadow-soft'}`} onClick={() => setSelectedId(incident.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{incident.type}</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${incident.severity === 'HIGH' ? 'bg-red-50 text-red-600' : incident.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted">{incident.description}</p>
                  <div className="mt-4 grid gap-1 text-xs text-muted">
                    <span>Score: {incident.pinScore}</span>
                    <span>{new Date(incident.timestamp).toLocaleString()}</span>
                    <span>Status: {incident.status}</span>
                  </div>
                  {incident.status === 'OPEN' ? (
                    <button type="button" className="btn-secondary mt-4 min-h-10 px-3 py-2" onClick={(event) => { event.stopPropagation(); void resolveIncident(incident.id); }}>
                      Resolve
                    </button>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
