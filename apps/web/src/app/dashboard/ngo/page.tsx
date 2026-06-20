'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { ngoApi } from '@/lib/api/ngo.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading NGO coverage map..." className="h-[28rem] w-full" />,
});

type OverviewResponse = {
  metrics: Array<{ label: string; value: number }>;
  map: {
    center: { latitude: number; longitude: number };
    coverage: Array<{ id: string; name: string; latitude: number; longitude: number; radiusMeters: number }>;
    volunteers: Array<{ id: string; name: string; latitude: number; longitude: number }>;
  };
  recentActivity: Array<{ id: string; type: string; title: string; subtitle: string; createdAt: string }>;
};

export default function NgoOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await ngoApi.getOverview();
        setData((response.data ?? null) as OverviewResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load NGO overview.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  const markers: MapMarker[] = [
    ...(data?.map.coverage ?? []).map((area) => ({
      id: area.id,
      latitude: area.latitude,
      longitude: area.longitude,
      type: 'safe_zone' as const,
      markerColor: '#0052FF',
      markerText: 'AREA',
      popupHtml: `<div style="min-width:220px"><strong>${area.name}</strong><br/><span>Coverage radius: ${Math.round(area.radiusMeters)}m</span></div>`,
    })),
    ...(data?.map.volunteers ?? []).map((volunteer) => ({
      id: volunteer.id,
      latitude: volunteer.latitude,
      longitude: volunteer.longitude,
      type: 'volunteer' as const,
      label: volunteer.name,
      popupHtml: `<div style="min-width:220px"><strong>${volunteer.name}</strong><br/><span>Volunteer last-known location</span></div>`,
    })),
  ];

  return (
    <AppShell title="NGO Overview" subtitle="Volunteer readiness, response demand, and the NGO’s current coverage footprint in one light-mode command view.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.metrics ?? []).map((metric) => (
            <Card key={metric.label} className="metric-card">
              <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{metric.label}</p>
              <p className="mt-3 text-4xl font-semibold tracking-[-0.04em] text-ink">{metric.value}</p>
              <div className="mt-4 h-1.5 w-24 rounded-full bg-[image:var(--gradient-accent)]" />
            </Card>
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Coverage map" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">Coverage and volunteer presence</h2>
            <p className="mt-2 text-sm leading-7 text-muted">Coverage centers reflect NGO-owned zones when available, otherwise the latest volunteer location cluster is used as a safe fallback.</p>
            <div className="mt-6">
              <SafetyMap center={data?.map.center ?? { latitude: 20.5937, longitude: 78.9629 }} zoom={11} markers={markers} className="h-[28rem] w-full" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Recent activity" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Latest SOS and assignment events</h2>
            <div className="mt-6 max-h-[28rem] space-y-3 overflow-y-auto pr-2">
              {(data?.recentActivity ?? []).map((item) => (
                <div key={item.id} className="rounded-[1.35rem] border border-border/70 bg-white/95 p-4 shadow-soft">
                  <div className="flex items-center justify-between gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.16em] ${item.type === 'SOS' ? 'bg-red-50 text-red-600' : 'bg-primary/10 text-primary'}`}>
                      {item.type}
                    </span>
                    <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-3 text-base font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-sm leading-7 text-muted">{item.subtitle}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
