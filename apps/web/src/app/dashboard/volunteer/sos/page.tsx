'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { volunteerDashboardApi } from '@/lib/api/volunteer-dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth.store';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading alert map..." className="h-80 w-full" />,
});

type AlertItem = {
  id: string;
  alertCode: string;
  userName: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  status: 'PENDING' | 'RESPONDING' | 'CLOSED';
  distanceKm: number | null;
  mine: boolean;
};

export default function VolunteerSosPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await volunteerDashboardApi.getSos();
      setAlerts((response.data ?? []) as AlertItem[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load volunteer SOS feed.');
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
        distanceKm: null,
        mine: false,
      }, ...current.filter((item) => item.id !== payload.alertId)]);
    };
    socket.on('SOS_CREATED', handleSosCreated);
    return () => {
      socket.off('SOS_CREATED', handleSosCreated);
    };
  }, [isAllowed, accessToken]);

  const activeAlerts = useMemo(() => alerts.filter((alert) => alert.status !== 'CLOSED'), [alerts]);
  const closedAlerts = useMemo(() => alerts.filter((alert) => alert.status === 'CLOSED'), [alerts]);

  async function respond(alertId: string) {
    try {
      await volunteerDashboardApi.respondSos(alertId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to mark yourself as responding.');
    }
  }

  async function close(alertId: string) {
    try {
      await volunteerDashboardApi.closeSos(alertId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to close your response.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SOS Feed" subtitle="Real-time SOS alerts around your NGO coverage area, with fast response actions and volunteer-distance context when available.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Live SOS feed" pulse />
          <div className="mt-5 space-y-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-[1.5rem] border p-5 shadow-soft ${alert.status === 'PENDING' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{alert.userName}</p>
                    <p className="text-xs text-muted">{alert.alertCode} • {new Date(alert.createdAt).toLocaleString()}</p>
                  </div>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink">{alert.status}</span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-body md:grid-cols-2">
                  <p>Coordinates: <span className="font-medium text-ink">{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span></p>
                  <p>Distance: <span className="font-medium text-ink">{alert.distanceKm !== null ? `${alert.distanceKm.toFixed(1)} km` : 'Unknown'}</span></p>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => setSelectedAlert(alert)}>
                    View on Map
                  </button>
                  {!alert.mine && alert.status === 'PENDING' ? (
                    <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void respond(alert.id)}>
                      I'm Responding
                    </button>
                  ) : null}
                  {alert.mine && alert.status !== 'CLOSED' ? (
                    <button type="button" className="btn-secondary min-h-10 px-4 py-2" onClick={() => void close(alert.id)}>
                      Close My Response
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Closed responses" />
          <div className="mt-5 space-y-3">
            {closedAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{alert.alertCode}</span>
                  <span className="text-xs text-muted">{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{alert.userName}</p>
              </div>
            ))}
          </div>
        </Card>

        <Modal open={Boolean(selectedAlert)} title="SOS Location" description="Quick location preview for the selected SOS alert." onClose={() => setSelectedAlert(null)}>
          {selectedAlert ? (
            <SafetyMap
              center={{ latitude: selectedAlert.latitude, longitude: selectedAlert.longitude }}
              zoom={14}
              markers={[{ id: selectedAlert.id, latitude: selectedAlert.latitude, longitude: selectedAlert.longitude, type: 'alert', label: selectedAlert.alertCode }]}
              className="h-80 w-full"
            />
          ) : null}
        </Modal>
      </div>
    </AppShell>
  );
}
