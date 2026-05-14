'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
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
    <main className="min-h-screen bg-light p-4 md:p-6">
      <div className="max-w-xl mx-auto card">
        <h1 className="text-xl font-bold text-navy">Volunteer Registration</h1>
        <p className="text-sm text-muted mt-1">Complete your responder profile to receive nearby SOS alerts.</p>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-navy">Skills (comma separated)</span>
            <input className="input-field mt-1" value={skills} onChange={(e) => setSkills(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-navy">Languages (comma separated)</span>
            <input className="input-field mt-1" value={languages} onChange={(e) => setLanguages(e.target.value)} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-navy">Service radius (km)</span>
            <input className="input-field mt-1" value={radius} onChange={(e) => setRadius(e.target.value.replace(/\D/g, ''))} />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-navy">NGO Affiliation (optional)</span>
            <input className="input-field mt-1" value={ngo} onChange={(e) => setNgo(e.target.value)} />
          </label>
          {error && <p className="text-sm text-emergency">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? 'Saving...' : 'Create Volunteer Profile'}
          </button>
        </form>
      </div>
    </main>
  );
}
