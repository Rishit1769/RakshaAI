'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function NgoZonesPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [zones, setZones] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await api.get<Array<Record<string, unknown>>>('/zones');
        setZones(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load zones.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Zone Visibility" subtitle="Read-first safe zone visibility for NGO support planning and routing.">
      <SectionCard title="Visible safe zones">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[{ key: 'name', label: 'Zone' }, { key: 'type', label: 'Type' }, { key: 'city', label: 'City' }, { key: 'support', label: '24x7' }]}
          rows={zones.map((item) => ({
            name: String(item.name ?? 'Unnamed zone'),
            type: String(item.type ?? 'unknown'),
            city: String(item.city ?? 'Unknown'),
            support: item.is24x7 ? 'Yes' : 'No',
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
