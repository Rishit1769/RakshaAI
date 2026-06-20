'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { LoadingState } from '@/components/ui/LoadingState';
import { volunteerDashboardApi } from '@/lib/api/volunteer-dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading check-in map..." className="h-[36rem] w-full" />,
});

type CheckIn = {
  id: string;
  createdAt: string;
  latitude: number;
  longitude: number;
  note?: string | null;
  kind: 'CASE' | 'STANDALONE';
};

export default function VolunteerCheckInPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [history, setHistory] = useState<CheckIn[]>([]);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load() {
    try {
      const response = await volunteerDashboardApi.getCheckInHistory();
      setHistory((response.data ?? []) as CheckIn[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load check-in history.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  async function checkInNow() {
    setError('');
    setMessage('');
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await volunteerDashboardApi.createCheckIn({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            note: note || undefined,
          });
          setMessage('Check-in recorded successfully.');
          setNote('');
          await load();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Unable to record volunteer check-in.');
        }
      },
      () => setError('Unable to get your current location for check-in.')
    );
  }

  const markers: MapMarker[] = history.map((item, index) => ({
    id: item.id,
    latitude: item.latitude,
    longitude: item.longitude,
    type: 'volunteer',
    markerText: String(index + 1),
    popupHtml: `<div style="min-width:220px"><strong>Check-in #${index + 1}</strong><br/><span>${new Date(item.createdAt).toLocaleString()}</span><br/><span>${item.note ?? 'No note'}</span></div>`,
  }));

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Check-In" subtitle="Field presence tools for instant volunteer check-ins, recent location history, and quick visibility back to your NGO team.">
      <div className="space-y-8">
        <Card padding="lg" className="surface-panel-modern">
          <SectionBadge label="Field check-in" pulse />
          <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <FloatingLabelInput label="Optional Note" type="text" value={note} onChange={(event) => setNote(event.target.value)} />
            <button type="button" className="btn-primary" onClick={() => void checkInNow()}>
              Check In Now
            </button>
          </div>
          {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
          {message ? <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        </Card>

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Check-in map" />
            <div className="mt-6">
              <SafetyMap center={history[0] ? { latitude: history[0].latitude, longitude: history[0].longitude } : { latitude: 20.5937, longitude: 78.9629 }} zoom={12} markers={markers} className="h-[36rem] w-full" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Recent history" />
            <div className="mt-5 space-y-3 overflow-y-auto pr-2 xl:max-h-[36rem]">
              {history.map((item, index) => (
                <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-ink">#{index + 1}</span>
                    <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm text-body">{item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}</p>
                  <p className="mt-1 text-sm text-muted">{item.note ?? 'No note recorded.'}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
