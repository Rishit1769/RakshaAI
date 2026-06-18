'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function SuperadminModerationPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;
    void (async () => {
      try {
        const response = await dashboardApi.getModerationQueue();
        setRows(response.data ?? []);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load moderation queue.');
      }
    })();
  }, [isAllowed]);

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Moderation Queue" subtitle="Flagged reports and unresolved pins requiring review.">
      <SectionCard title="Flagged community reports">
        {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
        <SimpleTable
          columns={[
            { key: 'title', label: 'Title' },
            { key: 'category', label: 'Category' },
            { key: 'city', label: 'City' },
            { key: 'score', label: 'Score' },
            { key: 'flagged', label: 'Flagged' },
          ]}
          rows={rows.map((row) => ({
            title: String(row.title ?? 'Untitled'),
            category: String(row.category ?? ''),
            city: String(row.city ?? 'Unknown'),
            score: String(row.score ?? 0),
            flagged: row.alertSent ? 'Alerted' : row.isVerified ? 'Verified' : 'Needs review',
          }))}
        />
      </SectionCard>
    </AppShell>
  );
}
