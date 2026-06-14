'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState, LoadingState } from '@/components/ui/LoadingState';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';

interface AlertItem {
  id: string;
  alertCode: string;
  alertType: string;
  severity: string;
  status: string;
  triggerAddress?: string;
  description?: string;
  escalationReason?: string;
}

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
    mutationFn: ({ alertId, reason: message }: { alertId: string; reason: string }) => api.post('/police/escalate', { alertId, reason: message }),
    onSuccess: () => {
      setEscalateId(null);
      setReason('');
      queryClient.invalidateQueries({ queryKey: ['police-alerts'] });
    },
  });

  if (!isAuthenticated) return null;

  const profile = (profileData as { data?: { isOnDuty?: boolean; badgeNumber?: string; rank?: string; station?: { name?: string } } } | undefined)?.data;
  const alerts = ((alertsData as { data?: AlertItem[] } | undefined)?.data) ?? [];

  if (noProfile) {
    return (
      <AppShell title="Police Dashboard" subtitle="Register your police account to access the emergency feed." backLabel="Dashboard">
        <div className="empty-state">
          <h1 className="text-xl font-semibold text-ink dark:text-white">Police Officer Registration</h1>
          <p className="mt-2 text-sm text-muted">Register your police account to access the emergency feed.</p>
          <button onClick={() => router.push('/police/register')} className="btn-primary mt-6">Register Police Account</button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Police Dashboard"
      subtitle={`${profile?.rank ? `${profile.rank} ` : ''}${profile?.badgeNumber ?? ''}${profile?.station?.name ? ` - ${profile.station.name}` : ''}`}
      backLabel="Dashboard"
      actions={<button onClick={() => dutyMutation.mutate(!profile?.isOnDuty)} disabled={dutyMutation.isPending} className="btn-secondary">{profile?.isOnDuty ? 'On Duty' : 'Off Duty'}</button>}
    >
      {escalateId ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-hairline bg-canvas p-4 shadow-card dark:border-white/10 dark:bg-[#14171d]">
            <h3 className="text-sm font-semibold text-ink dark:text-white">Escalation Reason</h3>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} className="textarea-field mt-3 min-h-28 resize-none" rows={3} placeholder="Describe why this alert needs escalation..." />
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setEscalateId(null); setReason(''); }} className="btn-secondary flex-1">Cancel</button>
              <button disabled={reason.length < 5 || escalateMutation.isPending} onClick={() => escalateMutation.mutate({ alertId: escalateId, reason })} className="btn-primary flex-1">
                {escalateMutation.isPending ? 'Escalating...' : 'Escalate'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Live Emergency Feed</h2>
        {isLoading ? <LoadingState label="Loading police alerts..." /> : null}
        {!isLoading && alerts.length === 0 ? <EmptyState icon="All clear" title="No active alerts" description="New incidents will appear here in real time." /> : null}
        {alerts.map((alert) => (
          <div key={alert.id} className="product-card space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-muted">{alert.alertCode}</p>
                <p className="text-sm font-semibold capitalize text-ink">{alert.alertType.replace(/_/g, ' ')}</p>
                {alert.triggerAddress ? <p className="text-xs text-muted">{alert.triggerAddress}</p> : null}
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="eyebrow bg-surface-soft capitalize">{alert.status}</span>
                <span className="badge-emergency">{alert.severity}</span>
              </div>
            </div>
            {alert.description ? <p className="text-sm text-body">{alert.description}</p> : null}
            {alert.escalationReason ? <p className="text-sm font-medium text-emergency">{alert.escalationReason}</p> : null}
            <div className="flex flex-col gap-2 pt-1 sm:flex-row">
              {alert.status !== 'accepted' ? <button onClick={() => assignMutation.mutate(alert.id)} disabled={assignMutation.isPending || !profile?.isOnDuty} className="btn-primary flex-1">Assign to Me</button> : null}
              {alert.status !== 'escalated' ? <button onClick={() => setEscalateId(alert.id)} disabled={!profile?.isOnDuty} className="btn-secondary flex-1">Escalate</button> : null}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
