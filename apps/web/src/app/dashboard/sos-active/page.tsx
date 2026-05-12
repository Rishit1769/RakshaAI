'use client';

import { useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';
import { sosApi } from '@/lib/api/sos.api';
import { useAuthStore } from '@/store/auth.store';

export default function SosActivePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const alertId = searchParams.get('alertId');
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  // Poll active alert every 5 seconds
  const { data: alertData, isLoading } = useQuery({
    queryKey: ['sos-alert', alertId],
    queryFn: () => (alertId ? sosApi.getById(alertId) : sosApi.getActive()),
    refetchInterval: 5000,
    enabled: isAuthenticated,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => sosApi.cancel(id),
    onSuccess: () => router.push('/dashboard'),
  });

  const alert =
    alertId && alertData && 'id' in alertData
      ? alertData
      : Array.isArray(alertData?.data)
        ? alertData.data[0]
        : null;

  const handleCancel = useCallback(() => {
    if (!alert) { router.push('/dashboard'); return; }
    if (window.confirm('Cancel your SOS alert? Only do this if you are safe.')) {
      cancelMutation.mutate(alert.id as string);
    }
  }, [alert, cancelMutation, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#1a0a0a] flex flex-col items-center justify-center p-4">
      {/* Pulsing emergency ring */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-64 h-64 rounded-full bg-emergency opacity-10 animate-ping" />
        <div className="absolute w-48 h-48 rounded-full bg-emergency opacity-20 animate-ping [animation-delay:0.5s]" />
        <div className="w-36 h-36 rounded-full bg-emergency flex flex-col items-center justify-center shadow-[0_0_60px_rgba(239,68,68,0.6)] z-10">
          <span className="text-white font-black text-2xl tracking-wider">SOS</span>
          <span className="text-red-100 text-xs mt-1">ACTIVE</span>
        </div>
      </div>

      {/* Status */}
      <div className="text-center mb-8">
        <h1 className="text-white text-2xl font-bold mb-2">Emergency Alert Active</h1>
        <p className="text-red-200 text-sm">
          Your emergency contacts and nearby responders have been notified.
        </p>
        {alert && (
          <div className="mt-4 bg-white/10 rounded-xl px-6 py-3 inline-block">
            <p className="text-white text-xs font-mono">
              Code: <span className="font-bold">{(alert as { alertCode: string }).alertCode}</span>
            </p>
          </div>
        )}
      </div>

      {/* Responder status */}
      <div className="w-full max-w-sm space-y-3 mb-8">
        {[
          { label: 'Emergency Contacts', status: 'Notified', icon: '📱' },
          { label: 'Nearby Volunteers', status: isLoading ? 'Searching…' : 'Alert sent', icon: '🦺' },
          { label: 'Alert Recorded', status: 'Logged securely', icon: '🔒' },
        ].map((item) => (
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
      <button
        onClick={handleCancel}
        disabled={cancelMutation.isPending}
        className="border border-white/30 text-white/70 px-8 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors disabled:opacity-50"
      >
        {cancelMutation.isPending ? 'Cancelling…' : "I'm Safe — Cancel Alert"}
      </button>

      {cancelMutation.isError && (
        <p className="text-red-300 text-xs mt-3">
          Failed to cancel. Please try again.
        </p>
      )}
    </div>
  );
}
