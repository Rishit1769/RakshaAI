'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { officerApi } from '@/lib/api/officer.api';
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
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED';
};

export default function PolicemanSosPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const accessToken = useAuthStore((state) => state.accessToken);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [error, setError] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);

  async function load() {
    try {
      const response = await officerApi.getSos();
      setAlerts((response.data ?? []) as AlertItem[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load officer SOS alerts.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  function playBeep() {
    if (typeof window === 'undefined') return;
    const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const ctx = audioContextRef.current ?? new AudioCtor();
    audioContextRef.current = ctx;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gain.gain.value = 0.06;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.12);
  }

  useEffect(() => {
    if (!isAllowed || !accessToken) return;
    const socket = getSocket(accessToken);
    const handleSosCreated = (payload: { alertId: string; alertCode: string; latitude: number; longitude: number; createdAt: string }) => {
      playBeep();
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

  const activeAlerts = useMemo(() => alerts.filter((alert) => alert.status !== 'RESOLVED'), [alerts]);
  const resolvedAlerts = useMemo(() => alerts.filter((alert) => alert.status === 'RESOLVED'), [alerts]);

  async function acknowledge(alertId: string) {
    try {
      await officerApi.acknowledgeSos(alertId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to acknowledge SOS alert.');
    }
  }

  async function resolve(alertId: string) {
    try {
      await officerApi.resolveSos(alertId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to resolve SOS alert.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="SOS Alerts" subtitle="Real-time hotspot-scoped SOS queue with acknowledge, resolve, audio cue, and quick map preview.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Live SOS queue" pulse />
          <h2 className="mt-5 text-xl font-semibold text-ink">Assigned-zone alerts</h2>
          <div className="mt-6 space-y-4">
            {activeAlerts.map((alert) => (
              <div key={alert.id} className={`rounded-[1.5rem] border p-5 shadow-soft ${alert.status === 'PENDING' ? 'border-red-200 bg-red-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className={`h-2.5 w-2.5 rounded-full ${alert.status === 'PENDING' ? 'animate-pulse bg-red-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="text-base font-semibold text-ink">{alert.userName}</p>
                      <p className="text-xs text-muted">{alert.alertCode} • {new Date(alert.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <span className="inline-flex rounded-full bg-white px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] text-ink">
                    {alert.status}
                  </span>
                </div>
                <p className="mt-4 text-sm text-body">Coordinates: <span className="font-medium text-ink">{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</span></p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => setSelectedAlert(alert)}>
                    View on Map
                  </button>
                  {alert.status === 'PENDING' ? (
                    <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void acknowledge(alert.id)}>
                      Acknowledge
                    </button>
                  ) : null}
                  {alert.status !== 'RESOLVED' ? (
                    <button type="button" className="btn-secondary min-h-10 px-4 py-2" onClick={() => void resolve(alert.id)}>
                      Resolve
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Resolved queue" />
          <div className="mt-5 space-y-3">
            {resolvedAlerts.map((alert) => (
              <div key={alert.id} className="rounded-[1.35rem] border border-emerald-200 bg-emerald-50/60 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-ink">{alert.alertCode}</span>
                  <span className="text-xs text-muted">{new Date(alert.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-muted">{alert.userName}</p>
              </div>
            ))}
          </div>
        </Card>

        <Modal open={Boolean(selectedAlert)} title="SOS Location" description="Quick map preview for the selected alert." onClose={() => setSelectedAlert(null)}>
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
