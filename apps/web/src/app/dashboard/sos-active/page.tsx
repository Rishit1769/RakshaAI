'use client';

import { useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sosApi } from '@/lib/api/sos.api';
import { useAuthStore } from '@/store/auth.store';
import { useSosRealtime } from '@/hooks/useSosRealtime';
import { useLocationBroadcast } from '@/hooks/useLocationBroadcast';
import ThemeToggle from '@/components/ui/ThemeToggle';

function SosActivePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const alertId = searchParams.get('alertId');
  const { isAuthenticated } = useAuthStore();
  const realtime = useSosRealtime(alertId);

  useLocationBroadcast({
    alertId: realtime.isResolved || realtime.isCancelled ? null : alertId,
  });

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (realtime.isResolved || realtime.isCancelled) {
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  }, [realtime.isResolved, realtime.isCancelled, router]);

  const { data: singleAlert } = useQuery({
    queryKey: ['sos-alert', alertId],
    queryFn: () => sosApi.getById(alertId!),
    enabled: isAuthenticated && !!alertId,
    staleTime: 30_000,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => sosApi.cancel(id),
    onSuccess: () => router.push('/dashboard'),
  });

  const alertData = (singleAlert as { data?: { id?: string; alertCode?: string } } | undefined)?.data;

  const handleCancel = useCallback(() => {
    if (!alertId) {
      router.push('/dashboard');
      return;
    }
    if (window.confirm('Cancel your SOS alert? Only do this if you are safe.')) {
      cancelMutation.mutate(alertId);
    }
  }, [alertId, cancelMutation, router]);

  if (!isAuthenticated) return null;

  const currentStatus = realtime.status ?? 'pending';
  const statusLabel: Record<string, string> = {
    pending: 'Waiting for responders...',
    active: 'Responders alerted',
    accepted: 'Responder en route',
    resolved: 'Alert resolved',
    cancelled: 'Alert cancelled',
    escalated: 'Escalated to police',
  };

  const responderRows = [
    { label: 'Emergency Contacts', status: 'Notified' },
    {
      label: 'Nearby Volunteers',
      status: realtime.volunteerInfo ? `${realtime.volunteerInfo.volunteerName} accepted${realtime.volunteerInfo.etaSeconds ? ` - ETA ${Math.ceil(realtime.volunteerInfo.etaSeconds / 60)} min` : ''}` : 'Searching...',
    },
    {
      label: 'Live Location',
      status: realtime.latestLocation ? `Sharing (${realtime.latestLocation.latitude.toFixed(4)}, ${realtime.latestLocation.longitude.toFixed(4)})` : 'GPS active',
    },
  ];

  return (
    <div className="min-h-screen" data-emergency="true">
      <header className="app-header">
        <div className="page-container flex items-center justify-between py-4">
          <div>
            <h1 className="text-lg font-semibold text-white">{realtime.isResolved ? 'You are safe' : 'Emergency Alert Active'}</h1>
            <p className="text-sm text-white/70">{statusLabel[currentStatus] ?? 'Coordinating response...'}</p>
          </div>
          <ThemeToggle size="sm" />
        </div>
      </header>

      <main className="page-container grid gap-6 py-8 lg:grid-cols-[0.82fr_1.18fr]">
        <div className="surface-panel flex flex-col items-center justify-center gap-6 p-8 text-center">
          <div className={`relative flex h-48 w-48 items-center justify-center rounded-full ${realtime.isResolved ? 'bg-safe text-white' : 'bg-emergency text-white'} shadow-emergency`}>
            <div className="text-center">
              <span className="block text-3xl font-semibold tracking-[0.18em]">{realtime.isResolved ? 'SAFE' : 'SOS'}</span>
              <span className="mt-2 block text-xs uppercase tracking-[0.2em] text-white/80">{realtime.isResolved ? 'Resolved' : currentStatus}</span>
            </div>
          </div>
          {alertData?.alertCode ? (
            <div className="rounded-[var(--rounded-lg)] bg-white/10 px-5 py-3 text-sm text-white">
              Code: <span className="font-semibold">{alertData.alertCode}</span>
            </div>
          ) : null}
          {!realtime.isResolved && !realtime.isCancelled ? (
            <button onClick={handleCancel} disabled={cancelMutation.isPending} className="btn-secondary">
              {cancelMutation.isPending ? 'Cancelling...' : "I'm Safe - Cancel Alert"}
            </button>
          ) : null}
          {realtime.isResolved || realtime.isCancelled ? <p className="text-sm text-white/75">Returning to dashboard...</p> : null}
          {cancelMutation.isError ? <p className="text-sm text-white/85">Failed to cancel. Please try again.</p> : null}
        </div>

        <div className="product-card space-y-4 p-8">
          <p className="text-sm font-semibold text-white">Response timeline</p>
          {responderRows.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-[var(--rounded-md)] border border-white/10 bg-white/5 px-4 py-4">
              <span className="text-sm font-medium text-white">{item.label}</span>
              <span className="text-sm text-white/75">{item.status}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default function SosActivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <SosActivePageContent />
    </Suspense>
  );
}
