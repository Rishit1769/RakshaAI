'use client';

import { useEffect, useMemo, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { FieldShell, Select } from '@/components/ui/field';
import { SectionBadge } from '@/components/ui/section-badge';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type AuditRow = {
  id: string;
  timestamp: string;
  actorName: string;
  actorEmail: string;
  action: string;
  target: string;
  details: unknown;
  entityType?: string | null;
};

const ACTION_OPTIONS = [
  '',
  'UPDATED_USER_ROLE',
  'SUSPENDED_USER',
  'UNSUSPENDED_USER',
  'DELETED_USER',
  'CREATED_POLICE_DEPARTMENT',
  'CREATED_NGO',
  'ARCHIVED_POLICE_DEPARTMENT',
  'ARCHIVED_NGO',
  'ACTIVATED_HOTSPOT',
  'DEACTIVATED_HOTSPOT',
  'DISMISSED_MODERATION_INCIDENT',
  'DISMISSED_MODERATION_COMMENT',
  'REMOVED_MODERATION_INCIDENT',
  'REMOVED_MODERATION_COMMENT',
  'BANNED_MODERATION_AUTHOR',
];

export default function SuperadminAuditPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('pageSize', '20');
    if (action) params.set('action', action);
    return params;
  }, [action, page]);

  async function loadAuditLog() {
    try {
      const response = await adminApi.getAuditLog(query);
      const data = (response.data ?? {}) as { items?: AuditRow[]; pagination?: { totalPages?: number } };
      setRows(data.items ?? []);
      setTotalPages(data.pagination?.totalPages ?? 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load audit log.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadAuditLog();
  }, [isAllowed, query]);

  function exportCsv() {
    const header = ['Timestamp', 'Actor', 'Action', 'Target', 'Details'];
    const lines = rows.map((row) => [
      new Date(row.timestamp).toISOString(),
      `${row.actorName}${row.actorEmail ? ` <${row.actorEmail}>` : ''}`,
      row.action,
      row.target,
      JSON.stringify(row.details ?? {}),
    ]);
    const csv = [header, ...lines]
      .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `superadmin-audit-page-${page}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Audit Log" subtitle="Paginated admin actions with filterable action types and client-side CSV export for the current page." showBack={false}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="w-full max-w-sm">
              <SectionBadge label="Filters" />
              <div className="mt-5">
                <FieldShell label="Action type">
                  <Select value={action} onChange={(event) => { setPage(1); setAction(event.target.value); }}>
                    <option value="">All actions</option>
                    {ACTION_OPTIONS.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
                  </Select>
                </FieldShell>
              </div>
            </div>
            <button type="button" className="btn-primary" onClick={exportCsv}>
              Export CSV
            </button>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead className="bg-surface-soft/70">
                <tr>
                  {['Timestamp', 'Actor', 'Action', 'Target', 'Details'].map((label) => (
                    <th key={label} className="px-5 py-4 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id} className="border-t border-hairline align-top hover:bg-primary/[0.03]">
                    <td className="px-5 py-4 text-body">{new Date(row.timestamp).toLocaleString()}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-ink">{row.actorName}</p>
                      {row.actorEmail ? <p className="text-xs text-muted">{row.actorEmail}</p> : null}
                    </td>
                    <td className="px-5 py-4"><span className="eyebrow">{row.action}</span></td>
                    <td className="px-5 py-4 text-body">{row.target || row.entityType || 'N/A'}</td>
                    <td className="px-5 py-4 text-body">{typeof row.details === 'object' ? JSON.stringify(row.details) : String(row.details ?? '')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-hairline px-5 py-4">
            <p className="text-sm text-muted">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</button>
              <button type="button" className="btn-secondary" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</button>
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
