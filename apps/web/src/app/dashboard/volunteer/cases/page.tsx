'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { volunteerDashboardApi } from '@/lib/api/volunteer-dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type CaseItem = {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  assignedAt: string;
  closedAt?: string | null;
  status: 'ACTIVE' | 'CLOSED';
};

export default function VolunteerCasesPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [tab, setTab] = useState<'active' | 'history'>('active');
  const [activeCases, setActiveCases] = useState<CaseItem[]>([]);
  const [historyCases, setHistoryCases] = useState<CaseItem[]>([]);
  const [error, setError] = useState('');

  async function load() {
    try {
      const [activeResponse, historyResponse] = await Promise.all([
        volunteerDashboardApi.getCases(),
        volunteerDashboardApi.getCaseHistory(),
      ]);
      setActiveCases((activeResponse.data ?? []) as CaseItem[]);
      setHistoryCases((historyResponse.data ?? []) as CaseItem[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load assigned cases.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  async function checkIn(caseId: string) {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          await volunteerDashboardApi.checkInCase(caseId, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          await load();
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Unable to check in for this case.');
        }
      },
      () => setError('Unable to get your current location for check-in.')
    );
  }

  async function closeCase(caseId: string) {
    try {
      await volunteerDashboardApi.closeCase(caseId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to close this case.');
    }
  }

  const rows = tab === 'active' ? activeCases : historyCases;

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Assigned Cases" subtitle="Track your NGO-assigned incidents, perform field check-ins, and review closed case history in one streamlined workflow.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex items-center justify-between gap-4">
            <SectionBadge label="Case workflow" pulse />
            <div className="flex gap-2 rounded-full border border-border/70 bg-slate-100 p-1">
              <button type="button" className={`rounded-full px-4 py-2 text-sm ${tab === 'active' ? 'bg-white text-ink shadow-soft' : 'text-muted'}`} onClick={() => setTab('active')}>
                Active
              </button>
              <button type="button" className={`rounded-full px-4 py-2 text-sm ${tab === 'history' ? 'bg-white text-ink shadow-soft' : 'text-muted'}`} onClick={() => setTab('history')}>
                History
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {rows.map((item) => (
              <div key={item.id} className="rounded-[1.4rem] border border-border/70 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{item.type}</p>
                    <p className="mt-1 text-sm text-muted">{item.location}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${item.severity === 'HIGH' ? 'bg-red-50 text-red-600' : item.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                    {item.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm text-body">Assigned: <span className="font-medium text-ink">{new Date(item.assignedAt).toLocaleString()}</span></p>
                {item.closedAt ? <p className="mt-1 text-sm text-body">Closed: <span className="font-medium text-ink">{new Date(item.closedAt).toLocaleString()}</span></p> : null}
                {tab === 'active' ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="btn-secondary min-h-10 px-4 py-2" onClick={() => void checkIn(item.id)}>
                      Check In
                    </button>
                    <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void closeCase(item.id)}>
                      Close Case
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
