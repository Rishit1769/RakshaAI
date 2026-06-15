'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
import { EmptyState, LoadingState } from '@/components/ui/LoadingState';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { api } from '@/lib/api/fetcher';

interface AlertItem {
  id: string;
  alertCode: string;
  alertType: string;
  severity: string;
  triggerAddress?: string;
  description?: string;
}

export default function VolunteerDashboard() {
  const router = useRouter();
  const { isAuthenticated, isAuthReady } = useProtectedRoute();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState<string | null>(null);

  const { data: profileData, isError: noProfile } = useQuery({
    queryKey: ['volunteer-profile'],
    queryFn: () => api.get('/volunteers/profile'),
    retry: false,
    enabled: isAuthReady && isAuthenticated,
  });

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['volunteer-alerts'],
    queryFn: () => api.get('/volunteers/alerts'),
    refetchInterval: 15_000,
    enabled: isAuthReady && isAuthenticated && !noProfile,
  });

  const availabilityMutation = useMutation({
    mutationFn: (status: string) => api.patch('/volunteers/availability', { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['volunteer-profile'] }),
  });

  const acceptMutation = useMutation({
    mutationFn: (alertId: string) => api.post('/volunteers/accept', { alertId }),
    onSuccess: () => {
      setAccepting(null);
      queryClient.invalidateQueries({ queryKey: ['volunteer-alerts'] });
    },
    onError: () => setAccepting(null),
  });

  if (!isAuthReady) return <LoadingState label="Checking session..." />;

  if (!isAuthenticated) return null;

  const profile = (profileData as { data?: { status?: string; verificationStatus?: string; totalResponses?: number; rating?: number } } | undefined)?.data;
  const alerts = ((alertsData as { data?: AlertItem[] } | undefined)?.data) ?? [];

  if (noProfile) {
    return (
      <AppShell title="Volunteer Dashboard" subtitle="Register to receive nearby SOS alerts." backLabel="Dashboard">
        <div className="empty-state">
          <h1 className="text-xl font-semibold text-ink dark:text-white">Become a Volunteer</h1>
          <p className="mt-2 text-sm text-muted">Register as a RakshaAI volunteer to help women in your area during emergencies.</p>
          <button onClick={() => router.push('/volunteer/register')} className="btn-primary mt-6">
            Register as Volunteer
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Volunteer Dashboard" subtitle="Availability, nearby alerts, and response status." backLabel="Dashboard">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="product-card text-center"><p className="text-2xl font-semibold text-ink">{profile?.totalResponses ?? 0}</p><p className="mt-2 text-xs text-muted">Responses</p></div>
          <div className="product-card text-center"><p className="text-2xl font-semibold text-ink">{profile?.rating ?? '0.00'}</p><p className="mt-2 text-xs text-muted">Rating</p></div>
          <div className="product-card text-center"><p className="text-sm font-semibold capitalize text-ink">{profile?.verificationStatus ?? 'pending'}</p><p className="mt-2 text-xs text-muted">Verification</p></div>
        </div>

        <div className="product-card flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-ink">Availability</p>
            <p className="text-xs text-muted">Toggle your duty status</p>
          </div>
          <div className="nav-pill-group">
            {(['available', 'busy', 'offline'] as const).map((status) => (
              <button key={status} disabled={availabilityMutation.isPending} onClick={() => availabilityMutation.mutate(status)} className={profile?.status === status ? 'nav-pill-active' : 'nav-pill'}>
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-ink">Active Alerts Near You</h2>
          {isLoading ? <LoadingState label="Loading nearby alerts..." /> : null}
          {!isLoading && alerts.length === 0 ? <EmptyState icon="All clear" title="No active alerts right now" description="You will see nearby emergencies here as soon as they come in." /> : null}
          {alerts.map((alert) => (
            <div key={alert.id} className="product-card space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted">{alert.alertCode}</p>
                  <p className="text-sm font-semibold capitalize text-ink">{alert.alertType.replace(/_/g, ' ')}</p>
                  {alert.triggerAddress ? <p className="text-xs text-muted">{alert.triggerAddress}</p> : null}
                </div>
                <span className="badge-emergency">{alert.severity}</span>
              </div>
              {alert.description ? <p className="text-sm text-body">{alert.description}</p> : null}
              <button disabled={accepting === alert.id || acceptMutation.isPending || profile?.status !== 'available'} onClick={() => { setAccepting(alert.id); acceptMutation.mutate(alert.id); }} className="btn-primary w-full">
                {accepting === alert.id ? 'Accepting...' : 'Accept Alert'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
