'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';

export default function JourneyPage() {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [durationMins, setDurationMins] = useState('30');
  const [startedAt, setStartedAt] = useState<Date | null>(null);

  const eta = useMemo(() => {
    if (!startedAt) return null;
    const minutes = Number(durationMins) || 0;
    return new Date(startedAt.getTime() + minutes * 60_000);
  }, [startedAt, durationMins]);

  const isActive = !!startedAt;

  return (
    <AppShell title="Journey Mode" subtitle="Start monitored travel and keep faster escalation within reach." backLabel="Dashboard">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel p-8">
          <span className="eyebrow">Planned movement</span>
          <h2 className="display-subsection mt-6">A calmer travel workflow before anything goes wrong.</h2>
          <p className="mt-4 text-base leading-7 text-body">
            Set a destination, define an expected arrival window, and keep direct access to the safety map or SOS if your circumstances change.
          </p>
        </div>

        <div className="product-card space-y-5 p-8">
          <label className="block">
            <span className="text-sm font-medium text-ink">Destination</span>
            <input className="input-field mt-2" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Enter destination" aria-label="Destination" />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-ink">Expected arrival (minutes)</span>
            <input className="input-field mt-2" value={durationMins} onChange={(e) => setDurationMins(e.target.value.replace(/\D/g, ''))} inputMode="numeric" aria-label="Expected arrival in minutes" />
          </label>

          <div className="flex flex-wrap gap-3">
            {!isActive ? (
              <button type="button" className="btn-primary" onClick={() => setStartedAt(new Date())} disabled={!destination.trim()}>
                Start journey
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setStartedAt(null)}>
                End journey
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => router.push('/map')}>
              Open safety map
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push('/sos')}>
              Trigger SOS
            </button>
          </div>

          {isActive ? (
            <div className="rounded-xl bg-surface-card p-5">
              <p className="text-sm font-semibold text-ink">Journey in progress</p>
              <p className="mt-2 text-sm text-body">Destination: {destination}</p>
              {eta ? <p className="mt-1 text-sm text-muted">ETA: {eta.toLocaleTimeString()}</p> : null}
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
