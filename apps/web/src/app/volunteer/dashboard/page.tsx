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
  triggerLatitude: number;
  triggerLongitude: number;
  triggerAddress?: string;
  description?: string;
  createdAt: string;
}

const SEVERITY_BADGE: Record<string, string> = {
  critical: 'badge-emergency',
  high: 'bg-orange-100 text-orange-800 border border-orange-200',
  medium: 'badge-warning',
  low: 'bg-blue-100 text-blue-800 border border-blue-200',
};

export default function VolunteerDashboard() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [accepting, setAccepting] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  const { data: profileData, isError: noProfile } = useQuery({
    queryKey: ['volunteer-profile'],
    queryFn: () => api.get('/volunteers/profile'),
    retry: false,
    enabled: isAuthenticated,
  });

  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['volunteer-alerts'],
    queryFn: () => api.get('/volunteers/alerts'),
    refetchInterval: 15_000,
    enabled: isAuthenticated && !noProfile,
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

  if (!isAuthenticated) return null;

  const profile = (profileData as { data?: { status?: string; verificationStatus?: string; totalResponses?: number; rating?: number } } | undefined)?.data;
  const alerts = ((alertsData as { data?: AlertItem[] } | undefined)?.data) ?? [];

  if (noProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-light p-6 dark:bg-[#0B1026]">
        <div className="card w-full max-w-sm space-y-4 text-center">
          <div className="text-3xl font-semibold text-primary">Volunteer</div>
          <h1 className="text-xl font-bold text-navy dark:text-white">Become a Volunteer</h1>
          <p className="text-sm text-muted">Register as a RakshaAI volunteer to help women in your area during emergencies.</p>
          <button onClick={() => router.push('/volunteer/register')} className="btn-primary w-full">
            Register as Volunteer
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
          <h1 className="text-base font-bold text-navy dark:text-white">Volunteer Dashboard</h1>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            profile?.status === 'available'
              ? 'bg-green-100 text-green-700'
              : profile?.status === 'busy'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-gray-100 text-gray-600'
          }`}
        >
          {profile?.status ?? 'offline'}
        </span>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{profile?.totalResponses ?? 0}</p>
            <p className="mt-1 text-xs text-muted">Responses</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{profile?.rating ?? '0.00'}</p>
            <p className="mt-1 text-xs text-muted">Rating</p>
          </div>
          <div className="card text-center">
            <p className={`text-sm font-semibold capitalize ${profile?.verificationStatus === 'verified' ? 'text-safe' : 'text-amber-600'}`}>
              {profile?.verificationStatus ?? 'pending'}
            </p>
            <p className="mt-1 text-xs text-muted">Status</p>
          </div>
        </div>

        <div className="card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-navy dark:text-white">Availability</p>
            <p className="text-xs text-muted">Toggle your duty status</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['available', 'busy', 'offline'] as const).map((status) => (
              <button
                key={status}
                disabled={availabilityMutation.isPending}
                onClick={() => availabilityMutation.mutate(status)}
                className={`interactive rounded-xl px-3 py-1.5 text-xs font-semibold ${
                  profile?.status === status
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-navy hover:bg-gray-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <h2 className="px-1 text-sm font-bold text-navy dark:text-white">Active Alerts Near You</h2>
          {isLoading ? <LoadingState label="Loading nearby alerts…" /> : null}
          {!isLoading && alerts.length === 0 ? (
            <EmptyState
              icon="All clear"
              title="No active alerts right now"
              description="You will see nearby emergencies here as soon as they come in."
            />
          ) : null}
          {alerts.map((alert) => (
            <div key={alert.id} className="card space-y-3 border-l-4 border-l-emergency">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono text-muted">{alert.alertCode}</p>
                  <p className="text-sm font-semibold capitalize text-navy dark:text-white">
                    {alert.alertType.replace(/_/g, ' ')}
                  </p>
                  {alert.triggerAddress ? <p className="text-xs text-muted">{alert.triggerAddress}</p> : null}
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${SEVERITY_BADGE[alert.severity] ?? 'badge-warning'}`}>
                  {alert.severity}
                </span>
              </div>
              {alert.description ? <p className="text-sm text-muted">{alert.description}</p> : null}
              <button
                disabled={accepting === alert.id || acceptMutation.isPending || profile?.status !== 'available'}
                onClick={() => {
                  setAccepting(alert.id);
                  acceptMutation.mutate(alert.id);
                }}
                className="btn-primary w-full py-2 text-sm disabled:opacity-50"
              >
                {accepting === alert.id ? 'Accepting…' : 'Accept Alert'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
