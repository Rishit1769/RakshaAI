'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { api, ApiError } from '@/lib/api/fetcher';

interface Volunteer {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

export default function NgoDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isAuthReady } = useProtectedRoute();
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user) return;
    if (user.role !== 'NGO') {
      router.replace('/dashboard');
    }
  }, [isAuthReady, isAuthenticated, router, user]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user || user.role !== 'NGO') return;
    void loadVolunteers();
  }, [isAuthReady, isAuthenticated, user]);

  async function loadVolunteers() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<Volunteer[]>('/ngo/volunteers');
      setVolunteers(response.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load volunteers.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post<Volunteer>('/ngo/volunteers', {
        name,
        email,
        tempPassword,
      });

      if (response.data) {
        setVolunteers((prev) => [response.data!, ...prev]);
        setName('');
        setEmail('');
        setTempPassword('');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create volunteer account.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  }

  if (!isAuthenticated || !user || user.role !== 'NGO') {
    return null;
  }

  return (
    <AppShell title="NGO Dashboard" subtitle={`Manage volunteer accounts linked to ${user.email}.`} backLabel="Dashboard">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="product-card space-y-4 p-8">
          <div>
            <h2 className="text-lg font-semibold text-ink">Create Volunteer</h2>
            <p className="mt-2 text-sm text-muted">Every volunteer created here is linked back to this NGO account.</p>
          </div>

          {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

          <FloatingLabelInput label="Name" type="text" value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} />
          <FloatingLabelInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
          <FloatingLabelInput label="Temporary Password" type="password" value={tempPassword} onChange={(event) => setTempPassword(event.target.value)} disabled={submitting} />

          <button type="button" className="btn-primary w-full" disabled={submitting} onClick={() => void handleCreate()}>
            {submitting ? 'Creating...' : 'Create Volunteer'}
          </button>
        </div>

        <div className="product-card overflow-hidden p-0">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-semibold text-ink">NGO Volunteers</h2>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-muted">Loading volunteers...</div>
          ) : volunteers.length === 0 ? (
            <div className="px-6 py-10 text-sm text-muted">No volunteers created yet.</div>
          ) : (
            <div className="divide-y divide-hairline">
              {volunteers.map((volunteer) => (
                <div key={volunteer.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{volunteer.fullName}</p>
                    <span className="eyebrow bg-surface-soft">{volunteer.mustChangePassword ? 'Temp password' : 'Ready'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{volunteer.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
