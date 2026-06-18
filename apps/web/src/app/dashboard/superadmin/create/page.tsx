'use client';

import { useEffect, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard, SimpleTable } from '@/components/dashboard/DashboardPrimitives';
import { api, ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  mustChangePassword: boolean;
}

interface FormState {
  name: string;
  email: string;
  tempPassword: string;
}

const emptyForm: FormState = { name: '', email: '', tempPassword: '' };

export default function SuperadminCreatePage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [departmentForm, setDepartmentForm] = useState<FormState>(emptyForm);
  const [ngoForm, setNgoForm] = useState<FormState>(emptyForm);
  const [departments, setDepartments] = useState<ManagedUser[]>([]);
  const [ngos, setNgos] = useState<ManagedUser[]>([]);
  const [error, setError] = useState('');

  async function loadData() {
    try {
      const [departmentResponse, ngoResponse] = await Promise.all([
        api.get<ManagedUser[]>('/admin/departments'),
        api.get<ManagedUser[]>('/admin/ngos'),
      ]);

      setDepartments(departmentResponse.data ?? []);
      setNgos(ngoResponse.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load hierarchy accounts.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadData();
  }, [isAllowed]);

  async function create(kind: 'departments' | 'ngos', payload: FormState) {
    try {
      await api.post(`/admin/${kind}`, payload);
      if (kind === 'departments') setDepartmentForm(emptyForm);
      else setNgoForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create managed account.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Create Department and NGO Accounts" subtitle="Provision downstream hierarchy accounts and temporary credentials.">
      <div className="grid gap-6 xl:grid-cols-2">
        <ManagedCreateCard title="Create Police Department" form={departmentForm} setForm={setDepartmentForm} onSubmit={() => void create('departments', departmentForm)} />
        <ManagedCreateCard title="Create NGO" form={ngoForm} setForm={setNgoForm} onSubmit={() => void create('ngos', ngoForm)} />
      </div>

      {error ? <div className="mt-6 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="Police Departments">
          <SimpleTable columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Password state' }]} rows={departments.map((item) => ({ name: item.fullName, email: item.email, status: item.mustChangePassword ? 'Temp password' : 'Ready' }))} />
        </SectionCard>
        <SectionCard title="NGOs">
          <SimpleTable columns={[{ key: 'name', label: 'Name' }, { key: 'email', label: 'Email' }, { key: 'status', label: 'Password state' }]} rows={ngos.map((item) => ({ name: item.fullName, email: item.email, status: item.mustChangePassword ? 'Temp password' : 'Ready' }))} />
        </SectionCard>
      </div>
    </AppShell>
  );
}

function ManagedCreateCard({
  title,
  form,
  setForm,
  onSubmit,
}: {
  title: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onSubmit: () => void;
}) {
  return (
    <SectionCard title={title}>
      <div className="space-y-4">
        <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        <FloatingLabelInput label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
        <FloatingLabelInput label="Temporary Password" type="password" value={form.tempPassword} onChange={(event) => setForm((prev) => ({ ...prev, tempPassword: event.target.value }))} />
        <button type="button" className="btn-primary w-full" onClick={onSubmit}>
          Submit
        </button>
      </div>
    </SectionCard>
  );
}
