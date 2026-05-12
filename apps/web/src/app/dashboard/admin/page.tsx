'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

type OrgStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

interface Organization {
  id: string;
  organizationName: string;
  organizationType: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  status: OrgStatus;
  createdAt: string;
}

interface Stats {
  totalOrgs: number;
  pendingApprovals: number;
  approvedOrgs: number;
  suspendedOrgs: number;
}

const STATUS_COLORS: Record<OrgStatus, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  approved: 'bg-safe/15 text-safe border-safe/30',
  suspended: 'bg-emergency/15 text-emergency border-emergency/30',
  rejected: 'bg-white/10 text-white/40 border-white/20',
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, accessToken } = useAuthStore();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [stats, setStats] = useState<Stats>({ totalOrgs: 0, pendingApprovals: 0, approvedOrgs: 0, suspendedOrgs: 0 });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrgStatus | 'all'>('all');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendTarget, setSuspendTarget] = useState<string | null>(null);

  // Guard: must be super_admin
  useEffect(() => {
    if (!user) { router.replace('/auth/login'); return; }
    if (user.role !== 'super_admin') { router.replace('/dashboard'); }
  }, [user, router]);

  const authHeaders = { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken ?? ''}` };

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}&limit=50` : '?limit=50';
      const res = await fetch(`${API_BASE}/organizations${params}`, { headers: authHeaders });
      const data = (await res.json()) as { success: boolean; data?: { items: Organization[]; total: number } };
      if (!res.ok || !data.success) { setError('Failed to load organizations.'); return; }
      const items = data.data?.items ?? [];
      setOrgs(items);
      setStats({
        totalOrgs: data.data?.total ?? items.length,
        pendingApprovals: items.filter((o) => o.status === 'pending').length,
        approvedOrgs: items.filter((o) => o.status === 'approved').length,
        suspendedOrgs: items.filter((o) => o.status === 'suspended').length,
      });
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }, [statusFilter, accessToken]);

  useEffect(() => { void fetchOrgs(); }, [fetchOrgs]);

  async function approveOrg(id: string) {
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/organizations/${id}/approve`, { method: 'PATCH', headers: authHeaders });
      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) { setError(data.message); return; }
      await fetchOrgs();
    } catch { setError('Action failed.'); }
    finally { setActionLoading(null); }
  }

  async function suspendOrg(id: string) {
    if (!suspendReason.trim()) { setError('Please enter a suspension reason.'); return; }
    setActionLoading(id);
    try {
      const res = await fetch(`${API_BASE}/organizations/${id}/suspend`, {
        method: 'PATCH',
        headers: authHeaders,
        body: JSON.stringify({ reason: suspendReason }),
      });
      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) { setError(data.message); return; }
      setSuspendTarget(null);
      setSuspendReason('');
      await fetchOrgs();
    } catch { setError('Action failed.'); }
    finally { setActionLoading(null); }
  }

  if (!user || user.role !== 'super_admin') return null;

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1026] via-[#111827] to-[#0B1026] px-4 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Super Admin</h1>
            <p className="text-sm text-white/40 mt-0.5">Signed in as <span className="text-white/60">{user.email}</span></p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">SUPER ADMIN</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Orgs', value: stats.totalOrgs, color: 'text-white' },
            { label: 'Pending', value: stats.pendingApprovals, color: 'text-yellow-400' },
            { label: 'Approved', value: stats.approvedOrgs, color: 'text-safe' },
            { label: 'Suspended', value: stats.suspendedOrgs, color: 'text-emergency' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm p-5">
              <p className="text-xs text-white/40 mb-1">{s.label}</p>
              <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-emergency/10 border border-emergency/30 p-3.5">
            <svg className="w-4 h-4 text-emergency flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-emergency">{error}</p>
            <button onClick={() => setError('')} className="ml-auto text-emergency/50 hover:text-emergency">✕</button>
          </div>
        )}

        {/* Organizations */}
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
            <h2 className="font-semibold text-white">Organizations</h2>
            <div className="flex gap-2">
              {(['all', 'pending', 'approved', 'suspended'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={[
                    'px-3 py-1 rounded-lg text-xs font-medium transition-colors capitalize',
                    statusFilter === f ? 'bg-primary text-white' : 'bg-white/5 text-white/40 hover:text-white/70',
                  ].join(' ')}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <svg className="animate-spin w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : orgs.length === 0 ? (
            <div className="py-16 text-center text-white/30 text-sm">No organizations found.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {orgs.map((org) => (
                <div key={org.id} className="px-6 py-4 flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-white truncate">{org.organizationName}</p>
                      <span className={`px-2 py-0.5 rounded-full text-xs border capitalize ${STATUS_COLORS[org.status]}`}>{org.status}</span>
                    </div>
                    <p className="text-xs text-white/35 mt-0.5 capitalize">{org.organizationType.replace(/_/g, ' ')} · {org.city}, {org.state}</p>
                    <p className="text-xs text-white/25">{org.email}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {org.status === 'pending' && (
                      <button
                        onClick={() => approveOrg(org.id)}
                        disabled={actionLoading === org.id}
                        className="px-3 py-1.5 rounded-lg bg-safe/15 text-safe border border-safe/30 text-xs font-medium hover:bg-safe/25 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === org.id ? '…' : 'Approve'}
                      </button>
                    )}
                    {org.status === 'approved' && (
                      <button
                        onClick={() => setSuspendTarget(org.id)}
                        disabled={actionLoading === org.id}
                        className="px-3 py-1.5 rounded-lg bg-emergency/15 text-emergency border border-emergency/30 text-xs font-medium hover:bg-emergency/25 transition-colors disabled:opacity-50"
                      >
                        Suspend
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suspend modal */}
        {suspendTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-[#0B1026] p-6 shadow-2xl">
              <h3 className="font-semibold text-white mb-3">Suspend Organization</h3>
              <p className="text-sm text-white/40 mb-4">Please provide a reason for suspension.</p>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={3}
                className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-emergency focus:border-emergency resize-none mb-4"
                placeholder="Reason…"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => { setSuspendTarget(null); setSuspendReason(''); }}
                  className="flex-1 py-2.5 rounded-xl border border-white/15 text-white/50 hover:text-white text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => suspendOrg(suspendTarget)}
                  disabled={!suspendReason.trim() || !!actionLoading}
                  className="flex-1 py-2.5 rounded-xl bg-emergency text-white text-sm font-semibold hover:bg-emergency/90 transition-colors disabled:opacity-50"
                >
                  {actionLoading ? '…' : 'Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
