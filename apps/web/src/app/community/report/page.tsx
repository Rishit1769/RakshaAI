'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useMutation } from '@tanstack/react-query';
import { AppShell } from '@/components/layout/AppShell';
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
    mutationFn: () => api.post('/community', { ...form, latitude: form.latitude!, longitude: form.longitude! }),
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
    <AppShell title="Submit Safety Report" subtitle="Mark the area, describe the issue, and share local context." backHref="/community" backLabel="Community">
      <div className="space-y-6">
        <div className={`product-card text-sm ${locating ? 'text-muted' : 'text-safe'}`}>
          {locating ? 'Acquiring GPS location for map centering...' : 'Click on the map to mark the exact unsafe area. Clicking again will move the pin.'}
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <SafetyMap
              center={mapCenter}
              zoom={14}
              className="h-[30rem] w-full"
              placementMode
              selectedLocation={form.latitude !== null && form.longitude !== null ? { latitude: form.latitude, longitude: form.longitude } : null}
              onMapClick={({ latitude, longitude }) => {
                setForm((current) => ({ ...current, latitude, longitude }));
                setPinError('');
              }}
              showLegend
              showPoliceStations
            />

            <div className="product-card">
              <p className="text-sm font-semibold text-ink">Selected Coordinates</p>
              <p className="mt-2 text-sm text-muted">
                {form.latitude !== null && form.longitude !== null ? `Lat: ${form.latitude.toFixed(4)}, Lng: ${form.longitude.toFixed(4)}` : 'No unsafe area marked yet'}
              </p>
              {pinError ? <p className="mt-3 text-sm text-emergency">{pinError}</p> : null}
            </div>
          </div>

          <div className="product-card space-y-4">
            <div>
              <label className="text-sm font-semibold text-ink">Incident Type *</label>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button key={cat.value} type="button" onClick={() => setForm((current) => ({ ...current, category: cat.value }))} className={form.category === cat.value ? 'btn-primary w-full justify-start' : 'btn-secondary h-auto w-full justify-start py-3'}>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Title (optional)</label>
              <input type="text" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="input-field mt-2" placeholder="Brief title..." maxLength={200} />
            </div>

            <div>
              <label className="text-sm font-semibold text-ink">Description *</label>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="textarea-field mt-2 min-h-32 resize-none" rows={5} placeholder="Describe what happened or what you observed..." maxLength={2000} />
              <p className="mt-1 text-right text-xs text-muted">{form.description.length}/2000</p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold text-ink">Address</label>
                <input type="text" value={form.address} onChange={(event) => setForm((current) => ({ ...current, address: event.target.value }))} className="input-field mt-2" placeholder="Street / landmark" />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">City</label>
                <input type="text" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} className="input-field mt-2" placeholder="City" />
              </div>
            </div>

            <div className="surface-panel flex items-center justify-between p-4">
              <div>
                <p className="text-sm font-semibold text-ink">Submit anonymously</p>
                <p className="text-xs text-muted">Your identity will not be disclosed</p>
              </div>
              <button type="button" onClick={() => setForm((current) => ({ ...current, isAnonymous: !current.isAnonymous }))} className={`h-7 w-14 rounded-full transition-colors ${form.isAnonymous ? 'bg-primary' : 'bg-hairline'}`}>
                <span className={`mx-1 block h-5 w-5 rounded-full bg-white shadow transition-transform ${form.isAnonymous ? 'translate-x-7' : 'translate-x-0'}`} />
              </button>
            </div>

            {mutation.isError ? <p className="text-sm text-emergency">Failed to submit report. Please try again.</p> : null}

            <button onClick={handleSubmit} disabled={!isValid || mutation.isPending} className="btn-primary w-full">
              {mutation.isPending ? 'Submitting...' : 'Submit report'}
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
