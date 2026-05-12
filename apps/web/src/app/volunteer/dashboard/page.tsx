'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const { isAuthenticated, user } = useAuthStore();
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

  // Register CTA if no profile
  if (noProfile) {
    return (
      <div className="min-h-screen bg-light flex flex-col items-center justify-center p-6">
        <div className="card max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">🦺</div>
          <h1 className="text-xl font-bold text-navy">Become a Volunteer</h1>
          <p className="text-muted text-sm">Register as a RakshaAI volunteer to help women in your area during emergencies.</p>
          <button
            onClick={() => router.push('/volunteer/register')}
            className="btn-primary w-full"
          >
            Register as Volunteer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/dashboard')} className="text-muted hover:text-navy p-1 rounded hover:bg-gray-100">←</button>
          <h1 className="text-base font-bold text-navy">Volunteer Dashboard</h1>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
          profile?.status === 'available' ? 'bg-green-100 text-green-700' :
          profile?.status === 'busy' ? 'bg-amber-100 text-amber-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {profile?.status ?? 'offline'}
        </span>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{profile?.totalResponses ?? 0}</p>
            <p className="text-xs text-muted mt-1">Responses</p>
          </div>
          <div className="card text-center">
            <p className="text-2xl font-bold text-primary">{profile?.rating ?? '0.00'}</p>
            <p className="text-xs text-muted mt-1">Rating</p>
          </div>
          <div className="card text-center">
            <p className={`text-sm font-semibold capitalize ${profile?.verificationStatus === 'verified' ? 'text-safe' : 'text-amber-600'}`}>
              {profile?.verificationStatus ?? 'pending'}
            </p>
            <p className="text-xs text-muted mt-1">Status</p>
          </div>
        </div>

        {/* Toggle availability */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-navy">Availability</p>
            <p className="text-xs text-muted">Toggle your duty status</p>
          </div>
          <div className="flex gap-2">
            {(['available', 'busy', 'offline'] as const).map((s) => (
              <button
                key={s}
                disabled={availabilityMutation.isPending}
                onClick={() => availabilityMutation.mutate(s)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                  profile?.status === s ? 'bg-primary text-white' : 'bg-gray-100 text-navy hover:bg-gray-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Alerts feed */}
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-navy px-1">Active Alerts Near You</h2>
          {isLoading && <p className="text-center text-muted text-sm py-8">Loading alerts…</p>}
          {!isLoading && alerts.length === 0 && (
            <div className="card text-center py-8">
              <p className="text-3xl mb-2">✅</p>
              <p className="text-muted text-sm">No active alerts right now</p>
            </div>
          )}
          {alerts.map((alert) => (
            <div key={alert.id} className="card border-l-4 border-l-emergency space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-mono text-muted">{alert.alertCode}</p>
                  <p className="text-sm font-semibold text-navy capitalize">{alert.alertType.replace(/_/g, ' ')}</p>
                  {alert.triggerAddress && <p className="text-xs text-muted">{alert.triggerAddress}</p>}
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${SEVERITY_BADGE[alert.severity] ?? 'badge-warning'}`}>
                  {alert.severity}
                </span>
              </div>
              {alert.description && <p className="text-xs text-muted">{alert.description}</p>}
              <button
                disabled={accepting === alert.id || acceptMutation.isPending || profile?.status !== 'available'}
                onClick={() => { setAccepting(alert.id); acceptMutation.mutate(alert.id); }}
                className="btn-primary w-full text-sm py-2 disabled:opacity-50"
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
