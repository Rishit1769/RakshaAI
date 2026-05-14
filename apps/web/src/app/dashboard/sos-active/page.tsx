'use client';

import { useEffect, useCallback } from 'react';
import { Suspense } from 'react';
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

  // Subscribe to realtime events for this alert
  const realtime = useSosRealtime(alertId);

  // Broadcast GPS location to responders every 5 seconds while alert is active
  useLocationBroadcast({
    alertId: realtime.isResolved || realtime.isCancelled ? null : alertId,
  });

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  // Redirect to dashboard when resolved or cancelled via socket
  useEffect(() => {
    if (realtime.isResolved || realtime.isCancelled) {
      setTimeout(() => router.push('/dashboard'), 2000);
    }
  }, [realtime.isResolved, realtime.isCancelled, router]);

  // Initial fetch for alert metadata (alert code, etc.)
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
    if (!alertId) { router.push('/dashboard'); return; }
    if (window.confirm('Cancel your SOS alert? Only do this if you are safe.')) {
      cancelMutation.mutate(alertId);
    }
  }, [alertId, cancelMutation, router]);

  if (!isAuthenticated) return null;

  const currentStatus = realtime.status ?? 'pending';
  const statusLabel: Record<string, string> = {
    pending: 'Waiting for responders…',
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
      icon: '📱',
    },
    {
      label: 'Nearby Volunteers',
      status: realtime.volunteerInfo
        ? `${realtime.volunteerInfo.volunteerName} accepted${realtime.volunteerInfo.etaSeconds ? ` · ETA ${Math.ceil(realtime.volunteerInfo.etaSeconds / 60)} min` : ''}`
        : 'Searching…',
      icon: '🦺',
    },
    {
      label: 'Live Location',
      status: realtime.latestLocation
        ? `Sharing (${realtime.latestLocation.latitude.toFixed(4)}, ${realtime.latestLocation.longitude.toFixed(4)})`
        : 'GPS active',
      icon: '📍',
    },
  ];

  return (
    <div className="min-h-screen bg-[#1a0a0a] flex flex-col items-center justify-center p-4">
      {/* Theme toggle — top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle size="sm" className="bg-white/10 text-white hover:bg-white/20" />
      </div>
      {/* Pulsing emergency ring */}
      <div className="relative flex items-center justify-center mb-8">
        <div
          className={`absolute w-64 h-64 rounded-full opacity-10 animate-ping ${
            realtime.isResolved ? 'bg-green-500' : 'bg-emergency'
          }`}
        />
        <div
          className={`absolute w-48 h-48 rounded-full opacity-20 animate-ping [animation-delay:0.5s] ${
            realtime.isResolved ? 'bg-green-500' : 'bg-emergency'
          }`}
        />
        <div
          className={`w-36 h-36 rounded-full flex flex-col items-center justify-center z-10 ${
            realtime.isResolved
              ? 'bg-green-600 shadow-[0_0_60px_rgba(34,197,94,0.6)]'
              : 'bg-emergency shadow-[0_0_60px_rgba(239,68,68,0.6)]'
          }`}
        >
          <span className="text-white font-black text-2xl tracking-wider">
            {realtime.isResolved ? '✓' : 'SOS'}
          </span>
          <span className="text-white/80 text-xs mt-1 uppercase tracking-wider">
            {realtime.isResolved ? 'SAFE' : currentStatus}
          </span>
        </div>
      </div>

      {/* Status heading */}
      <div className="text-center mb-8">
        <h1 className="text-white text-2xl font-bold mb-2">
          {realtime.isResolved ? 'You are safe' : 'Emergency Alert Active'}
        </h1>
        <p className="text-red-200 text-sm">
          {statusLabel[currentStatus] ?? 'Coordinating response…'}
        </p>
        {alertData?.alertCode && (
          <div className="mt-4 bg-white/10 rounded-xl px-6 py-3 inline-block">
            <p className="text-white text-xs font-mono">
              Code: <span className="font-bold">{alertData.alertCode}</span>
            </p>
          </div>
        )}
      </div>

      {/* Responder status rows */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {responderRows.map((item) => (
          <div
            key={item.label}
            className="bg-white/10 rounded-xl px-4 py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">{item.icon}</span>
              <span className="text-white text-sm font-medium">{item.label}</span>
            </div>
            <span className="text-green-300 text-xs font-semibold">{item.status}</span>
          </div>
        ))}
      </div>

      {/* Cancel */}
      {!realtime.isResolved && !realtime.isCancelled && (
        <button
          onClick={handleCancel}
          disabled={cancelMutation.isPending}
          className="border border-white/30 text-white/70 px-8 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
        >
          {cancelMutation.isPending ? 'Cancelling…' : "I'm Safe — Cancel Alert"}
        </button>
      )}

      {(realtime.isResolved || realtime.isCancelled) && (
        <p className="text-green-300 text-sm mt-2">Returning to dashboard…</p>
      )}

      {cancelMutation.isError && (
        <p className="text-red-300 text-xs mt-3">Failed to cancel. Please try again.</p>
      )}
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

