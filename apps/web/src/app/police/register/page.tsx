'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
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
    <main className="min-h-screen bg-light p-4 md:p-6">
      <div className="max-w-xl mx-auto card">
        <h1 className="text-xl font-bold text-navy">Police Account Registration</h1>
        <p className="text-sm text-muted mt-1">Link your user account with police operations.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-navy">Badge Number</span>
            <input className="input-field mt-1" value={badgeNumber} onChange={(e) => setBadgeNumber(e.target.value)} required />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-navy">Rank (optional)</span>
            <input className="input-field mt-1" value={rank} onChange={(e) => setRank(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-navy">Station ID (UUID)</span>
            <input className="input-field mt-1" value={stationId} onChange={(e) => setStationId(e.target.value)} required />
          </label>
          {error && <p className="text-sm text-emergency">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Create Police Profile'}
          </button>
        </form>
      </div>
    </main>
  );
}
