'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { sosApi, AlertType } from '@/lib/api/sos.api';

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'general_danger', label: 'General Danger' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'assault', label: 'Assault' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'medical_emergency', label: 'Medical Emergency' },
  { value: 'kidnapping_risk', label: 'Kidnapping Risk' },
];

const panelMotion = {
  initial: { opacity: 0, y: 28 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] as const },
};

export default function SosPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthReady } = useProtectedRoute();
  const [selectedType, setSelectedType] = useState<AlertType>('general_danger');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device. SOS will still be sent.');
      return;
    }

    void refreshLocation();
  }, [isAuthReady, isAuthenticated]);

  const sosMutation = useMutation({
    mutationFn: ({ location: liveLocation }: { location?: { latitude: number; longitude: number; accuracy?: number } }) =>
      sosApi.create({
        triggerMethod: 'tap',
        alertType: selectedType,
        location: liveLocation,
        description: description.trim() || undefined,
      }),
    onSuccess: (response) => {
      const alertId = (response as { data?: { id?: string } })?.data?.id;
      router.push(alertId ? `/dashboard/sos-active?alertId=${alertId}` : '/dashboard/sos-active');
    },
  });

  const handleSos = useCallback(async () => {
    const liveLocation = await refreshLocation();
    sosMutation.mutate({ location: liveLocation ?? undefined });
  }, [sosMutation]);

  async function refreshLocation() {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device. SOS will still be sent.');
      setLocation(null);
      return null;
    }

    return new Promise<{ latitude: number; longitude: number; accuracy?: number } | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const nextLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          };
          setLocation(nextLocation);
          setLocationError('');
          resolve(nextLocation);
        },
        () => {
          setLocationError('Location permission denied or unavailable. SOS will still be sent.');
          setLocation(null);
          resolve(null);
        },
        { timeout: 5000, enableHighAccuracy: true, maximumAge: 0 }
      );
    });
  }

  if (!isAuthReady) {
    return <div className="min-h-screen bg-[#FAFAFA] px-6 py-20 text-sm text-slate-500">Checking session...</div>;
  }

  if (!isAuthenticated) return null;

  const locationLabel = location
    ? `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
    : 'Awaiting GPS lock';

  const locationStatus = location
    ? locationError || 'Location confirmed and attached to this alert.'
    : locationError || 'Trying to capture the most precise location available before dispatch.';

  return (
    <div className="min-h-screen bg-[#FAFAFA] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <button
            onClick={() => router.back()}
            className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            aria-label="Go back"
          >
            Back
          </button>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.1fr_0.9fr] xl:gap-12">
          <motion.section
            {...panelMotion}
            className="relative overflow-hidden rounded-[32px] bg-slate-900 px-6 py-8 text-slate-50 shadow-[0_30px_80px_rgba(15,23,42,0.28)] sm:px-8 sm:py-10 lg:px-10 lg:py-12"
            style={{
              backgroundImage:
                'radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)',
              backgroundSize: '32px 32px',
            }}
          >
            <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(225,29,72,0.22)_0%,rgba(225,29,72,0.05)_35%,transparent_70%)] blur-[150px]" />

            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-red-500/30 bg-red-500/5 px-5 py-2">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                <span className="font-mono text-xs uppercase tracking-[0.15em] text-red-500">High urgency flow</span>
              </div>

              <h1 className="mt-8 max-w-2xl font-calistoga text-5xl leading-[1.05] tracking-[-0.02em] text-slate-50">
                The action stays obvious when{' '}
                <span className="bg-gradient-to-r from-red-600 to-rose-500 bg-clip-text text-transparent">
                  every second matters
                </span>
                .
              </h1>

              <p className="mt-6 max-w-xl font-sans text-base leading-relaxed text-slate-200/85 sm:text-lg">
                RakshaAI keeps this emergency surface disciplined: select the situation, attach context only if it helps,
                and trigger response without fighting visual clutter or waiting on non-critical systems.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-300">Live location</p>
                  <p className="mt-3 font-mono text-lg text-slate-50">{locationLabel}</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">{locationStatus}</p>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
                  <p className="font-mono text-xs uppercase tracking-[0.16em] text-slate-300">Dispatch logic</p>
                  <p className="mt-3 text-lg font-semibold text-slate-50">High-priority alert delivery</p>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    Your selected emergency type and freshest location are packaged first so responders can act with less delay.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <a
                  href="tel:112"
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/15 bg-white/10 px-6 py-3 text-sm font-medium text-slate-50 transition hover:-translate-y-0.5 hover:bg-white/15 hover:shadow-md"
                >
                  Call Emergency Services (112)
                </a>
              </div>
            </div>
          </motion.section>

          <motion.section
            {...panelMotion}
            transition={{ ...panelMotion.transition, delay: 0.08 }}
            className="rounded-[32px] border border-slate-200/80 bg-[#FAFAFA] p-6 sm:p-8 lg:p-10"
          >
            <div className="inline-flex items-center gap-3 rounded-full border border-red-500/20 bg-red-500/[0.04] px-5 py-2">
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              <span className="font-mono text-xs uppercase tracking-[0.15em] text-red-500">Immediate activation</span>
            </div>

            <div className="mt-6">
              <h2 className="font-calistoga text-3xl leading-tight tracking-[-0.02em] text-slate-900">Emergency details</h2>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-slate-600">
                Choose the closest emergency classification, add any useful context, and trigger the alert from one unmistakable target.
              </p>
            </div>

            <div className="mt-8">
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">Type of emergency</h3>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {ALERT_TYPES.map((type) => {
                  const isActive = selectedType === type.value;

                  if (isActive) {
                    return (
                      <div
                        key={type.value}
                        className="rounded-xl bg-gradient-to-br from-red-600 via-rose-500 to-red-600 p-[2px] shadow-[0_14px_30px_rgba(225,29,72,0.16)]"
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedType(type.value)}
                          className="min-h-12 w-full rounded-[10px] bg-white px-4 py-4 text-left text-sm font-semibold text-slate-900 transition"
                        >
                          {type.label}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={type.value}
                      type="button"
                      onClick={() => setSelectedType(type.value)}
                      className="min-h-12 rounded-xl border border-slate-200 bg-white px-4 py-4 text-left text-sm font-medium text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    >
                      {type.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8">
              <label className="mb-3 block text-sm font-semibold uppercase tracking-[0.14em] text-slate-500" htmlFor="desc">
                Additional context
              </label>
              <textarea
                id="desc"
                rows={5}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Briefly describe the situation if it helps responders understand what is happening."
                maxLength={500}
                className="min-h-32 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-4 text-sm leading-relaxed text-slate-800 shadow-sm outline-none transition focus:border-rose-300 focus:ring-4 focus:ring-rose-100"
              />
              <p className="mt-2 text-right font-mono text-xs tracking-[0.08em] text-slate-400">{description.length}/500</p>
            </div>

            <div className="mt-10 text-center">
              <div className="relative mx-auto flex h-72 w-72 items-center justify-center">
                <div className="pointer-events-none absolute inset-7 rounded-full bg-rose-500/20 animate-ping" />
                <div className="pointer-events-none absolute inset-0 rounded-full border border-rose-200/70" />
                <button
                  className="relative z-10 flex h-56 w-56 scale-100 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-rose-500 text-center font-calistoga text-6xl tracking-[0.06em] text-white shadow-[0_8px_32px_rgba(225,29,72,0.4)] transition duration-200 hover:brightness-110 hover:shadow-[0_16px_40px_rgba(225,29,72,0.48)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={handleSos}
                  disabled={sosMutation.isPending}
                  aria-label="Send SOS emergency alert"
                >
                  {sosMutation.isPending ? '...' : 'SOS'}
                </button>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                {sosMutation.isPending
                  ? 'Sending emergency alert...'
                  : 'Press once to send the alert with the latest available location and selected emergency type.'}
              </p>
            </div>

            {sosMutation.isError ? (
              <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm leading-relaxed text-red-700">
                Failed to send SOS. Please try again or call 112 immediately.
              </div>
            ) : null}
          </motion.section>
        </div>
      </div>
    </div>
  );
}
