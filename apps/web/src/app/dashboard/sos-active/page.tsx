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
    {
      label: 'Emergency Contacts',
      status: 'Notified',
    },
    {
      label: 'Nearby Volunteers',
      status: realtime.volunteerInfo
        ? `${realtime.volunteerInfo.volunteerName} accepted${realtime.volunteerInfo.etaSeconds ? ` - ETA ${Math.ceil(realtime.volunteerInfo.etaSeconds / 60)} min` : ''}`
        : 'Searching...',
    },
    {
      label: 'Live Location',
      status: realtime.latestLocation
        ? `Sharing (${realtime.latestLocation.latitude.toFixed(4)}, ${realtime.latestLocation.longitude.toFixed(4)})`
        : 'GPS active',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#1a0a0a] p-4">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle size="sm" className="bg-white/10 text-white hover:bg-white/20" />
      </div>

      <div className="relative mb-8 flex items-center justify-center">
        <div className={`absolute h-64 w-64 animate-ping rounded-full opacity-10 ${realtime.isResolved ? 'bg-green-500' : 'bg-emergency'}`} />
        <div className={`absolute h-48 w-48 animate-ping rounded-full opacity-20 [animation-delay:0.5s] ${realtime.isResolved ? 'bg-green-500' : 'bg-emergency'}`} />
        <div className={`z-10 flex h-36 w-36 flex-col items-center justify-center rounded-full ${realtime.isResolved ? 'bg-green-600 shadow-[0_0_60px_rgba(34,197,94,0.6)]' : 'bg-emergency shadow-[0_0_60px_rgba(239,68,68,0.6)]'}`}>
          <span className="text-2xl font-black tracking-wider text-white">
            {realtime.isResolved ? 'SAFE' : 'SOS'}
          </span>
          <span className="mt-1 text-xs uppercase tracking-wider text-white/80">
            {realtime.isResolved ? 'Resolved' : currentStatus}
          </span>
        </div>
      </div>

      <div className="mb-8 text-center">
        <h1 className="mb-2 text-2xl font-bold text-white">
          {realtime.isResolved ? 'You are safe' : 'Emergency Alert Active'}
        </h1>
        <p className="text-sm text-red-200">
          {statusLabel[currentStatus] ?? 'Coordinating response...'}
        </p>
        {alertData?.alertCode ? (
          <div className="mt-4 inline-block rounded-xl bg-white/10 px-6 py-3">
            <p className="text-xs font-mono text-white">
              Code: <span className="font-bold">{alertData.alertCode}</span>
            </p>
          </div>
        ) : null}
      </div>

      <div className="mb-8 w-full max-w-sm space-y-3">
        {responderRows.map((item) => (
          <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/10 px-4 py-3">
            <span className="text-sm font-medium text-white">{item.label}</span>
            <span className="text-xs font-semibold text-green-300">{item.status}</span>
          </div>
        ))}
      </div>

      {!realtime.isResolved && !realtime.isCancelled ? (
        <button
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
          className="rounded-xl border border-white/30 px-8 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 disabled:opacity-50"
        >
          {cancelMutation.isPending ? 'Cancelling...' : "I'm Safe - Cancel Alert"}
        </button>
      ) : null}

      {realtime.isResolved || realtime.isCancelled ? (
        <p className="mt-2 text-sm text-green-300">Returning to dashboard...</p>
      ) : null}

      {cancelMutation.isError ? (
        <p className="mt-3 text-xs text-red-300">Failed to cancel. Please try again.</p>
      ) : null}
    </div>
  );
}

export default function SosActivePage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#1a0a0a]" />}>
      <SosActivePageContent />
    </Suspense>
  );
}
