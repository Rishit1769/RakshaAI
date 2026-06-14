'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { sosApi, AlertType } from '@/lib/api/sos.api';
import { useAuthStore } from '@/store/auth.store';

const ALERT_TYPES: { value: AlertType; label: string }[] = [
  { value: 'general_danger', label: 'General Danger' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'assault', label: 'Assault' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'medical_emergency', label: 'Medical Emergency' },
  { value: 'kidnapping_risk', label: 'Kidnapping Risk' },
];

export default function SosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [selectedType, setSelectedType] = useState<AlertType>('general_danger');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number; accuracy?: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported on this device. SOS will still be sent.');
      return;
    }

    void refreshLocation();
  }, [isAuthenticated, router]);

  const sosMutation = useMutation({
    mutationFn: ({ location }: { location?: { latitude: number; longitude: number; accuracy?: number } }) =>
      sosApi.create({
        triggerMethod: 'tap',
        alertType: selectedType,
        location,
        description: description.trim() || undefined,
      }),
    onSuccess: (response) => {
      const alertId = (response as { data?: { id?: string } })?.data?.id;
      router.push(alertId ? `/dashboard/sos-active?alertId=${alertId}` : '/dashboard/sos-active');
    },
  });

  const handleSos = useCallback(async () => {
    const liveLocation = await refreshLocation();

    sosMutation.mutate({
      location: liveLocation ?? undefined,
    });
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

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-[#091120] text-white">
      <header className="flex items-center gap-3 border-b border-white/10 bg-[#0D1628] px-4 py-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-medium text-slate-100 hover:bg-white/5"
          aria-label="Go back"
        >
          Back
        </button>
        <h1 className="text-base font-bold text-white">Emergency SOS</h1>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4 md:py-6">
        <div className={`rounded-2xl px-3 py-2 text-xs ${location ? 'bg-green-500/15 text-green-300' : 'bg-amber-500/10 text-amber-200'}`}>
          {location
            ? locationError || `Location acquired (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
            : locationError || 'Acquiring your location... SOS can still be sent if this fails.'}
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-white">Type of Emergency</h2>
          <div className="grid grid-cols-2 gap-2">
            {ALERT_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => setSelectedType(type.value)}
                className={`rounded-2xl border px-3 py-3 text-left text-sm font-medium transition-colors ${
                  selectedType === type.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-white/10 bg-white/5 text-slate-100 hover:bg-white/10'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-white" htmlFor="desc">
            Description <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            id="desc"
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Briefly describe the situation..."
            maxLength={500}
            className="min-h-28 w-full resize-none rounded-2xl border border-white/10 bg-[#111827] px-4 py-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <p className="mt-1 text-right text-xs text-slate-400">{description.length}/500</p>
        </div>

        <div className="space-y-3 pt-2">
          <button
            className="btn-sos mx-auto block disabled:cursor-not-allowed disabled:opacity-60"
            onClick={handleSos}
            disabled={sosMutation.isPending}
            aria-label="Send SOS emergency alert"
          >
            {sosMutation.isPending ? '...' : 'SOS'}
          </button>
          <p className="text-center text-sm text-slate-300">
            {sosMutation.isPending ? 'Sending emergency alert...' : 'Tap to send your SOS after reviewing the details above'}
          </p>
        </div>

        {sosMutation.isError ? (
          <div className="rounded-2xl border border-emergency/30 bg-emergency/10 px-4 py-3 text-sm text-emergency">
            Failed to send SOS. Please try again or call 112.
          </div>
        ) : null}

        <a
          href="tel:112"
          className="block rounded-2xl border border-white/20 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-white/5"
        >
          Call Emergency Services (112)
        </a>
      </main>
    </div>
  );
}
