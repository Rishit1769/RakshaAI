'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionBadge } from '@/components/ui/section-badge';
import { DualLineChart } from '@/components/ui/simple-charts';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-[32rem] w-full" />,
});

type OverviewResponse = {
  roleCounts: Record<string, number>;
  totals: {
    incidents: { allTime: number; last30Days: number };
    sosAlerts: { allTime: number; last30Days: number };
    activeHotspots: number;
    pendingModerationCount: number;
    safeZones: number;
    redZones: number;
  };
  chart: Array<{ date: string; incidents: number; sosAlerts: number }>;
  hotspotMap: {
    center: { latitude: number; longitude: number };
    markers: Array<{
      id: string;
      name: string;
      latitude: number;
      longitude: number;
      severity: 'LOW' | 'MEDIUM' | 'HIGH';
      reportCount: number;
      city?: string | null;
      state?: string | null;
      assignedOfficer?: string | null;
      departmentName?: string | null;
    }>;
  };
};

const severityColors: Record<'LOW' | 'MEDIUM' | 'HIGH', string> = {
  LOW: '#16a34a',
  MEDIUM: '#f59e0b',
  HIGH: '#dc2626',
};

export default function SuperadminOverviewPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await adminApi.getOverview();
        setData((response.data ?? null) as OverviewResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load superadmin overview.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  const chartData = (data?.chart ?? []).map((item) => ({
    label: item.date,
    primary: item.incidents,
    secondary: item.sosAlerts,
  }));

  const hotspotMarkers: MapMarker[] = (data?.hotspotMap.markers ?? []).map((marker) => ({
    id: marker.id,
    latitude: marker.latitude,
    longitude: marker.longitude,
    type: 'hotspot',
    label: marker.name,
    markerColor: severityColors[marker.severity],
    markerText: marker.severity === 'HIGH' ? 'HIGH' : marker.severity === 'MEDIUM' ? 'MED' : 'LOW',
    popupHtml: `<div style="min-width:220px"><strong>${marker.name}</strong><br/><span>${marker.city ?? 'Unknown city'}${marker.state ? `, ${marker.state}` : ''}</span><br/><span>Severity: ${marker.severity}</span><br/><span>Reports: ${marker.reportCount}</span><br/><span>Officer: ${marker.assignedOfficer ?? 'Unassigned'}</span></div>`,
  }));

  const totals = data?.totals;
  const roleCounts = data?.roleCounts ?? {};

  return (
    <AppShell title="Superadmin Overview" subtitle="Global control room for platform health, risk volume, and moderation pressure." showBack={false}>
      <div className="space-y-8">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Incident Reports" value={String(totals?.incidents.allTime ?? 0)} caption={`${totals?.incidents.last30Days ?? 0} in the last 30 days`} />
          <MetricCard title="SOS Alerts" value={String(totals?.sosAlerts.allTime ?? 0)} caption={`${totals?.sosAlerts.last30Days ?? 0} in the last 30 days`} />
          <MetricCard title="Active Hotspots" value={String(totals?.activeHotspots ?? 0)} caption="Live hotspot areas under oversight" />
          <MetricCard title="Moderation Pressure" value={String(totals?.pendingModerationCount ?? 0)} caption="Pending queue items across reports and comments" />
          <MetricCard title="SafeZones" value={String(totals?.safeZones ?? 0)} caption="Verified support locations in the system" />
          <MetricCard title="RedZones" value={String(totals?.redZones ?? 0)} caption="Escalated danger zones tracked globally" />
          <MetricCard title="Police Departments" value={String(roleCounts.POLICE_DEPARTMENT ?? 0)} caption="Department-level operational accounts" />
          <MetricCard title="Volunteers" value={String(roleCounts.VOLUNTEER ?? 0)} caption="Volunteer responders across active NGOs" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="30-day signal trend" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">Incidents and SOS alerts over the last 30 days</h2>
            <p className="mt-2 text-sm leading-7 text-muted">The chart uses the current dataset already available in the platform, without adding a new chart dependency.</p>
            <div className="mt-6">
              <DualLineChart data={chartData} primaryLabel="Incidents" secondaryLabel="SOS Alerts" />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Role distribution" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Account mix by role</h2>
            <div className="mt-6 grid gap-3">
              {[
                ['SUPERADMIN', roleCounts.SUPERADMIN ?? 0],
                ['POLICE_DEPARTMENT', roleCounts.POLICE_DEPARTMENT ?? 0],
                ['POLICEMAN', roleCounts.POLICEMAN ?? 0],
                ['NGO', roleCounts.NGO ?? 0],
                ['VOLUNTEER', roleCounts.VOLUNTEER ?? 0],
                ['USER', roleCounts.USER ?? 0],
              ].map(([label, value]) => (
                <div key={String(label)} className="panel-subtle flex items-center justify-between rounded-[1.25rem] px-4 py-3">
                  <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{label}</span>
                  <span className="text-lg font-semibold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionBadge label="National hotspot view" />
              <h2 className="mt-5 text-xl font-semibold text-ink">Hotspot markers across India</h2>
              <p className="mt-2 text-sm leading-7 text-muted">Read-only map centered on India. Marker color reflects the current hotspot severity derived from risk score.</p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs font-mono uppercase tracking-[0.14em] text-muted">
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#dc2626]" />High</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#f59e0b]" />Medium</span>
              <span className="inline-flex items-center gap-2"><span className="h-3 w-3 rounded-full bg-[#16a34a]" />Low</span>
            </div>
          </div>
          <div className="mt-6">
            <SafetyMap center={data?.hotspotMap.center ?? { latitude: 20.5937, longitude: 78.9629 }} zoom={5} markers={hotspotMarkers} className="h-[32rem] w-full" />
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function MetricCard({ title, value, caption }: { title: string; value: string; caption: string }) {
  return (
    <Card className="metric-card">
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{title}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.03em] text-ink">{value}</p>
      <p className="mt-2 text-sm leading-7 text-muted">{caption}</p>
    </Card>
  );
}
