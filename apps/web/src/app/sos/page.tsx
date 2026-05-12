'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import { sosApi, AlertType } from '@/lib/api/sos.api';
import { useAuthStore } from '@/store/auth.store';

const ALERT_TYPES: { value: AlertType; label: string; emoji: string }[] = [
  { value: 'general_danger', label: 'General Danger', emoji: '⚠️' },
  { value: 'harassment', label: 'Harassment', emoji: '🚫' },
  { value: 'assault', label: 'Assault', emoji: '🆘' },
  { value: 'stalking', label: 'Stalking', emoji: '👁️' },
  { value: 'medical_emergency', label: 'Medical', emoji: '🏥' },
  { value: 'kidnapping_risk', label: 'Kidnapping Risk', emoji: '🔐' },
];

export default function SosPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [selectedType, setSelectedType] = useState<AlertType>('general_danger');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }

    // Acquire GPS location immediately on mount
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => {
          setLocationError('Location unavailable — using default coordinates.');
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
      {/* Header */}
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="text-muted hover:text-navy p-1 rounded-lg hover:bg-gray-100"
          aria-label="Go back"
        >
          ←
        </button>
        <h1 className="text-base font-bold text-navy">Emergency SOS</h1>
      </header>

      <main className="max-w-sm mx-auto p-4 space-y-6">
        {/* Location status */}
        <div
          className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg ${
            location
              ? 'bg-safe/10 text-safe'
              : 'bg-warning/10 text-amber-700'
          }`}
        >
          <span>{location ? '📍' : '⏳'}</span>
          <span>
            {location
              ? locationError || `Location acquired (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
              : 'Acquiring your location…'}
          </span>
        </div>

        {/* SOS Button */}
        <div className="flex flex-col items-center gap-3 py-4">
          <button
            className="btn-sos disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSos}
            disabled={!location || sosMutation.isPending}
            aria-label="Send SOS emergency alert"
          >
            {sosMutation.isPending ? '…' : 'SOS'}
          </button>
          <p className="text-sm text-muted text-center">
            {sosMutation.isPending
              ? 'Sending emergency alert…'
              : 'Tap to send an immediate emergency alert'}
          </p>
        </div>

        {/* Alert type selector */}
        <div>
          <h2 className="text-sm font-semibold text-navy mb-3">Type of Emergency</h2>
          <div className="grid grid-cols-2 gap-2">
            {ALERT_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedType(type.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm transition-colors ${
                  selectedType === type.value
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border bg-white text-navy hover:bg-gray-50'
                }`}
              >
                <span>{type.emoji}</span>
                <span className="text-xs">{type.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Optional description */}
        <div>
          <label className="block text-sm font-semibold text-navy mb-2" htmlFor="desc">
            Description <span className="text-muted font-normal">(optional)</span>
          </label>
          <textarea
            id="desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Briefly describe the situation…"
            maxLength={500}
            className="input-field resize-none text-sm"
          />
          <p className="text-xs text-muted mt-1 text-right">{description.length}/500</p>
        </div>

        {/* Error */}
        {sosMutation.isError && (
          <div className="bg-emergency/10 border border-emergency/30 text-emergency text-sm rounded-xl px-4 py-3">
            Failed to send SOS. Please try again or call 112.
          </div>
        )}

        {/* Emergency number */}
        <a
          href="tel:112"
          className="block text-center text-xs text-muted hover:text-navy border border-border rounded-xl py-3 transition-colors"
        >
          📞 Call Emergency Services (112)
        </a>
      </main>
    </div>
  );
}
