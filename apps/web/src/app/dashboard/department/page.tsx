'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import type { MapMarker } from '@/components/SafetyMap';
import { departmentApi } from '@/lib/api/department.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading command map..." className="h-[28rem] w-full" />,
});

type OverviewResponse = {
  metrics: Array<{ label: string; value: number }>;
  map: {
    center: { latitude: number; longitude: number };
    hotspots: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      radiusMeters: number;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      assignedOfficer?: string | null;
    }>;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
    createdAt: string;
  }>;
};

const severityColor: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#16a34a',
  MEDIUM: '#f59e0b',
  HIGH: '#dc2626',
};

export default function DepartmentOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await departmentApi.getOverview();
        setData((response.data ?? null) as OverviewResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load the department overview.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  const hotspotMarkers: MapMarker[] = (data?.map.hotspots ?? []).map((hotspot) => ({
    id: hotspot.id,
    latitude: hotspot.latitude,
    longitude: hotspot.longitude,
    type: 'hotspot',
    markerColor: severityColor[hotspot.severity],
    markerText: hotspot.severity === 'MEDIUM' ? 'MED' : hotspot.severity,
    popupHtml: `<div style="min-width:220px"><strong>${hotspot.name}</strong><br/><span>Severity: ${hotspot.severity}</span><br/><span>Radius: ${Math.round(hotspot.radiusMeters)}m</span><br/><span>Assigned: ${hotspot.assignedOfficer ?? 'Unassigned'}</span></div>`,
  }));

  return (
    <AppShell title="Department Overview" subtitle="Live command summary for officers, hotspots, incident pressure, and SOS volume across your current zone coverage.">
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
            <SectionBadge label="Zone command map" pulse />
            <div className="mt-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Hotspot coverage and officer assignments</h2>
                <p className="mt-2 text-sm leading-7 text-muted">Each marker reflects the department-owned hotspot and who is currently responsible for that area.</p>
              </div>
            </div>
            <div className="mt-6">
              <SafetyMap center={data?.map.center ?? { latitude: 20.5937, longitude: 78.9629 }} zoom={11} markers={hotspotMarkers} className="h-[28rem] w-full" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Recent operational feed" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Latest SOS and incident updates</h2>
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
              {!data?.recentActivity?.length ? <p className="text-sm text-muted">Recent department activity will appear here as new SOS alerts and incident reports enter your coverage.</p> : null}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
