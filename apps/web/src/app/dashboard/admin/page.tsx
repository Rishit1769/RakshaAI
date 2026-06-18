'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { api, ApiError } from '@/lib/api/fetcher';

interface ManagedUser {
  id: string;
  fullName: string;
  email: string;
  role: string;
  mustChangePassword: boolean;
  isActive: boolean;
  createdAt: string;
}

interface FormState {
  name: string;
  email: string;
  tempPassword: string;
}

const emptyForm: FormState = { name: '', email: '', tempPassword: '' };

export default function SuperAdminDashboard() {
  const router = useRouter();
  const { user, isAuthenticated, isAuthReady } = useProtectedRoute();
  const [departments, setDepartments] = useState<ManagedUser[]>([]);
  const [ngos, setNgos] = useState<ManagedUser[]>([]);
  const [departmentForm, setDepartmentForm] = useState<FormState>(emptyForm);
  const [ngoForm, setNgoForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<'department' | 'ngo' | null>(null);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user) return;
    if (user.role !== 'SUPERADMIN') {
      router.replace('/dashboard');
    }
  }, [isAuthReady, isAuthenticated, router, user]);

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated || !user || user.role !== 'SUPERADMIN') return;
    void loadData();
  }, [isAuthReady, isAuthenticated, user]);

  async function loadData() {
    setLoading(true);
    setError('');

    try {
      const [departmentsResponse, ngosResponse] = await Promise.all([
        api.get<ManagedUser[]>('/admin/departments'),
        api.get<ManagedUser[]>('/admin/ngos'),
      ]);

      setDepartments(departmentsResponse.data ?? []);
      setNgos(ngosResponse.data ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load hierarchy accounts.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(kind: 'department' | 'ngo') {
    const form = kind === 'department' ? departmentForm : ngoForm;
    setSubmitting(kind);
    setError('');

    try {
      const response = await api.post<ManagedUser>(`/admin/${kind === 'department' ? 'departments' : 'ngos'}`, form);
      const created = response.data;

      if (created) {
        if (kind === 'department') {
          setDepartments((prev) => [created, ...prev]);
          setDepartmentForm(emptyForm);
        } else {
          setNgos((prev) => [created, ...prev]);
          setNgoForm(emptyForm);
        }
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create account.');
    } finally {
      setSubmitting(null);
    }
  }

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  }

  if (!isAuthenticated || !user || user.role !== 'SUPERADMIN') {
    return null;
  }

  return (
    <AppShell title="Superadmin" subtitle={`Create and oversee department and NGO accounts as ${user.email}.`} backLabel="Dashboard">
      <div className="space-y-8">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <section className="grid gap-6 lg:grid-cols-2">
          <ManagedCreateCard
            title="Create Department"
            subtitle="Provision police department accounts directly from the hierarchy root."
            form={departmentForm}
            setForm={setDepartmentForm}
            actionLabel={submitting === 'department' ? 'Creating...' : 'Create Department'}
            disabled={submitting !== null}
            onSubmit={() => void handleCreate('department')}
          />
          <ManagedCreateCard
            title="Create NGO"
            subtitle="Create NGO accounts that can later onboard their own volunteers."
            form={ngoForm}
            setForm={setNgoForm}
            actionLabel={submitting === 'ngo' ? 'Creating...' : 'Create NGO'}
            disabled={submitting !== null}
            onSubmit={() => void handleCreate('ngo')}
          />
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <ManagedListCard title="Police Departments" loading={loading} items={departments} emptyMessage="No police departments created yet." />
          <ManagedListCard title="NGOs" loading={loading} items={ngos} emptyMessage="No NGOs created yet." />
        </section>
      </div>
    </AppShell>
  );
}

function ManagedCreateCard(props: {
  title: string;
  subtitle: string;
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  actionLabel: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <div className="product-card space-y-4 p-8">
      <div>
        <h2 className="text-lg font-semibold text-ink">{props.title}</h2>
        <p className="mt-2 text-sm text-muted">{props.subtitle}</p>
      </div>

      <FloatingLabelInput label="Name" type="text" value={props.form.name} onChange={(event) => props.setForm((prev) => ({ ...prev, name: event.target.value }))} disabled={props.disabled} />
      <FloatingLabelInput label="Email" type="email" value={props.form.email} onChange={(event) => props.setForm((prev) => ({ ...prev, email: event.target.value }))} disabled={props.disabled} />
      <FloatingLabelInput label="Temporary Password" type="password" value={props.form.tempPassword} onChange={(event) => props.setForm((prev) => ({ ...prev, tempPassword: event.target.value }))} disabled={props.disabled} />

      <button type="button" className="btn-primary w-full" disabled={props.disabled} onClick={props.onSubmit}>
        {props.actionLabel}
      </button>
    </div>
  );
}

function ManagedListCard(props: { title: string; loading: boolean; items: ManagedUser[]; emptyMessage: string }) {
  return (
    <div className="product-card overflow-hidden p-0">
      <div className="border-b border-hairline px-6 py-4">
        <h2 className="font-semibold text-ink">{props.title}</h2>
      </div>

      {props.loading ? (
        <div className="px-6 py-10 text-sm text-muted">Loading...</div>
      ) : props.items.length === 0 ? (
        <div className="px-6 py-10 text-sm text-muted">{props.emptyMessage}</div>
      ) : (
        <div className="divide-y divide-hairline">
          {props.items.map((item) => (
            <div key={item.id} className="px-6 py-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-ink">{item.fullName}</p>
                <span className="eyebrow bg-surface-soft">{item.mustChangePassword ? 'Temp password' : 'Ready'}</span>
              </div>
              <p className="mt-1 text-sm text-muted">{item.email}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
