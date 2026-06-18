'use client';

import { useEffect, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

interface Policeman {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

export default function DepartmentPolicemenPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [policemen, setPolicemen] = useState<Policeman[]>([]);
  const [form, setForm] = useState({ name: '', email: '', tempPassword: '', badgeNumber: '' });
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await api.get<Policeman[]>('/department/policemen');
      setPolicemen(response.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load policemen.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  async function submit() {
    try {
      await api.post('/department/policemen', form);
      setForm({ name: '', email: '', tempPassword: '', badgeNumber: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create policeman.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Manage Policemen" subtitle="Create officers, issue temporary credentials, and view downstream accounts.">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionCard title="Create policeman">
          <div className="space-y-4">
            <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <FloatingLabelInput label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            <FloatingLabelInput label="Temporary Password" type="password" value={form.tempPassword} onChange={(event) => setForm((prev) => ({ ...prev, tempPassword: event.target.value }))} />
            <FloatingLabelInput label="Badge Number" type="text" value={form.badgeNumber} onChange={(event) => setForm((prev) => ({ ...prev, badgeNumber: event.target.value }))} />
            <button type="button" className="btn-primary w-full" onClick={() => void submit()}>
              Create policeman
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Current policemen">
          {error ? <div className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
          <SimpleTable
            columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Password state' }]}
            rows={policemen.map((item) => ({
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
