'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function VolunteerCasesPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [cases, setCases] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getVolunteerCases();
        setCases(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load assigned cases.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Assigned Cases" subtitle="Volunteer-visible case queue linked to current SOS assignments.">
      <SectionCard title="Current cases">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[{ key: 'code', label: 'Alert' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'severity', label: 'Severity' }, { key: 'location', label: 'Location' }]}
          rows={cases.map((item) => ({
            code: String(item.alertCode ?? 'Unknown'),
            type: String(item.alertType ?? 'unknown').replace(/_/g, ' '),
            status: String(item.status ?? 'unknown'),
            severity: String(item.severity ?? 'unknown'),
            location: String(item.triggerAddress ?? 'Location unavailable'),
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
