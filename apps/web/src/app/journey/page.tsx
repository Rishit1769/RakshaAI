'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    <main className="min-h-screen bg-light dark:bg-[#0B1026] p-4 md:p-6">
      <div className="max-w-2xl mx-auto space-y-5">
        <header className="card">
          <h1 className="text-xl font-bold text-navy">Journey Mode</h1>
          <p className="text-sm text-muted mt-1">
            Start monitored travel. If you feel unsafe, trigger SOS immediately.
          </p>
        </header>

        <section className="card space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-navy">Destination</span>
            <input
              className="input-field mt-1"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="Enter destination"
              aria-label="Destination"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-navy">Expected arrival (minutes)</span>
            <input
              className="input-field mt-1"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value.replace(/\D/g, ''))}
              inputMode="numeric"
              aria-label="Expected arrival in minutes"
            />
          </label>

          <div className="flex flex-wrap gap-3">
            {!isActive ? (
              <button
                type="button"
                className="btn-primary"
                onClick={() => setStartedAt(new Date())}
                disabled={!destination.trim()}
              >
                Start Journey
              </button>
            ) : (
              <button type="button" className="btn-secondary" onClick={() => setStartedAt(null)}>
                End Journey
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={() => router.push('/map')}>
              Open Safety Map
            </button>
            <button type="button" className="btn-primary" onClick={() => router.push('/sos')}>
              Trigger SOS
            </button>
          </div>
        </section>

        {isActive && (
          <section className="card">
            <p className="text-sm font-semibold text-navy">Journey in progress</p>
            <p className="text-xs text-muted mt-1">Destination: {destination}</p>
            {eta && <p className="text-xs text-muted">ETA: {eta.toLocaleTimeString()}</p>}
          </section>
        )}
      </div>
    </main>
  );
}
