'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

type OrgStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

interface Organization {
  id: string;
  organizationName: string;
  organizationType: string;
  email: string;
  city: string;
  state: string;
  status: OrgStatus;
}

interface Stats {
  totalOrgs: number;
  pendingApprovals: number;
  approvedOrgs: number;
  suspendedOrgs: number;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isAuthReady } = useProtectedRoute();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrgs: 0, pendingApprovals: 0, approvedOrgs: 0, suspendedOrgs: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrgStatus | 'all'>('all');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user) return;

    if (user.role !== 'super_admin') {
      router.replace('/dashboard');
    }
  }, [isAuthReady, isAuthenticated, router, user]);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` };

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}&limit=50` : '?limit=50';
      const res = await fetch(`${API_BASE}/organizations${params}`, { headers: authHeaders });
      const data = (await res.json()) as { success: boolean; data?: { items: Organization[]; total: number } };
      if (!res.ok || !data.success) {
        setError('Failed to load organizations.');
        return;
      }
      const items = data.data?.items ?? [];
      setOrgs(items);
      setStats({
        totalOrgs: data.data?.total ?? items.length,
        pendingApprovals: items.filter((o) => o.status === 'pending').length,
        approvedOrgs: items.filter((o) => o.status === 'approved').length,
        suspendedOrgs: items.filter((o) => o.status === 'suspended').length,
      });
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, accessToken]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user || user.role !== 'super_admin') {
      return;
    }
    void fetchOrgs();
  }, [fetchOrgs, isAuthReady, isAuthenticated, user]);

  async function approveOrg(id: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/organizations/${id}/approve`, { method: 'PATCH', headers: authHeaders });
      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) {
        setError(data.message);
        return;
      }
      await fetchOrgs();
    } catch {
      setError('Action failed.');
    } finally {
      setActionLoading(null);
    }
  }

  async function suspendOrg(id: string) {
    if (!suspendReason.trim()) {
      setError('Please enter a suspension reason.');
      return;
    }
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/organizations/${id}/suspend`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ reason: suspendReason }),
      });
      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) {
        setError(data.message);
        return;
      }
      setSuspendTarget(null);
      setSuspendReason('');
      await fetchOrgs();
    } catch {
      setError('Action failed.');
    } finally {
      setActionLoading(null);
    }
  }

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-[var(--color-muted)]">Checking session...</div>;
  }

  if (!isAuthenticated || !user || user.role !== 'super_admin') return null;

  return (
    <AppShell title="Super Admin" subtitle={`Signed in as ${user.email}`} backLabel="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Total Orgs', value: stats.totalOrgs },
            { label: 'Pending', value: stats.pendingApprovals },
            { label: 'Approved', value: stats.approvedOrgs },
            { label: 'Suspended', value: stats.suspendedOrgs },
          ].map((item) => (
            <div key={item.label} className="product-card">
              <p className="text-xs uppercase tracking-[0.12em] text-muted">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
            </div>
          ))}
        </div>

        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <div className="product-card overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-6 py-4">
            <h2 className="font-semibold text-ink">Organizations</h2>
            <div className="nav-pill-group">
              {(['all', 'pending', 'approved', 'suspended'] as const).map((filter) => (
                <button key={filter} onClick={() => setStatusFilter(filter)} className={statusFilter === filter ? 'nav-pill-active capitalize' : 'nav-pill capitalize'}>
                  {filter}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="px-6 py-12 text-sm text-muted">Loading organizations...</div>
          ) : orgs.length === 0 ? (
            <div className="px-6 py-12 text-sm text-muted">No organizations found.</div>
          ) : (
            <div className="divide-y divide-hairline dark:divide-white/10">
              {orgs.map((org) => (
                <div key={org.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-ink">{org.organizationName}</p>
                      <span className="eyebrow bg-surface-soft capitalize">{org.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted capitalize">{org.organizationType.replace(/_/g, ' ')} - {org.city}, {org.state}</p>
                    <p className="text-xs text-muted">{org.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {org.status === 'pending' ? <button onClick={() => approveOrg(org.id)} disabled={actionLoading === org.id} className="btn-primary">{actionLoading === org.id ? '...' : 'Approve'}</button> : null}
                    {org.status === 'approved' ? <button onClick={() => setSuspendTarget(org.id)} disabled={actionLoading === org.id} className="btn-secondary">Suspend</button> : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {suspendTarget ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-sm rounded-xl border border-hairline bg-canvas p-6 shadow-card dark:border-white/10 dark:bg-[#14171d]">
              <h3 className="font-semibold text-ink dark:text-white">Suspend Organization</h3>
              <p className="mt-2 text-sm text-muted">Please provide a reason for suspension.</p>
              <textarea value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)} rows={3} className="textarea-field mt-4 min-h-28 resize-none" placeholder="Reason..." />
              <div className="mt-4 flex gap-2">
                <button onClick={() => { setSuspendTarget(null); setSuspendReason(''); }} className="btn-secondary flex-1">Cancel</button>
                <button onClick={() => suspendOrg(suspendTarget)} disabled={!suspendReason.trim() || !!actionLoading} className="btn-primary flex-1">{actionLoading ? '...' : 'Suspend'}</button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
