'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingState';
import { Select } from '@/components/ui/field';
import { SectionBadge } from '@/components/ui/section-badge';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-[34rem] w-full" />,
});

type HotspotRow = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'INACTIVE';
  assignedPolicemanName?: string | null;
  departmentName?: string | null;
  reportCount: number;
  city?: string | null;
  state?: string | null;
};

type HotspotDetail = {
  id: string;
  name: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'ACTIVE' | 'INACTIVE';
  incidentCount: number;
  assignedOfficer?: { name: string; email: string; departmentName: string } | null;
  assignmentHistory?: Array<{ action: string; assignedAt?: string; details?: unknown }>;
  description?: string | null;
};

const severityColors: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#16a34a',
  MEDIUM: '#f59e0b',
  HIGH: '#dc2626',
};

export default function SuperadminHotspotsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [rows, setRows] = useState<HotspotRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<HotspotDetail | null>(null);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'severity' | 'status'>('severity');

  async function loadRows() {
    try {
      const response = await adminApi.getHotspots();
      const data = (response.data ?? {}) as { items?: HotspotRow[] };
      setRows(data.items ?? []);
      if (!selectedId && data.items?.[0]?.id) {
        setSelectedId(data.items[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load hotspots.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadRows();
  }, [isAllowed]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      try {
        const response = await adminApi.getHotspotDetail(selectedId);
        setDetail((response.data ?? null) as HotspotDetail | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load hotspot detail.');
      }
    })();
  }, [selectedId]);

  async function handleStatusChange(status: 'ACTIVE' | 'INACTIVE') {
    if (!detail) return;
    try {
      await adminApi.updateHotspotStatus(detail.id, status);
      await Promise.all([loadRows(), adminApi.getHotspotDetail(detail.id).then((response) => setDetail((response.data ?? null) as HotspotDetail | null))]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update hotspot status.');
    }
  }

  const sortedRows = useMemo(() => {
    const next = [...rows];
    next.sort((a, b) => {
      if (sortBy === 'status') return a.status.localeCompare(b.status);
      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return rank[a.severity] - rank[b.severity];
    });
    return next;
  }, [rows, sortBy]);

  const markers: MapMarker[] = sortedRows.map((row) => ({
    id: row.id,
    latitude: row.lat,
    longitude: row.lng,
    type: 'hotspot',
    label: row.name,
    markerColor: severityColors[row.severity],
    markerText: row.severity === 'HIGH' ? 'HIGH' : row.severity === 'MEDIUM' ? 'MED' : 'LOW',
    popupHtml: `<div style="min-width:220px"><strong>${row.name}</strong><br/><span>${row.city ?? 'Unknown city'}${row.state ? `, ${row.state}` : ''}</span><br/><span>Severity: ${row.severity}</span><br/><span>Status: ${row.status}</span><br/><span>Officer: ${row.assignedPolicemanName ?? 'Unassigned'}</span></div>`,
  }));

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Hotspot Oversight" subtitle="Map-first supervision for hotspot severity, ownership, and field assignment coverage." showBack={false}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionBadge label="Hotspot inventory" />
              <h2 className="mt-5 text-xl font-semibold text-ink">Sortable summary before map inspection</h2>
            </div>
            <div className="w-full sm:w-48">
              <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as 'severity' | 'status')}>
                <option value="severity">Sort by severity</option>
                <option value="status">Sort by status</option>
              </Select>
            </div>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-[900px] w-full text-left text-sm">
              <thead className="bg-surface-soft/70">
                <tr>
                  {['Zone', 'Severity', 'Status', 'Assigned Officer', 'Department', 'Reports'].map((label) => (
                    <th key={label} className="px-5 py-4 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => (
                  <tr key={row.id} className={`border-t border-hairline cursor-pointer hover:bg-primary/[0.03] ${selectedId === row.id ? 'bg-primary/[0.05]' : ''}`} onClick={() => setSelectedId(row.id)}>
                    <td className="px-5 py-4 font-semibold text-ink">{row.name}</td>
                    <td className="px-5 py-4"><span className="eyebrow" style={{ borderColor: `${severityColors[row.severity]}33`, color: severityColors[row.severity] }}>{row.severity}</span></td>
                    <td className="px-5 py-4"><span className={row.status === 'ACTIVE' ? 'badge-safe' : 'badge-warning'}>{row.status}</span></td>
                    <td className="px-5 py-4 text-body">{row.assignedPolicemanName ?? 'Unassigned'}</td>
                    <td className="px-5 py-4 text-body">{row.departmentName ?? 'Unknown'}</td>
                    <td className="px-5 py-4 text-body">{row.reportCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Map view" />
            <div className="mt-5">
              <SafetyMap center={{ latitude: 20.5937, longitude: 78.9629 }} zoom={5} markers={markers} className="h-[34rem] w-full" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Selected hotspot" />
            {detail ? (
              <div className="mt-5 space-y-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">{detail.name}</h2>
                  <p className="mt-2 text-sm leading-7 text-muted">{detail.description ?? 'No extended description is stored for this hotspot yet.'}</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="panel-subtle rounded-[1.25rem] px-4 py-3">
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">Severity</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{detail.severity}</p>
                  </div>
                  <div className="panel-subtle rounded-[1.25rem] px-4 py-3">
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">Nearby incident count</p>
                    <p className="mt-2 text-lg font-semibold text-ink">{detail.incidentCount}</p>
                  </div>
                </div>
                <div className="panel-subtle rounded-[1.25rem] px-4 py-4">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted">Assigned officer</p>
                  <p className="mt-2 text-base font-semibold text-ink">{detail.assignedOfficer?.name ?? 'Unassigned'}</p>
                  <p className="text-sm text-muted">{detail.assignedOfficer?.departmentName ?? 'No department linked'}</p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-ink">Status</label>
                  <Select value={detail.status} onChange={(event) => void handleStatusChange(event.target.value as 'ACTIVE' | 'INACTIVE')}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </Select>
                </div>
                <div>
                  <p className="mb-3 text-sm font-medium text-ink">Assignment history</p>
                  <div className="space-y-3">
                    {(detail.assignmentHistory ?? []).slice(0, 6).map((item, index) => (
                      <div key={`${item.action}-${index}`} className="panel-subtle rounded-[1.25rem] px-4 py-3">
                        <p className="text-sm font-semibold text-ink">{item.action}</p>
                        <p className="mt-1 text-xs text-muted">{item.assignedAt ? new Date(item.assignedAt).toLocaleString() : 'Timestamp unavailable'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-5 text-sm text-muted">Select a hotspot from the table or map to inspect details.</p>
            )}
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
