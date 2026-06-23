'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionBadge } from '@/components/ui/section-badge';
import { BarChart } from '@/components/ui/simple-charts';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-[32rem] w-full" />,
});

type AnalyticsResponse = {
  byDay: Array<{ date: string; count: number }>;
  byRegion: Array<{ region: string; count: number }>;
  averageResponseTimeMinutes: number | null;
  averageResponseTimeFutureFieldNote: string | null;
  topHotspots: Array<{ id: string; name: string; count: number }>;
  mapPoints: Array<{ id: string; latitude: number; longitude: number; label: string }>;
};

export default function SuperadminAnalyticsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await adminApi.getSosAnalytics();
        setData((response.data ?? null) as AnalyticsResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load SOS analytics.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  const mapMarkers: MapMarker[] = (data?.mapPoints ?? []).map((point) => ({
    id: point.id,
    latitude: point.latitude,
    longitude: point.longitude,
    type: 'alert',
    label: point.label,
    popupHtml: `<div><strong>SOS alert</strong><br/><span>${point.label}</span></div>`,
  }));

  return (
    <AppShell title="SOS Analytics" subtitle="Track escalation volume, location patterns, and response lag from one admin surface." showBack={false}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="SOS trend" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Daily SOS alerts for the last 30 days</h2>
            <div className="mt-6">
              <BarChart data={(data?.byDay ?? []).map((item) => ({ label: item.date, value: item.count }))} />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Response timing" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Average first acknowledgment time</h2>
            <p className="mt-4 text-4xl font-semibold tracking-[-0.03em] text-ink">
              {data?.averageResponseTimeMinutes !== null && data?.averageResponseTimeMinutes !== undefined
                ? `${data.averageResponseTimeMinutes} min`
                : 'N/A'}
            </p>
            <p className="mt-3 text-sm leading-7 text-muted">
              {data?.averageResponseTimeFutureFieldNote ?? 'Measured from alert creation to the first volunteer or policeman acknowledgment recorded in alert status history.'}
            </p>

            <div className="mt-8">
              <p className="mb-3 text-sm font-semibold text-ink">Regions by alert volume</p>
              <div className="space-y-3">
                {(data?.byRegion ?? []).slice(0, 6).map((item) => (
                  <div key={item.region} className="panel-subtle flex items-center justify-between rounded-[1.25rem] px-4 py-3">
                    <span className="text-sm text-body">{item.region}</span>
                    <span className="text-sm font-semibold text-ink">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Alert locations" />
            <h2 className="mt-5 text-xl font-semibold text-ink">SOS marker distribution</h2>
            <p className="mt-2 text-sm leading-7 text-muted">The current repo does not include `Leaflet.markercluster`, so this page uses standard grouped markers instead of cluster overlays.</p>
            <div className="mt-6">
              <SafetyMap center={{ latitude: 20.5937, longitude: 78.9629 }} zoom={5} markers={mapMarkers} className="h-[32rem] w-full" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Top hotspots" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Top 5 hotspot areas by SOS volume</h2>
            <div className="mt-6 space-y-3">
              {(data?.topHotspots ?? []).map((item, index) => (
                <div key={item.id} className="panel-subtle flex items-center justify-between rounded-[1.25rem] px-4 py-4">
                  <div className="flex items-center gap-4">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[image:var(--gradient-accent)] text-sm font-semibold text-white shadow-accent">
                      0{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-ink">{item.name}</p>
                      <p className="text-sm text-muted">Matched within a 2 km alert radius</p>
                    </div>
                  </div>
                  <span className="text-lg font-semibold text-ink">{item.count}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
