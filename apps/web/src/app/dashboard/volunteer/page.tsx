'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { volunteerDashboardApi } from '@/lib/api/volunteer-dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading volunteer overview map..." className="h-[28rem] w-full" />,
});

type OverviewResponse = {
  ngoName: string;
  metrics: Array<{ label: string; value: string | number }>;
  map: {
    center: { latitude: number; longitude: number };
    coverage: Array<{ id: string; name: string; latitude: number; longitude: number; radiusMeters: number }>;
    lastCheckIn: { latitude: number; longitude: number; createdAt: string } | null;
  };
  recentActivity: Array<{ id: string; type: string; title: string; subtitle: string; createdAt: string }>;
};

export default function VolunteerOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await volunteerDashboardApi.getOverview();
        setData((response.data ?? null) as OverviewResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load volunteer overview.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  const markers: MapMarker[] = data?.map.lastCheckIn
    ? [{
        id: 'last-checkin',
        latitude: data.map.lastCheckIn.latitude,
        longitude: data.map.lastCheckIn.longitude,
        type: 'volunteer',
        label: 'Last Check-In',
        popupHtml: `<div style="min-width:220px"><strong>Last check-in</strong><br/><span>${new Date(data.map.lastCheckIn.createdAt).toLocaleString()}</span></div>`,
      }]
    : [];

  return (
    <AppShell title="Volunteer Overview" subtitle="Field-ready summary of your NGO affiliation, active assignments, nearby SOS demand, and last known presence.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern border-primary/15 bg-primary/5">
          <SectionBadge label="Volunteer status" pulse />
          <h2 className="mt-5 text-2xl font-semibold text-ink">You are a volunteer under {data?.ngoName ?? 'your NGO'}.</h2>
          <p className="mt-2 text-sm text-muted">This workspace keeps your SOS queue, assigned cases, check-ins, and situational-awareness maps in one place.</p>
        </Card>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {(data?.metrics ?? []).map((metric) => (
            <Card key={metric.label} className="metric-card">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{metric.label}</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-ink">{metric.value}</p>
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Coverage map" />
            <h2 className="mt-5 text-xl font-semibold text-ink">NGO coverage and your last check-in</h2>
            <div className="mt-6">
              <SafetyMap
                center={data?.map.center ?? { latitude: 20.5937, longitude: 78.9629 }}
                zoom={11}
                markers={markers}
                className="h-[28rem] w-full"
              />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Recent activity" />
            <div className="mt-5 space-y-3">
              {(data?.recentActivity ?? []).map((item) => (
                <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${item.type === 'SOS' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}>
                      {item.type}
                    </span>
                    <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm text-muted">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
