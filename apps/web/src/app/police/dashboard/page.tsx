'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState, LoadingState } from '@/components/ui/LoadingState';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';

interface AlertItem {
  id: string;
  alertCode: string;
  alertType: string;
  severity: string;
  status: string;
  triggerLatitude?: number | null;
  triggerLongitude?: number | null;
  triggerAddress?: string;
  description?: string;
  escalationReason?: string;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  active: 'bg-blue-100 text-blue-800',
  accepted: 'bg-green-100 text-green-800',
  escalated: 'bg-red-100 text-red-800',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-800 border border-red-200',
  high: 'bg-orange-100 text-orange-800',
  medium: 'bg-amber-100 text-amber-800',
  low: 'bg-blue-100 text-blue-800',
};

export default function PoliceDashboard() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [escalateId, setEscalateId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  const { data: profileData, isError: noProfile } = useQuery({
    queryKey: ['police-profile'],
    queryFn: () => api.get('/police/profile'),
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['police-alerts'],
    queryFn: () => api.get('/police/alerts'),
    refetchInterval: 10_000,
    enabled: isAuthenticated && !noProfile,
  });

  const dutyMutation = useMutation({
    mutationFn: (isOnDuty: boolean) => api.patch('/police/duty', { isOnDuty }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['police-profile'] }),
  });

  const assignMutation = useMutation({
    mutationFn: (alertId: string) => api.post('/police/assign', { alertId }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['police-alerts'] }),
  });

  const escalateMutation = useMutation({
    mutationFn: ({ alertId, reason: message }: { alertId: string; reason: string }) =>
      api.post('/police/escalate', { alertId, reason: message }),
    onSuccess: () => {
      setEscalateId(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['police-alerts'] });
    },
  });

  if (!isAuthenticated) return null;

  const profile = (profileData as { data?: { isOnDuty?: boolean; verificationStatus?: string; badgeNumber?: string; rank?: string; station?: { name?: string } } } | undefined)?.data;
  const alerts = ((alertsData as { data?: AlertItem[] } | undefined)?.data) ?? [];

  if (noProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light p-6 dark:bg-[#0B1026]">
        <div className="card w-full max-w-sm space-y-4 text-center">
          <div className="text-3xl font-semibold text-primary">Police</div>
          <h1 className="text-xl font-bold text-navy dark:text-white">Police Officer Registration</h1>
          <p className="text-sm text-muted">Register your police account to access the emergency feed.</p>
          <button onClick={() => router.push('/police/register')} className="btn-primary w-full">
            Register Police Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light transition-colors duration-200 dark:bg-[#0B1026]">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0d1628]">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="interactive rounded p-1 text-muted hover:bg-gray-100 hover:text-navy dark:hover:bg-white/5 dark:hover:text-white">
            ←
          </button>
          <div>
            <p className="text-sm font-bold text-navy dark:text-white">
              {profile?.rank ? `${profile.rank} ` : ''}
              {profile?.badgeNumber}
            </p>
            <p className="text-xs text-muted">{profile?.station?.name}</p>
          </div>
        </div>
        <button
          onClick={() => dutyMutation.mutate(!profile?.isOnDuty)}
          disabled={dutyMutation.isPending}
          className={`interactive rounded-xl px-3 py-1.5 text-xs font-semibold ${
            profile?.isOnDuty ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/70'
          }`}
        >
          {profile?.isOnDuty ? 'On Duty' : 'Off Duty'}
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        {escalateId ? (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm space-y-3 rounded-2xl bg-white p-4 dark:bg-[#0d1628]">
              <h3 className="text-sm font-bold text-navy dark:text-white">Escalation Reason</h3>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="input-field w-full resize-none"
                rows={3}
                placeholder="Describe why this alert needs escalation…"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setEscalateId(null);
                    setReason('');
                  }}
                  className="interactive flex-1 rounded-xl bg-gray-100 py-2 text-sm font-semibold text-navy dark:bg-white/10 dark:text-white"
                >
                  Cancel
                </button>
                <button
                  disabled={reason.length < 5 || escalateMutation.isPending}
                  onClick={() => escalateMutation.mutate({ alertId: escalateId, reason })}
                  className="interactive flex-1 rounded-xl bg-emergency py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {escalateMutation.isPending ? 'Escalating…' : 'Escalate'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        <h2 className="px-1 text-sm font-bold text-navy dark:text-white">Live Emergency Feed</h2>

        {isLoading ? <LoadingState label="Loading police alerts…" /> : null}
        {!isLoading && alerts.length === 0 ? (
          <EmptyState icon="All clear" title="No active alerts" description="New incidents will appear here in real time." />
        ) : null}

        {alerts.map((alert) => (
          <div key={alert.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-mono text-muted">{alert.alertCode}</p>
                <p className="text-sm font-semibold capitalize text-navy dark:text-white">
                  {alert.alertType.replace(/_/g, ' ')}
                </p>
                {alert.triggerAddress ? <p className="text-xs text-muted">{alert.triggerAddress}</p> : null}
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[alert.status] ?? ''}`}>
                  {alert.status}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_COLORS[alert.severity] ?? ''}`}>
                  {alert.severity}
                </span>
              </div>
            </div>

            {alert.description ? <p className="text-sm text-muted">{alert.description}</p> : null}
            {alert.escalationReason ? <p className="text-sm font-medium text-emergency">{alert.escalationReason}</p> : null}

            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              {alert.status !== 'accepted' ? (
                <button
                  onClick={() => assignMutation.mutate(alert.id)}
                  disabled={assignMutation.isPending || !profile?.isOnDuty}
                  className="btn-primary flex-1 py-2 text-sm disabled:opacity-50"
                >
                  Assign to Me
                </button>
              ) : null}
              {alert.status !== 'escalated' ? (
                <button
                  onClick={() => setEscalateId(alert.id)}
                  disabled={!profile?.isOnDuty}
                  className="interactive flex-1 rounded-xl border border-emergency py-2 text-sm font-semibold text-emergency hover:bg-red-50 disabled:opacity-50 dark:hover:bg-emergency/10"
                >
                  Escalate
                </button>
              ) : null}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
