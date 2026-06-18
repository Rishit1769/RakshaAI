'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function NgoResponsePage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [data, setData] = useState<Record<string, unknown>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getNgoResponse();
        setData((response.data ?? {}) as Record<string, unknown>);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load NGO response data.');
      }
    })();
  }, [isAllowed]);

  const volunteers = (data.volunteers as Array<Record<string, unknown>> | undefined) ?? [];
  const alerts = (data.alerts as Array<Record<string, unknown>> | undefined) ?? [];

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Response Coordination" subtitle="See volunteer availability alongside the active SOS workload.">
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SectionCard title="Volunteer readiness">
          <SimpleTable
            columns={[{ key: 'name', label: 'Volunteer' }, { key: 'status', label: 'Status' }, { key: 'radius', label: 'Radius' }, { key: 'verification', label: 'Verification' }]}
            rows={volunteers.map((item) => ({
              name: String((item.user as Record<string, unknown> | undefined)?.fullName ?? 'Unknown'),
              status: String(item.status ?? 'unknown'),
              radius: `${String(item.serviceRadiusKm ?? 0)} km`,
              verification: String(item.verificationStatus ?? 'pending'),
            }))}
          />
        </SectionCard>
        <SectionCard title="Active SOS workload">
          <SimpleTable
            columns={[{ key: 'code', label: 'Alert' }, { key: 'type', label: 'Type' }, { key: 'status', label: 'Status' }, { key: 'assigned', label: 'Assigned volunteer' }]}
            rows={alerts.map((item) => ({
              code: String(item.alertCode ?? 'Unknown'),
              type: String(item.alertType ?? 'unknown').replace(/_/g, ' '),
              status: String(item.status ?? 'unknown'),
              assigned: String(((item.assignedVolunteer as Record<string, unknown> | undefined)?.user as Record<string, unknown> | undefined)?.fullName ?? 'Unassigned'),
            }))}
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
