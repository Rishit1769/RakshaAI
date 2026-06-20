'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { departmentApi } from '@/lib/api/department.api';
import { ApiError } from '@/lib/api/fetcher';
import { getCurrentBrowserLocation, INDIA_CENTER } from '@/lib/geo';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading hotspot planner..." className="h-[36rem] w-full" />,
});

type Policeman = {
  id: string;
  fullName: string;
  isActive: boolean;
  currentHotspot?: { id: string; name: string } | null;
};

type Hotspot = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'INACTIVE';
  incidentCount: number;
  assignedOfficer?: { id: string; name: string } | null;
};

type HotspotDraftState = {
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  radius: string;
  lat: number;
  lng: number;
  selectedOfficerId: string;
};

export default function DepartmentAssignmentsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [policemen, setPolicemen] = useState<Policeman[]>([]);
  const [hotspots, setHotspots] = useState<Hotspot[]>([]);
  const [selectedHotspotId, setSelectedHotspotId] = useState<string | null>(null);
  const [draft, setDraft] = useState<HotspotDraftState>({ name: '', severity: 'MEDIUM', radius: '1200', lat: INDIA_CENTER.latitude, lng: INDIA_CENTER.longitude, selectedOfficerId: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const [policemenResponse, hotspotsResponse] = await Promise.all([
        departmentApi.getPolicemen(),
        departmentApi.getHotspots(),
      ]);
      setPolicemen((policemenResponse.data ?? []) as Policeman[]);
      setHotspots((hotspotsResponse.data ?? []) as Hotspot[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load hotspot assignments.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      const currentLocation = await getCurrentBrowserLocation();
      setDraft((prev) => ({ ...prev, lat: currentLocation.latitude, lng: currentLocation.longitude }));
    })();
  }, [isAllowed]);

  const selectedHotspot = hotspots.find((item) => item.id === selectedHotspotId) ?? null;
  const activeOfficerOptions = useMemo(
    () => policemen.filter((officer) => officer.isActive && (!officer.currentHotspot || officer.currentHotspot.id === selectedHotspotId)),
    [policemen, selectedHotspotId]
  );

  const mapMarkers: MapMarker[] = hotspots.map((hotspot) => ({
    id: hotspot.id,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    type: 'hotspot',
    markerColor: hotspot.severity === 'HIGH' ? '#dc2626' : hotspot.severity === 'MEDIUM' ? '#f59e0b' : '#16a34a',
    markerText: hotspot.severity === 'MEDIUM' ? 'MED' : hotspot.severity,
    popupHtml: `<div style="min-width:220px"><strong>${hotspot.name}</strong><br/><span>${hotspot.status}</span><br/><span>${hotspot.incidentCount} linked incidents</span><br/><span>${hotspot.assignedOfficer?.name ?? 'Unassigned'}</span></div>`,
  }));

  async function createHotspot() {
    try {
      await departmentApi.createHotspot({
        name: draft.name,
        lat: draft.lat,
        lng: draft.lng,
        radius: Number(draft.radius),
        severity: draft.severity,
      });
      setDraft((prev) => ({ ...prev, name: '', selectedOfficerId: '' }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create the hotspot.');
    }
  }

  async function assignSelectedHotspot() {
    if (!selectedHotspot || !draft.selectedOfficerId) return;
    try {
      await departmentApi.assignHotspot(selectedHotspot.id, draft.selectedOfficerId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to assign hotspot.');
    }
  }

  async function unassignSelectedHotspot() {
    if (!selectedHotspot) return;
    try {
      await departmentApi.unassignHotspot(selectedHotspot.id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to remove hotspot assignment.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Hotspot Assignment" subtitle="Drop new hotspot pins, tune their radius and severity, and keep one officer mapped to one hotspot at a time.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Interactive hotspot map" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">Place or review department hotspots</h2>
            <p className="mt-2 text-sm leading-7 text-muted">Click on the map to move the draft hotspot. The right panel keeps creation and assignment controls together.</p>
            <div className="mt-6">
              <SafetyMap
                center={selectedHotspot ? { latitude: selectedHotspot.latitude, longitude: selectedHotspot.longitude } : { latitude: draft.lat, longitude: draft.lng }}
                zoom={12}
                markers={mapMarkers}
                placementMode
                selectedLocation={{ latitude: draft.lat, longitude: draft.lng }}
                radiusKm={Number(draft.radius) / 1000}
                onMapClick={(coords) => setDraft((prev) => ({ ...prev, lat: coords.latitude, lng: coords.longitude }))}
                className="h-[36rem] w-full"
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card padding="lg" className="surface-panel-modern">
              <SectionBadge label="Create hotspot" />
              <div className="mt-5 space-y-4">
                <FloatingLabelInput label="Hotspot Name" type="text" value={draft.name} onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))} />
                <div className="grid gap-4 md:grid-cols-2">
                  <FloatingLabelInput label="Latitude" type="number" value={String(draft.lat)} onChange={(event) => setDraft((prev) => ({ ...prev, lat: Number(event.target.value) }))} />
                  <FloatingLabelInput label="Longitude" type="number" value={String(draft.lng)} onChange={(event) => setDraft((prev) => ({ ...prev, lng: Number(event.target.value) }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FloatingLabelInput label="Radius (meters)" type="number" value={draft.radius} onChange={(event) => setDraft((prev) => ({ ...prev, radius: event.target.value }))} />
                  <label className="block">
                    <span className="mb-2 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Severity</span>
                    <select className="input-base h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink" value={draft.severity} onChange={(event) => setDraft((prev) => ({ ...prev, severity: event.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                    </select>
                  </label>
                </div>
                <button type="button" className="btn-primary w-full" onClick={() => void createHotspot()}>
                  Save Hotspot
                </button>
              </div>
            </Card>

            <Card padding="lg" className="surface-panel-modern">
              <SectionBadge label="Assignment controls" />
              <h2 className="mt-5 text-xl font-semibold text-ink">{selectedHotspot?.name ?? 'Select a hotspot'}</h2>
              <p className="mt-2 text-sm leading-7 text-muted">
                {selectedHotspot ? `${selectedHotspot.incidentCount} incident reports in this area. ${selectedHotspot.assignedOfficer?.name ?? 'No officer currently assigned.'}` : 'Choose a hotspot from the list below to assign an active, unassigned officer.'}
              </p>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Assign Officer</span>
                  <select className="input-base h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink" value={draft.selectedOfficerId} onChange={(event) => setDraft((prev) => ({ ...prev, selectedOfficerId: event.target.value }))}>
                    <option value="">Select officer</option>
                    {activeOfficerOptions.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.fullName}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="flex gap-3">
                  <button type="button" className="btn-primary flex-1" disabled={!selectedHotspot || !draft.selectedOfficerId} onClick={() => void assignSelectedHotspot()}>
                    Assign
                  </button>
                  <button type="button" className="btn-secondary flex-1" disabled={!selectedHotspot?.assignedOfficer} onClick={() => void unassignSelectedHotspot()}>
                    Remove
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>

        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Current hotspots" />
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {hotspots.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                onClick={() => {
                  setSelectedHotspotId(hotspot.id);
                  setDraft((prev) => ({ ...prev, lat: hotspot.latitude, lng: hotspot.longitude, radius: String(Math.round(hotspot.radiusMeters)), selectedOfficerId: hotspot.assignedOfficer?.id ?? '' }));
                }}
                className={`rounded-[1.5rem] border p-5 text-left transition-all ${selectedHotspotId === hotspot.id ? 'border-primary bg-primary/5 shadow-accent' : 'border-border/70 bg-white hover:-translate-y-0.5 hover:shadow-soft'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{hotspot.name}</p>
                    <p className="mt-2 text-sm text-muted">{hotspot.incidentCount} incident reports linked</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${hotspot.severity === 'HIGH' ? 'bg-red-50 text-red-600' : hotspot.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {hotspot.severity}
                  </span>
                </div>
                <div className="mt-5 grid gap-2 text-sm text-body">
                  <p>Assigned officer: <span className="font-medium text-ink">{hotspot.assignedOfficer?.name ?? 'Unassigned'}</span></p>
                  <p>Status: <span className="font-medium text-ink">{hotspot.status}</span></p>
                  <p>Radius: <span className="font-medium text-ink">{Math.round(hotspot.radiusMeters)}m</span></p>
                </div>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
