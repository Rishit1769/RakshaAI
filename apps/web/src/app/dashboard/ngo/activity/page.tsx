'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { BarChart } from '@/components/ui/simple-charts';
import { ngoApi } from '@/lib/api/ngo.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type ActivityResponse = {
  summary: {
    mostActiveVolunteer: string;
    totalResponses: number;
    totalCases: number;
  };
  volunteers: Array<{
    volunteerId: string;
    volunteerName: string;
    sosResponses: number;
    incidentsHandled: number;
    lastActiveAt?: string | null;
  }>;
  chart: Array<{ label: string; value: number }>;
};

export default function NgoActivityPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await ngoApi.getActivity();
        setData((response.data ?? null) as ActivityResponse | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load NGO activity.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Activity Log" subtitle="Thirty-day view across volunteer SOS responses, incident handling, and last activity to keep NGO operations measurable.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="metric-card">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">Most Active Volunteer</p>
            <p className="mt-3 text-2xl font-semibold text-ink">{data?.summary.mostActiveVolunteer ?? 'N/A'}</p>
          </Card>
          <Card className="metric-card">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">Total Responses</p>
            <p className="mt-3 text-4xl font-semibold text-ink">{data?.summary.totalResponses ?? 0}</p>
          </Card>
          <Card className="metric-card">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">Total Cases</p>
            <p className="mt-3 text-4xl font-semibold text-ink">{data?.summary.totalCases ?? 0}</p>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Response chart" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">Responses per volunteer</h2>
            <div className="mt-6">
              <BarChart data={data?.chart ?? []} />
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Volunteer table" />
            <h2 className="mt-5 text-xl font-semibold text-ink">Volunteer activity</h2>
            <div className="mt-6 overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-border/70 text-xs font-mono uppercase tracking-[0.14em] text-muted">
                    <th className="px-4 py-3">Volunteer</th>
                    <th className="px-4 py-3">SOS Responses</th>
                    <th className="px-4 py-3">Incidents Handled</th>
                    <th className="px-4 py-3">Last Active</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.volunteers ?? []).map((volunteer) => (
                    <tr key={volunteer.volunteerId} className="border-b border-border/40 last:border-b-0">
                      <td className="px-4 py-4 text-sm font-semibold text-ink">{volunteer.volunteerName}</td>
                      <td className="px-4 py-4 text-sm text-body">{volunteer.sosResponses}</td>
                      <td className="px-4 py-4 text-sm text-body">{volunteer.incidentsHandled}</td>
                      <td className="px-4 py-4 text-sm text-body">{volunteer.lastActiveAt ? new Date(volunteer.lastActiveAt).toLocaleString() : 'No recent activity'}</td>
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
