'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function PolicemanSosPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [alerts, setAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await api.get<Array<Record<string, unknown>>>('/police/alerts');
        setAlerts(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load police alerts.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Officer SOS Feed" subtitle="Operational alert feed for direct incident response and escalation.">
      <SectionCard title="Assigned and open alerts">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[{ key: 'code', label: 'Alert' }, { key: 'type', label: 'Type' }, { key: 'severity', label: 'Severity' }, { key: 'status', label: 'Status' }, { key: 'location', label: 'Location' }]}
          rows={alerts.map((item) => ({
            code: String(item.alertCode ?? 'Unknown'),
            type: String(item.alertType ?? 'unknown').replace(/_/g, ' '),
            severity: String(item.severity ?? 'unknown'),
            status: String(item.status ?? 'unknown'),
            location: String(item.triggerAddress ?? 'Location unavailable'),
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
