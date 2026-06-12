'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useMutation } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';
import { LoadingState } from '@/components/ui/LoadingState';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-80 w-full" />,
});

const CATEGORIES = [
  { value: 'unsafe_area', label: 'Unsafe Area' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'broken_streetlight', label: 'Broken Streetlight' },
  { value: 'suspicious_behavior', label: 'Suspicious Behavior' },
  { value: 'unsafe_transport', label: 'Unsafe Transport' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'poor_lighting', label: 'Poor Lighting' },
  { value: 'other', label: 'Other' },
] as const;

export default function CreateReportPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [form, setForm] = useState({
    category: '' as string,
    title: '',
    description: '',
    address: '',
    city: '',
    latitude: null as number | null,
    longitude: null as number | null,
    isAnonymous: true,
  });
  const [mapCenter, setMapCenter] = useState({ latitude: 20.5937, longitude: 78.9629 });
  const [locating, setLocating] = useState(false);
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  useEffect(() => {
    setLocating(true);
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setMapCenter({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false)
    );
  }, []);

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/community', {
        ...form,
        latitude: form.latitude!,
        longitude: form.longitude!,
      }),
    onSuccess: () => router.push('/community'),
  });

  if (!isAuthenticated) return null;

  const isValid = Boolean(form.category) && form.description.trim().length >= 5 && form.latitude !== null && form.longitude !== null;

  function handleSubmit() {
    if (form.latitude === null || form.longitude === null) {
      setPinError('Please mark the unsafe area on the map before submitting.');
      return;
    }

    setPinError('');
    mutation.mutate();
  }

  return (
    <div className="min-h-screen bg-light transition-colors duration-200 dark:bg-[#0B1026]">
      <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0d1628]">
        <button
          onClick={() => router.back()}
          className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-navy hover:bg-gray-50 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
        >
          Back
        </button>
        <h1 className="text-base font-bold text-navy dark:text-white">Submit Safety Report</h1>
      </header>

      <main className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
        <div className={`card text-sm ${locating ? 'text-muted' : 'text-safe'}`}>
          {locating
            ? 'Acquiring GPS location for map centering...'
            : 'Click on the map to mark the exact unsafe area. One report can have one pin, and clicking again will move it.'}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            <SafetyMap
              center={mapCenter}
              zoom={14}
              className="h-[28rem] w-full"
              placementMode
              selectedLocation={form.latitude !== null && form.longitude !== null ? { latitude: form.latitude, longitude: form.longitude } : null}
              onMapClick={({ latitude, longitude }) => {
                setForm((current) => ({ ...current, latitude, longitude }));
                setPinError('');
              }}
              showLegend
              showPoliceStations
            />

            <div className="rounded-2xl border border-navy/10 bg-white/90 px-4 py-3 text-sm text-navy shadow-soft dark:border-white/10 dark:bg-white/5 dark:text-white">
              <p className="font-semibold">Selected Coordinates</p>
              <p className="mt-1 text-sm text-muted">
                {form.latitude !== null && form.longitude !== null
                  ? `Lat: ${form.latitude.toFixed(4)}, Lng: ${form.longitude.toFixed(4)}`
                  : 'No unsafe area marked yet'}
              </p>
              {pinError ? <p className="mt-2 text-sm text-emergency">{pinError}</p> : null}
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-navy dark:text-white">Incident Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, category: cat.value }))}
                    className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition-colors ${
                      form.category === cat.value
                        ? 'border-primary bg-primary text-white'
                        : 'border-border bg-white text-navy hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-navy dark:text-white">Title (optional)</label>
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                className="input-field w-full"
                placeholder="Brief title..."
                maxLength={200}
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-semibold text-navy dark:text-white">Description *</label>
              <textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                className="input-field min-h-32 w-full resize-none"
                rows={5}
                placeholder="Describe what happened or what you observed..."
                maxLength={2000}
              />
              <p className="text-right text-xs text-muted">{form.description.length}/2000</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-navy dark:text-white">Address</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))}
                  className="input-field w-full"
                  placeholder="Street / landmark"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-navy dark:text-white">City</label>
                <input
                  type="text"
                  value={form.city}
                  onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))}
                  className="input-field w-full"
                  placeholder="City"
                />
              </div>
            </div>

            <div className="card flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-navy dark:text-white">Submit Anonymously</p>
                <p className="text-xs text-muted">Your identity will not be disclosed</p>
              </div>
              <button
                type="button"
                onClick={() => setForm((current) => ({ ...current, isAnonymous: !current.isAnonymous }))}
                className={`h-6 w-12 rounded-full transition-colors ${form.isAnonymous ? 'bg-primary' : 'bg-gray-300 dark:bg-white/20'}`}
              >
                <span className={`mx-0.5 block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isAnonymous ? 'translate-x-6' : 'translate-x-0'}`} />
              </button>
            </div>

            {mutation.isError ? (
              <p className="text-center text-sm text-emergency">Failed to submit report. Please try again.</p>
            ) : null}

            <button
              onClick={handleSubmit}
              disabled={!isValid || mutation.isPending}
              className="btn-primary w-full py-3 disabled:opacity-50"
            >
              {mutation.isPending ? 'Submitting...' : 'Submit Report'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
