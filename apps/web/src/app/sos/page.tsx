'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
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

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-[var(--color-muted)]">Checking session...</div>;

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen" data-emergency="true">
      <header className="app-header">
        <div className="page-container flex items-center gap-3 py-4">
          <button onClick={() => router.back()} className="btn-secondary" aria-label="Go back">
            Back
          </button>
          <div>
            <h1 className="text-lg font-semibold text-white">Emergency SOS</h1>
            <p className="text-sm text-white/70">High-priority alerting with freshest available location.</p>
          </div>
        </div>
      </header>

      <main className="page-container grid gap-6 py-8 lg:grid-cols-[0.92fr_1.08fr]">
        <div className="surface-panel p-8">
          <span className="eyebrow bg-white">High urgency flow</span>
          <h2 className="display-subsection mt-6 text-white">The action stays obvious when every second matters.</h2>
          <p className="mt-4 text-base leading-7 text-white/80">
            RakshaAI keeps this surface focused: choose the situation, add context if it helps, and send the alert without waiting on non-critical systems.
          </p>
          <div className={`mt-6 rounded-xl px-4 py-3 text-sm ${location ? 'bg-safe/10 text-safe-dark' : 'bg-warning/10 text-warning'}`}>
            {location ? locationError || `Location acquired (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})` : locationError || 'Acquiring your location... SOS can still be sent if this fails.'}
          </div>
          <a href="tel:112" className="btn-secondary mt-6">
            Call Emergency Services (112)
          </a>
        </div>

        <div className="product-card space-y-6 p-8">
          <div>
            <h2 className="text-lg font-semibold text-white">Type of Emergency</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {ALERT_TYPES.map((type) => (
                <button key={type.value} type="button" onClick={() => setSelectedType(type.value)} className={selectedType === type.value ? 'btn-primary h-auto w-full justify-start py-3' : 'btn-secondary h-auto w-full justify-start py-3'}>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-white" htmlFor="desc">
              Description <span className="font-normal text-white/65">(optional)</span>
            </label>
            <textarea
              id="desc"
              rows={4}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Briefly describe the situation..."
              maxLength={500}
              className="textarea-field min-h-28 resize-none"
            />
            <p className="mt-1 text-right text-xs text-white/65">{description.length}/500</p>
          </div>

          <div className="space-y-4 pt-2 text-center">
            <button className="btn-sos mx-auto block disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSos} disabled={sosMutation.isPending} aria-label="Send SOS emergency alert">
              {sosMutation.isPending ? '...' : 'SOS'}
            </button>
            <p className="text-sm text-white/75">
              {sosMutation.isPending ? 'Sending emergency alert...' : 'Tap to send your SOS after reviewing the details above'}
            </p>
          </div>

          {sosMutation.isError ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 px-4 py-3 text-sm text-emergency">Failed to send SOS. Please try again or call 112.</div> : null}
        </div>
      </main>
    </div>
  );
}
