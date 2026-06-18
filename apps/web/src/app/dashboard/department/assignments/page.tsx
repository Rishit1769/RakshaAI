'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function DepartmentAssignmentsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');
  const [assigningId, setAssigningId] = useState<string | null>(null);

  async function load() {
    try {
      const response = await dashboardApi.getDepartmentAssignments();
      setData((response.data ?? {}) as Record<string, unknown>);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load assignment data.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  async function assign(hotspotId: string, policemanId: string) {
    setAssigningId(hotspotId);

    try {
      await api.post(`/hotspots/${hotspotId}/assign`, { policemanId });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to assign hotspot.');
    } finally {
      setAssigningId(null);
    }
  }

  const policemen = (data.policemen as Array<Record<string, unknown>> | undefined) ?? [];
  const hotspots = (data.hotspots as Array<Record<string, unknown>> | undefined) ?? [];
  const defaultPolicemanId = String(policemen[0]?.id ?? '');

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Hotspot Assignments" subtitle="Pair active hotspots with department policemen using live assignment records.">
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SectionCard title="Department policemen">
          <SimpleTable
            columns={[{ key: 'name', label: 'Officer' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Status' }]}
            rows={policemen.map((item) => ({
              name: String(item.fullName ?? ((item.user as Record<string, unknown> | undefined)?.fullName ?? 'Unknown')),
              email: String(item.email ?? ((item.user as Record<string, unknown> | undefined)?.email ?? 'Unknown')),
              status: item.isActive ? 'Active' : 'Inactive',
            }))}
          />
        </SectionCard>
        <SectionCard title="Active hotspots" subtitle="Assignments currently use the first department officer as a safe one-click fallback if no richer picker is available yet.">
          <SimpleTable
            columns={[{ key: 'title', label: 'Hotspot' }, { key: 'city', label: 'City' }, { key: 'risk', label: 'Risk' }, { key: 'assigned', label: 'Assigned' }, { key: 'action', label: 'Action' }]}
            rows={hotspots.map((item) => ({
              title: String(item.title ?? 'Untitled'),
              city: String(item.city ?? 'Unknown'),
              risk: String(item.riskScore ?? 0),
              assigned: String(item.assignedPolicemanId ?? 'Unassigned'),
              action: defaultPolicemanId ? (
                <button type="button" className="btn-secondary" disabled={assigningId === String(item.id)} onClick={() => void assign(String(item.id), defaultPolicemanId)}>
                  {assigningId === String(item.id) ? 'Assigning...' : 'Assign'}
                </button>
              ) : (
                'No policemen available'
              ),
            }))}
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
