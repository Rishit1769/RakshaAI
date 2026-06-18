'use client';

import { useEffect, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

interface Volunteer {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

export default function NgoVolunteersPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [form, setForm] = useState({ name: '', email: '', tempPassword: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await api.get<Volunteer[]>('/ngo/volunteers');
      setVolunteers(response.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load volunteers.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  async function submit() {
    try {
      await api.post('/ngo/volunteers', form);
      setForm({ name: '', email: '', tempPassword: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create volunteer.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Manage Volunteers" subtitle="Create volunteer accounts and keep NGO-owned responders ready.">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Create volunteer">
          <div className="space-y-4">
            <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <FloatingLabelInput label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            <FloatingLabelInput label="Temporary Password" type="password" value={form.tempPassword} onChange={(event) => setForm((prev) => ({ ...prev, tempPassword: event.target.value }))} />
            <button type="button" className="btn-primary w-full" onClick={() => void submit()}>
              Create volunteer
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Current volunteers">
          {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
          <SimpleTable
            columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Password state' }]}
            rows={volunteers.map((item) => ({
              name: item.fullName,
              email: item.email,
              status: item.mustChangePassword ? 'Temp password' : 'Ready',
            }))}
          />
        </SectionCard>
      </div>
    </AppShell>
  );
}
