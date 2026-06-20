'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { departmentApi } from '@/lib/api/department.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading incident map..." className="h-[40rem] w-full" />,
});

type Incident = {
  id: string;
  latitude: number;
  longitude: number;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  reporterName: string;
  timestamp: string;
  pinScore: number;
  status: 'OPEN' | 'RESOLVED';
  description: string;
};

export default function DepartmentIncidentMapPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'RESOLVED'>('ALL');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await departmentApi.getIncidents();
      setIncidents((response.data ?? []) as Incident[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load the incident map.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  const filteredIncidents = useMemo(
    () =>
      incidents.filter((incident) => {
        const matchesSeverity = severityFilter === 'ALL' || incident.severity === severityFilter;
        const matchesStatus = statusFilter === 'ALL' || incident.status === statusFilter;
        return matchesSeverity && matchesStatus;
      }),
    [incidents, severityFilter, statusFilter]
  );

  const selectedIncident = filteredIncidents.find((incident) => incident.id === selectedId) ?? filteredIncidents[0] ?? null;
  const markers: MapMarker[] = filteredIncidents.map((incident) => ({
    id: incident.id,
    latitude: incident.latitude,
    longitude: incident.longitude,
    type: 'incident',
    pinColor: incident.severity === 'HIGH' ? 'red' : incident.severity === 'MEDIUM' ? 'yellow' : 'white',
    popupHtml: `<div style="min-width:240px"><strong>${incident.type}</strong><br/><span>${incident.reporterName}</span><br/><span>${new Date(incident.timestamp).toLocaleString()}</span><br/><span>Status: ${incident.status}</span><br/><span>Score: ${incident.pinScore}</span></div>`,
  }));

  async function resolveIncident(id: string) {
    try {
      await departmentApi.resolveIncident(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to resolve the incident.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Incident Map" subtitle="Review all community incidents that fall within your current hotspots and department zones, then resolve them from a single map-driven workflow.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionBadge label="Mapped incident feed" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Severity-filtered incident pins</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <select className="input-base h-11 rounded-xl border border-border bg-white px-4 text-sm text-ink" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as 'ALL' | 'LOW' | 'MEDIUM' | 'HIGH')}>
                <option value="ALL">All severities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
              <select className="input-base h-11 rounded-xl border border-border bg-white px-4 text-sm text-ink" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as 'ALL' | 'OPEN' | 'RESOLVED')}>
                <option value="ALL">All statuses</option>
                <option value="OPEN">Open</option>
                <option value="RESOLVED">Resolved</option>
              </select>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <SafetyMap center={selectedIncident ? { latitude: selectedIncident.latitude, longitude: selectedIncident.longitude } : { latitude: 20.5937, longitude: 78.9629 }} zoom={12} markers={markers} className="h-[40rem] w-full" />

            <div className="space-y-4 overflow-y-auto pr-2 xl:max-h-[40rem]">
              {filteredIncidents.map((incident) => (
                <button key={incident.id} type="button" className={`w-full rounded-[1.4rem] border p-4 text-left transition-all ${selectedIncident?.id === incident.id ? 'border-primary bg-primary/5 shadow-accent' : 'border-border/70 bg-white hover:-translate-y-0.5 hover:shadow-soft'}`} onClick={() => setSelectedId(incident.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">{incident.type}</span>
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${incident.severity === 'HIGH' ? 'bg-red-50 text-red-600' : incident.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                      {incident.severity}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-7 text-muted">{incident.description}</p>
                  <div className="mt-4 grid gap-1 text-xs text-muted">
                    <span>Reporter: {incident.reporterName}</span>
                    <span>Status: {incident.status}</span>
                    <span>{new Date(incident.timestamp).toLocaleString()}</span>
                  </div>
                  {incident.status === 'OPEN' ? (
                    <button type="button" className="btn-secondary mt-4 min-h-10 px-3 py-2" onClick={(event) => { event.stopPropagation(); void resolveIncident(incident.id); }}>
                      Mark Resolved
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
