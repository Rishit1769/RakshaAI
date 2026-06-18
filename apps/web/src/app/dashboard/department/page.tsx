'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { api, ApiError } from '@/lib/api/fetcher';

interface Policeman {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

export default function DepartmentDashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isAuthReady } = useProtectedRoute();
  const [policemen, setPolicemen] = useState<Policeman[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [tempPassword, setTempPassword] = useState('');
  const [badgeNumber, setBadgeNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user) return;
    if (user.role !== 'POLICE_DEPARTMENT') {
      router.replace('/dashboard');
    }
  }, [isAuthReady, isAuthenticated, router, user]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user || user.role !== 'POLICE_DEPARTMENT') return;
    void loadPolicemen();
  }, [isAuthReady, isAuthenticated, user]);

  async function loadPolicemen() {
    setLoading(true);
    setError('');

    try {
      const response = await api.get<Policeman[]>('/department/policemen');
      setPolicemen(response.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load policemen.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    setError('');

    try {
      const response = await api.post<Policeman>('/department/policemen', {
        name,
        email,
        tempPassword,
        badgeNumber,
      });

      if (response.data) {
        setPolicemen((prev) => [response.data!, ...prev]);
        setName('');
        setEmail('');
        setTempPassword('');
        setBadgeNumber('');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create policeman account.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  }

  if (!isAuthenticated || !user || user.role !== 'POLICE_DEPARTMENT') {
    return null;
  }

  return (
    <AppShell title="Police Department" subtitle={`Manage policeman accounts linked to ${user.email}.`} backLabel="Dashboard">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="product-card space-y-4 p-8">
          <div>
            <h2 className="text-lg font-semibold text-ink">Create Policeman</h2>
            <p className="mt-2 text-sm text-muted">Every policeman created here is linked back to this department account.</p>
          </div>

          {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

          <FloatingLabelInput label="Name" type="text" value={name} onChange={(event) => setName(event.target.value)} disabled={submitting} />
          <FloatingLabelInput label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={submitting} />
          <FloatingLabelInput label="Temporary Password" type="password" value={tempPassword} onChange={(event) => setTempPassword(event.target.value)} disabled={submitting} />
          <FloatingLabelInput label="Badge Number" type="text" value={badgeNumber} onChange={(event) => setBadgeNumber(event.target.value)} disabled={submitting} />

          <button type="button" className="btn-primary w-full" disabled={submitting} onClick={() => void handleCreate()}>
            {submitting ? 'Creating...' : 'Create Policeman'}
          </button>
        </div>

        <div className="product-card overflow-hidden p-0">
          <div className="border-b border-hairline px-6 py-4">
            <h2 className="font-semibold text-ink">Department Policemen</h2>
          </div>

          {loading ? (
            <div className="px-6 py-10 text-sm text-muted">Loading policemen...</div>
          ) : policemen.length === 0 ? (
            <div className="px-6 py-10 text-sm text-muted">No policemen created yet.</div>
          ) : (
            <div className="divide-y divide-hairline">
              {policemen.map((policeman) => (
                <div key={policeman.id} className="px-6 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-ink">{policeman.fullName}</p>
                    <span className="eyebrow bg-surface-soft">{policeman.mustChangePassword ? 'Temp password' : 'Ready'}</span>
                  </div>
                  <p className="mt-1 text-sm text-muted">{policeman.email}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
