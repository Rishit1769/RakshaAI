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
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {
          setLocationError('Location unavailable - using default coordinates.');
          setLocation({ latitude: 0, longitude: 0 });
        },
        { timeout: 5000, enableHighAccuracy: true }
      );
    } else {
      setLocation({ latitude: 0, longitude: 0 });
    }
  }, [isAuthenticated, router]);

  const sosMutation = useMutation({
    mutationFn: () =>
      sosApi.create({
        triggerMethod: 'tap',
        alertType: selectedType,
        latitude: location!.latitude,
        longitude: location!.longitude,
        description: description.trim() || undefined,
      }),
    onSuccess: (response) => {
      const alertId = (response as { data?: { id?: string } })?.data?.id;
      router.push(alertId ? `/dashboard/sos-active?alertId=${alertId}` : '/dashboard/sos-active');
    },
  });

  const handleSos = useCallback(() => {
    if (!location) return;
    sosMutation.mutate();
  }, [location, sosMutation]);

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-light">
      <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
        <button onClick={() => router.back()} className="rounded-lg p-1 text-muted hover:bg-gray-100 hover:text-navy" aria-label="Go back">
          Back
        </button>
        <h1 className="text-base font-bold text-navy">Emergency SOS</h1>
      </header>

      <main className="mx-auto max-w-sm space-y-6 p-4">
        <div className={`rounded-lg px-3 py-2 text-xs ${location ? 'bg-safe/10 text-safe' : 'bg-warning/10 text-amber-700'}`}>
          <span>
            {location
              ? locationError || `Location acquired (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
              : 'Acquiring your location...'}
          </span>
        </div>

        <div className="flex flex-col items-center gap-3 py-4">
          <button className="btn-sos disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSos} disabled={!location || sosMutation.isPending} aria-label="Send SOS emergency alert">
            {sosMutation.isPending ? '...' : 'SOS'}
          </button>
          <p className="text-center text-sm text-muted">
            {sosMutation.isPending ? 'Sending emergency alert...' : 'Tap to send an immediate emergency alert'}
          </p>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-semibold text-navy">Type of Emergency</h2>
          <div className="grid grid-cols-2 gap-2">
            {ALERT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`rounded-xl border px-3 py-2.5 text-sm transition-colors ${
                  selectedType === type.value
                    ? 'border-primary bg-primary/10 font-semibold text-primary'
                    : 'border-border bg-white text-navy hover:bg-gray-50'
                }`}
              >
                <span className="text-xs">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-navy" htmlFor="desc">
            Description <span className="font-normal text-muted">(optional)</span>
          </label>
          <textarea
            id="desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the situation..."
            maxLength={500}
            className="input-field resize-none text-sm"
          />
          <p className="mt-1 text-right text-xs text-muted">{description.length}/500</p>
        </div>

        {sosMutation.isError ? (
          <div className="rounded-xl border border-emergency/30 bg-emergency/10 px-4 py-3 text-sm text-emergency">
            Failed to send SOS. Please try again or call 112.
          </div>
        ) : null}

        <a href="tel:112" className="block rounded-xl border border-border py-3 text-center text-xs text-muted transition-colors hover:text-navy">
          Call Emergency Services (112)
        </a>
      </main>
    </div>
  );
}
