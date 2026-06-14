'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { api } from '@/lib/api/fetcher';

export default function VolunteerRegisterPage() {
  const router = useRouter();
  const [skills, setSkills] = useState('');
  const [languages, setLanguages] = useState('English,Hindi');
  const [radius, setRadius] = useState('5');
  const [ngo, setNgo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/volunteers/register', {
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        languagesSpoken: languages.split(',').map((s) => s.trim()).filter(Boolean),
        serviceRadiusKm: Number(radius) || 5,
        ngoAffiliation: ngo.trim() || undefined,
      });
      router.push('/volunteer/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to register volunteer profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell title="Volunteer Registration" subtitle="Complete your responder profile to receive nearby SOS alerts." backLabel="Dashboard">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="surface-panel p-8">
          <span className="eyebrow">Community response</span>
          <h2 className="display-subsection mt-6">Join the network that helps shorten the gap between alert and assistance.</h2>
        </div>
        <form onSubmit={submit} className="product-card space-y-4 p-8">
          <label className="block">
            <span className="text-sm font-medium text-ink">Skills (comma separated)</span>
            <input className="input-field mt-2" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Languages (comma separated)</span>
            <input className="input-field mt-2" value={languages} onChange={(e) => setLanguages(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">Service radius (km)</span>
            <input className="input-field mt-2" value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-ink">NGO Affiliation (optional)</span>
            <input className="input-field mt-2" value={ngo} onChange={(e) => setNgo(e.target.value)} />
          </label>
          {error ? <p className="text-sm text-emergency">{error}</p> : null}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Create Volunteer Profile'}
          </button>
        </form>
      </div>
    </AppShell>
  );
}
