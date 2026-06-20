'use client';

import { useEffect, useMemo, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type ManagedItem = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  isActive: boolean;
  policemenCount?: number;
  activeHotspotCount?: number;
  volunteerCount?: number;
};

type FormState = {
  name: string;
  email: string;
  tempPassword: string;
};

const emptyForm: FormState = { name: '', email: '', tempPassword: '' };

export default function SuperadminCreatePage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [activeTab, setActiveTab] = useState<'departments' | 'ngos'>('departments');
  const [departments, setDepartments] = useState<ManagedItem[]>([]);
  const [ngos, setNgos] = useState<ManagedItem[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [emailError, setEmailError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentItems = useMemo(() => (activeTab === 'departments' ? departments : ngos), [activeTab, departments, ngos]);

  async function loadData() {
    try {
      const [departmentResponse, ngoResponse] = await Promise.all([adminApi.getDepartments(), adminApi.getNgos()]);
      setDepartments((((departmentResponse.data ?? {}) as { items?: ManagedItem[] }).items) ?? []);
      setNgos((((ngoResponse.data ?? {}) as { items?: ManagedItem[] }).items) ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load managed organizations.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadData();
  }, [isAllowed]);

  async function checkEmail() {
    if (!form.email.trim()) return;
    try {
      const response = await adminApi.checkEmail(form.email.trim());
      if (response.data?.exists) {
        setEmailError('That email is already registered.');
      } else {
        setEmailError('');
      }
    } catch {
      setEmailError('');
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    setError('');
    try {
      if (activeTab === 'departments') {
        await adminApi.createDepartment(form);
      } else {
        await adminApi.createNgo(form);
      }
      setForm(emptyForm);
      setModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create managed account.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setSubmitting(true);
    setError('');
    try {
      if (activeTab === 'departments') {
        await adminApi.deleteDepartment(deleteTarget.id);
      } else {
        await adminApi.deleteNgo(deleteTarget.id);
      }
      setDeleteTarget(null);
      await loadData();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to archive managed account.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Create Department / NGO" subtitle="Provision hierarchy owners, enforce temporary passwords, and review organization capacity." showBack={false}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionBadge label="Organization setup" />
              <h2 className="mt-5 text-xl font-semibold text-ink">Create downstream department and NGO owners</h2>
            </div>
            <div className="nav-pill-group">
              <button type="button" onClick={() => setActiveTab('departments')} className={activeTab === 'departments' ? 'nav-pill-active' : 'nav-pill'}>
                Departments
              </button>
              <button type="button" onClick={() => setActiveTab('ngos')} className={activeTab === 'ngos' ? 'nav-pill-active' : 'nav-pill'}>
                NGOs
              </button>
            </div>
          </div>
          <div className="mt-6 flex justify-end">
            <button type="button" className="btn-primary" onClick={() => { setForm(emptyForm); setEmailError(''); setModalOpen(true); }}>
              Create {activeTab === 'departments' ? 'Department' : 'NGO'}
            </button>
          </div>
        </Card>

        <Card padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-[920px] w-full text-left text-sm">
              <thead className="bg-surface-soft/70">
                <tr>
                  {['Name', 'Email', 'Created At', activeTab === 'departments' ? 'Policemen' : 'Volunteers', activeTab === 'departments' ? 'Hotspots' : 'Status', 'Actions'].map((label) => (
                    <th key={label} className="px-5 py-4 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-muted">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item) => (
                  <tr key={item.id} className="border-t border-hairline hover:bg-primary/[0.03]">
                    <td className="px-5 py-4 font-semibold text-ink">{item.name}</td>
                    <td className="px-5 py-4 text-body">{item.email}</td>
                    <td className="px-5 py-4 text-body">{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td className="px-5 py-4 text-body">{activeTab === 'departments' ? item.policemenCount ?? 0 : item.volunteerCount ?? 0}</td>
                    <td className="px-5 py-4 text-body">{activeTab === 'departments' ? item.activeHotspotCount ?? 0 : item.isActive ? 'Active' : 'Archived'}</td>
                    <td className="px-5 py-4">
                      <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(item)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={`Create ${activeTab === 'departments' ? 'Department' : 'NGO'}`} description="Temporary passwords are required and the created account must change password on first sign-in.">
        <div className="space-y-4">
          <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
          <FloatingLabelInput label="Email" type="email" value={form.email} error={emailError} onBlur={() => void checkEmail()} onChange={(event) => { setEmailError(''); setForm((current) => ({ ...current, email: event.target.value })); }} />
          <FloatingLabelInput label="Temporary Password" type="password" value={form.tempPassword} onChange={(event) => setForm((current) => ({ ...current, tempPassword: event.target.value }))} />
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleCreate()} disabled={submitting || Boolean(emailError)}>
              {submitting ? 'Creating...' : 'Create account'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={Boolean(deleteTarget)} onClose={() => setDeleteTarget(null)} title={`Delete ${activeTab === 'departments' ? 'department' : 'NGO'}`} description="Departments with active hotspot assignments cannot be deleted. The current implementation archives the owner account and suspends its organization.">
        <div className="space-y-4">
          <p className="text-sm text-body">Continue with <span className="font-semibold text-ink">{deleteTarget?.name}</span>?</p>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleDelete()} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Confirm'}
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
