'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { ngoApi } from '@/lib/api/ngo.api';
import { ApiError } from '@/lib/api/fetcher';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type Volunteer = { id: string; fullName: string; isActive: boolean; currentAssignment?: { type: string; label: string } | null };
type AlertItem = {
  id: string;
  alertCode: string;
  userName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: 'PENDING' | 'RESPONDING' | 'RESOLVED';
  assignedVolunteer?: { id: string; name: string } | null;
};

export default function NgoSosPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [dispatchSelections, setDispatchSelections] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load() {
    try {
      const [alertsResponse, volunteersResponse] = await Promise.all([
        ngoApi.getSos(1, 50),
        ngoApi.getVolunteers(),
      ]);
      setAlerts((((alertsResponse.data as { items?: AlertItem[] } | undefined)?.items) ?? []) as AlertItem[]);
      setVolunteers((volunteersResponse.data ?? []) as Volunteer[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load NGO SOS feed.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  useEffect(() => {
    if (!isAllowed || !accessToken) return;
    const socket = getSocket(accessToken);
    const handleSosCreated = (payload: { alertId: string; alertCode: string; latitude: number; longitude: number; createdAt: string }) => {
      setAlerts((current) => [{
        id: payload.alertId,
        alertCode: payload.alertCode,
        userName: 'Live alert',
        latitude: payload.latitude,
        longitude: payload.longitude,
        createdAt: payload.createdAt,
        status: 'PENDING',
      }, ...current.filter((item) => item.id !== payload.alertId)]);
    };
    socket.on('SOS_CREATED', handleSosCreated);
    return () => {
      socket.off('SOS_CREATED', handleSosCreated);
    };
  }, [isAllowed, accessToken]);

  const availableVolunteers = volunteers.filter((volunteer) => volunteer.isActive && !volunteer.currentAssignment);
  const activeAlerts = useMemo(() => alerts.filter((alert) => alert.status !== 'RESOLVED'), [alerts]);
  const resolvedAlerts = useMemo(() => alerts.filter((alert) => alert.status === 'RESOLVED'), [alerts]);

  async function dispatch(alertId: string) {
    const volunteerId = dispatchSelections[alertId];
    if (!volunteerId) return;
    try {
      await ngoApi.respondSos(alertId, volunteerId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to dispatch volunteer.');
    }
  }

  async function close(alertId: string) {
    try {
      await ngoApi.closeSos(alertId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to close NGO SOS response.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SOS Feed" subtitle="Real-time SOS alerts near your NGO’s coverage area, with fast volunteer dispatch and a resolved archive at the bottom.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionBadge label="Live SOS feed" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Incoming alerts for NGO response</h2>
            </div>
            <div className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
              {activeAlerts.length} live alerts
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[1.6rem] border border-border/70 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                    <div>
                      <p className="text-base font-semibold text-ink">{alert.userName}</p>
                      <p className="text-xs text-muted">{alert.alertCode} • {new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${alert.status === 'PENDING' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}>
                    {alert.status}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-body md:grid-cols-2">
                  <p>Coordinates: <span className="font-medium text-ink">{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span></p>
                  <p>Assigned volunteer: <span className="font-medium text-ink">{alert.assignedVolunteer?.name ?? 'Unassigned'}</span></p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <select className="input-base h-10 rounded-xl border border-border bg-white px-3 text-sm text-ink" value={dispatchSelections[alert.id] ?? ''} onChange={(event) => setDispatchSelections((current) => ({ ...current, [alert.id]: event.target.value }))}>
                    <option value="">Dispatch volunteer</option>
                    {availableVolunteers.map((volunteer) => (
                      <option key={volunteer.id} value={volunteer.id}>
                        {volunteer.fullName}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void dispatch(alert.id)}>
                    Dispatch Volunteer
                  </button>
                  <button type="button" className="btn-secondary min-h-10 px-4 py-2" onClick={() => void close(alert.id)}>
                    Close
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Resolved archive" />
          <div className="mt-5 space-y-3">
            {resolvedAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[1.35rem] border border-border/70 bg-slate-50 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{alert.alertCode}</span>
                  <span className="text-xs text-muted">{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{alert.userName} • {alert.assignedVolunteer?.name ?? 'No volunteer recorded'}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
