'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { departmentApi } from '@/lib/api/department.api';
import { ApiError } from '@/lib/api/fetcher';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading alert map..." className="h-80 w-full" />,
});

type Policeman = { id: string; fullName: string; isActive: boolean; currentHotspot?: { id: string } | null };
type AlertItem = {
  id: string;
  alertCode: string;
  userName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
  triggerAddress?: string | null;
  assignedOfficer?: { id: string; name: string } | null;
};

export default function DepartmentSosPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [policemen, setPolicemen] = useState<Policeman[]>([]);
  const [selectedMapAlert, setSelectedMapAlert] = useState<AlertItem | null>(null);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load() {
    try {
      const [alertsResponse, policemenResponse] = await Promise.all([
        departmentApi.getSos(1, 50),
        departmentApi.getPolicemen(),
      ]);
      setAlerts(((alertsResponse.data as { items?: AlertItem[] } | undefined)?.items ?? []) as AlertItem[]);
      setPolicemen((policemenResponse.data ?? []) as Policeman[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load the SOS feed.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  useEffect(() => {
    if (!isAllowed || !accessToken) return;
    const socket = getSocket(accessToken);

    const handleSosCreated = (payload: {
      alertId: string;
      alertCode: string;
      latitude: number;
      longitude: number;
      createdAt: string;
    }) => {
      const nextAlert: AlertItem = {
        id: payload.alertId,
        alertCode: payload.alertCode,
        userName: 'Live alert',
        latitude: payload.latitude,
        longitude: payload.longitude,
        createdAt: payload.createdAt,
        status: 'PENDING',
      };
      setAlerts((current) => [nextAlert, ...current.filter((item) => item.id !== nextAlert.id)]);
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('New SOS alert', {
          body: `Incoming SOS alert near ${payload.latitude.toFixed(4)}, ${payload.longitude.toFixed(4)}`,
        });
      }
    };

    socket.on('SOS_CREATED', handleSosCreated);
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      void Notification.requestPermission();
    }

    return () => {
      socket.off('SOS_CREATED', handleSosCreated);
    };
  }, [isAllowed, accessToken]);

  const activeAlerts = useMemo(() => alerts.filter((item) => item.status !== 'RESOLVED'), [alerts]);
  const resolvedAlerts = useMemo(() => alerts.filter((item) => item.status === 'RESOLVED'), [alerts]);
  const activeOfficerOptions = policemen.filter((officer) => officer.isActive);

  async function acknowledge(alertId: string) {
    const officerId = assignments[alertId];
    if (!officerId) return;
    try {
      await departmentApi.acknowledgeSos(alertId, officerId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to acknowledge this SOS alert.');
    }
  }

  async function resolve(alertId: string) {
    try {
      await departmentApi.resolveSos(alertId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to resolve this SOS alert.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SOS Alert Feed" subtitle="Real-time, department-scoped SOS cards with assignment actions, map previews, and a collapsed resolved queue.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionBadge label="Real-time intake" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Active department SOS feed</h2>
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
                  <p>Assigned officer: <span className="font-medium text-ink">{alert.assignedOfficer?.name ?? 'Unassigned'}</span></p>
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => setSelectedMapAlert(alert)}>
                    View on Map
                  </button>
                  <select className="input-base h-10 rounded-xl border border-border bg-white px-3 text-sm text-ink" value={assignments[alert.id] ?? ''} onChange={(event) => setAssignments((current) => ({ ...current, [alert.id]: event.target.value }))}>
                    <option value="">Assign officer</option>
                    {activeOfficerOptions.map((officer) => (
                      <option key={officer.id} value={officer.id}>
                        {officer.fullName}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void acknowledge(alert.id)}>
                    Acknowledge
                  </button>
                  <button type="button" className="btn-secondary min-h-10 px-4 py-2" onClick={() => void resolve(alert.id)}>
                    Resolve
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
                <p className="mt-1 text-sm text-muted">{alert.userName} • {alert.assignedOfficer?.name ?? 'No officer recorded'}</p>
              </div>
            ))}
            {!resolvedAlerts.length ? <p className="text-sm text-muted">Resolved alerts will collapse into this archive after they are closed.</p> : null}
          </div>
        </Card>

        <Modal open={Boolean(selectedMapAlert)} title="SOS Location" description="Quick location preview for the selected SOS alert." onClose={() => setSelectedMapAlert(null)}>
          {selectedMapAlert ? (
            <SafetyMap
              center={{ latitude: selectedMapAlert.latitude, longitude: selectedMapAlert.longitude }}
              zoom={14}
              markers={[{
                id: selectedMapAlert.id,
                latitude: selectedMapAlert.latitude,
                longitude: selectedMapAlert.longitude,
                type: 'alert',
                label: selectedMapAlert.alertCode,
              }]}
              className="h-80 w-full"
            />
          ) : null}
        </Modal>
      </div>
    </AppShell>
  );
}
