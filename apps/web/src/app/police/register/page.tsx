'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api/fetcher';

export default function PoliceRegisterPage() {
  const router = useRouter();
  const [badgeNumber, setBadgeNumber] = useState('');
  const [rank, setRank] = useState('');
  const [stationId, setStationId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/police/register', {
        badgeNumber: badgeNumber.trim(),
        rank: rank.trim() || undefined,
        stationId: stationId.trim(),
      });
      router.push('/police/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register police profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Police Account Registration" subtitle="Link your user account with police operations." backLabel="Dashboard">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel p-8">
          <span className="eyebrow">Official response layer</span>
          <h2 className="display-subsection mt-6">Connect officer identity to the same emergency feed the platform already coordinates.</h2>
        </div>
        <form onSubmit={submit} className="product-card space-y-4 p-8">
          <label className="block">
            <span className="text-sm font-medium text-ink">Badge Number</span>
            <input className="input-field mt-2" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Rank (optional)</span>
            <input className="input-field mt-2" value={rank} onChange={(e) => setRank(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Station ID (UUID)</span>
            <input className="input-field mt-2" value={stationId} onChange={(e) => setStationId(e.target.value)} required />
          </label>
          {error ? <p className="text-sm text-emergency">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Create Police Profile'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
