'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { BarChart } from '@/components/ui/simple-charts';
import { departmentApi } from '@/lib/api/department.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type ActivityResponse = {
  summary: {
    mostActiveOfficer: string;
    totalResponses: number;
    averageResponseTimeMinutes: number;
  };
  officers: Array<{
    officerId: string;
    officerName: string;
    badgeNumber: string;
    sosResponses: number;
    incidentsResolved: number;
    lastActiveAt?: string | null;
  }>;
  chart: Array<{ label: string; value: number }>;
};

export default function DepartmentActivityPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await departmentApi.getActivity();
        setData((response.data ?? null) as ActivityResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load department activity.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Activity Report" subtitle="Thirty-day performance view across department officers, including response totals, incident closures, and the current most active responder.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="metric-card">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">Most Active Officer</p>
            <p className="mt-3 text-2xl font-semibold text-ink">{data?.summary.mostActiveOfficer ?? 'N/A'}</p>
          </Card>
          <Card className="metric-card">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">Total Responses</p>
            <p className="mt-3 text-4xl font-semibold text-ink">{data?.summary.totalResponses ?? 0}</p>
          </Card>
          <Card className="metric-card">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">Average Response Time</p>
            <p className="mt-3 text-4xl font-semibold text-ink">{data?.summary.averageResponseTimeMinutes ?? 0}m</p>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Response chart" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">Responses per officer</h2>
            <p className="mt-2 text-sm leading-7 text-muted">Lightweight charting keeps the dashboard bundle small while still giving the department a usable performance snapshot.</p>
            <div className="mt-6">
              <BarChart data={data?.chart ?? []} />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Officer table" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Grouped activity by officer</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-border/70 text-xs font-mono uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-3">Officer</th>
                    <th className="px-4 py-3">Badge</th>
                    <th className="px-4 py-3">SOS Responses</th>
                    <th className="px-4 py-3">Incidents Resolved</th>
                    <th className="px-4 py-3">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.officers ?? []).map((officer) => (
                    <tr key={officer.officerId} className="border-b border-border/40 last:border-b-0">
                      <td className="px-4 py-4 text-sm font-semibold text-ink">{officer.officerName}</td>
                      <td className="px-4 py-4 text-sm text-body">{officer.badgeNumber}</td>
                      <td className="px-4 py-4 text-sm text-body">{officer.sosResponses}</td>
                      <td className="px-4 py-4 text-sm text-body">{officer.incidentsResolved}</td>
                      <td className="px-4 py-4 text-sm text-body">{officer.lastActiveAt ? new Date(officer.lastActiveAt).toLocaleString() : 'No recent activity'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
