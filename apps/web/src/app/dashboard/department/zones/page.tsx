'use client';

import { useEffect, useState } from 'react';
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
  loading: () => <LoadingState label="Loading zone map..." className="h-[36rem] w-full" />,
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

type ZoneFormState = {
  name: string;
  type: 'SAFE' | 'RED';
  lat: number;
  lng: number;
  radius: string;
  description: string;
};

export default function DepartmentZonesPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<ZoneFormState>({ name: '', type: 'SAFE', lat: INDIA_CENTER.latitude, lng: INDIA_CENTER.longitude, radius: '1500', description: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await departmentApi.getZones();
      setZones((response.data ?? []) as Zone[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load department zones.');
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
      setForm((prev) => ({ ...prev, lat: currentLocation.latitude, lng: currentLocation.longitude }));
    })();
  }, [isAllowed]);

  const selectedZone = zones.find((zone) => zone.id === selectedZoneId) ?? null;
  const markers: MapMarker[] = zones.map((zone) => ({
    id: zone.id,
    latitude: zone.latitude,
    longitude: zone.longitude,
    type: 'safe_zone',
    markerColor: zone.type === 'SAFE' ? '#16a34a' : '#dc2626',
    markerText: zone.type,
    popupHtml: `<div style="min-width:220px"><strong>${zone.name}</strong><br/><span>${zone.type} zone</span><br/><span>Radius: ${Math.round(zone.radiusMeters)}m</span><br/><span>${zone.description || 'No description'}</span></div>`,
  }));

  async function saveZone() {
    try {
      if (selectedZone) {
        await departmentApi.updateZone(selectedZone.id, {
          name: form.name,
          type: form.type,
          lat: form.lat,
          lng: form.lng,
          radius: Number(form.radius),
          description: form.description,
        });
      } else {
        await departmentApi.createZone({
          name: form.name,
          type: form.type,
          lat: form.lat,
          lng: form.lng,
          radius: Number(form.radius),
          description: form.description,
        });
      }
      setSelectedZoneId(null);
      setCreating(false);
      setForm({ name: '', type: 'SAFE', lat: form.lat, lng: form.lng, radius: '1500', description: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save the zone.');
    }
  }

  async function deleteZone() {
    if (!selectedZone) return;
    try {
      await departmentApi.deleteZone(selectedZone.id);
      setSelectedZoneId(null);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to delete the zone.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SafeZone / RedZone Management" subtitle="Create, edit, and delete department-owned zone circles from a single light-mode map and side panel workflow.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <div className="flex items-center justify-between gap-4">
              <div>
                <SectionBadge label="Zone map" pulse />
                <h2 className="mt-5 text-xl font-semibold text-ink">Department zone editor</h2>
              </div>
              <button type="button" className="btn-primary" onClick={() => { setSelectedZoneId(null); setCreating(true); }}>
                Create Zone
              </button>
            </div>
            <div className="mt-6">
              <SafetyMap
                center={selectedZone ? { latitude: selectedZone.latitude, longitude: selectedZone.longitude } : { latitude: form.lat, longitude: form.lng }}
                zoom={12}
                markers={markers}
                selectedLocation={{ latitude: form.lat, longitude: form.lng }}
                radiusKm={Number(form.radius) / 1000}
                placementMode={creating || Boolean(selectedZone)}
                onMapClick={(coords) => setForm((prev) => ({ ...prev, lat: coords.latitude, lng: coords.longitude }))}
                className="h-[36rem] w-full"
              />
            </div>
          </Card>

          <div className="space-y-6">
            <Card padding="lg" className="surface-panel-modern">
              <SectionBadge label={selectedZone ? 'Edit zone' : 'Create zone'} />
              <div className="mt-5 space-y-4">
                <FloatingLabelInput label="Zone Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Zone Type</span>
                    <select className="input-base h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as 'SAFE' | 'RED' }))}>
                      <option value="SAFE">SafeZone</option>
                      <option value="RED">RedZone</option>
                    </select>
                  </label>
                  <FloatingLabelInput label="Radius (meters)" type="number" value={form.radius} onChange={(event) => setForm((prev) => ({ ...prev, radius: event.target.value }))} />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <FloatingLabelInput label="Latitude" type="number" value={String(form.lat)} onChange={(event) => setForm((prev) => ({ ...prev, lat: Number(event.target.value) }))} />
                  <FloatingLabelInput label="Longitude" type="number" value={String(form.lng)} onChange={(event) => setForm((prev) => ({ ...prev, lng: Number(event.target.value) }))} />
                </div>
                <FloatingLabelInput label="Description" type="text" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
                <div className="flex gap-3">
                  <button type="button" className="btn-primary flex-1" onClick={() => void saveZone()}>
                    {selectedZone ? 'Update Zone' : 'Save Zone'}
                  </button>
                  {selectedZone ? (
                    <button type="button" className="btn-secondary flex-1" onClick={() => void deleteZone()}>
                      Delete
                    </button>
                  ) : null}
                </div>
              </div>
            </Card>

            <Card padding="lg" className="surface-panel-modern">
              <SectionBadge label="Existing zones" />
              <div className="mt-5 space-y-3">
                {zones.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => {
                      setCreating(false);
                      setSelectedZoneId(zone.id);
                      setForm({
                        name: zone.name,
                        type: zone.type,
                        lat: zone.latitude,
                        lng: zone.longitude,
                        radius: String(Math.round(zone.radiusMeters)),
                        description: zone.description,
                      });
                    }}
                    className={`w-full rounded-[1.35rem] border p-4 text-left transition-all ${selectedZoneId === zone.id ? 'border-primary bg-primary/5 shadow-accent' : 'border-border/70 bg-white hover:-translate-y-0.5 hover:shadow-soft'}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-ink">{zone.name}</span>
                      <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${zone.type === 'SAFE' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {zone.type}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-muted">{zone.description || 'No description provided.'}</p>
                    <p className="mt-2 text-xs text-muted">Radius: {Math.round(zone.radiusMeters)}m</p>
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
