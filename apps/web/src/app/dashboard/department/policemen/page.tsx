'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { departmentApi } from '@/lib/api/department.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type Policeman = {
  id: string;
  fullName: string;
  email: string;
  badgeNumber?: string | null;
  isActive: boolean;
  currentHotspot?: { id: string; name: string } | null;
  recentResponseCount: number;
};

type PolicemanDetail = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  currentHotspot?: { id: string; name: string; assignedAt?: string | null } | null;
  responseCount: number;
  responses: Array<{ id: string; action: string; alertId?: string | null; createdAt: string; notes?: string | null }>;
  assignmentHistory: Array<{ id: string; action: string; hotspotName?: string | null; createdAt: string }>;
};

export default function DepartmentPolicemenPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICE_DEPARTMENT');
  const [policemen, setPolicemen] = useState<Policeman[]>([]);
  const [detail, setDetail] = useState<PolicemanDetail | null>(null);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', tempPassword: '', badgeNumber: '' });

  async function load() {
    try {
      const response = await departmentApi.getPolicemen();
      setPolicemen((response.data ?? []) as Policeman[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load department officers.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  useEffect(() => {
    if (!selectedOfficerId) return;
    void (async () => {
      try {
        const response = await departmentApi.getPolicemanDetail(selectedOfficerId);
        setDetail((response.data ?? null) as PolicemanDetail | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load officer detail.');
      }
    })();
  }, [selectedOfficerId]);

  async function submit() {
    setSaving(true);
    try {
      await departmentApi.createPoliceman(form);
      setForm({ name: '', email: '', tempPassword: '', badgeNumber: '' });
      setOpenCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create the officer.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleOfficer(officer: Policeman) {
    try {
      if (officer.isActive) {
        await departmentApi.deactivatePoliceman(officer.id);
      } else {
        await departmentApi.reactivatePoliceman(officer.id);
      }
      await load();
      if (selectedOfficerId === officer.id) {
        const response = await departmentApi.getPolicemanDetail(officer.id);
        setDetail((response.data ?? null) as PolicemanDetail | null);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update the officer status.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell
      title="Manage Policemen"
      subtitle="Create officers, suspend or reactivate accounts, and review assignment and SOS response history without leaving the department workspace."
      actions={
        <button type="button" className="btn-primary" onClick={() => setOpenCreate(true)}>
          Add Policeman
        </button>
      }
    >
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionBadge label="Officer roster" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Department officers and current hotspot load</h2>
            </div>
            <div className="rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary">
              {policemen.length} officers tracked
            </div>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-border/70 text-xs font-mono uppercase tracking-[0.14em] text-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Badge</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Current hotspot</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {policemen.map((officer) => (
                  <tr key={officer.id} className="border-b border-border/40 align-top last:border-b-0">
                    <td className="px-4 py-4">
                      <button type="button" className="text-left" onClick={() => setSelectedOfficerId(officer.id)}>
                        <span className="block text-sm font-semibold text-ink">{officer.fullName}</span>
                        <span className="mt-1 block text-xs text-muted">{officer.recentResponseCount} recent response actions</span>
                      </button>
                    </td>
                    <td className="px-4 py-4 text-sm text-body">{officer.badgeNumber ?? 'Badge'}</td>
                    <td className="px-4 py-4 text-sm text-body">{officer.email}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${officer.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {officer.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-body">{officer.currentHotspot?.name ?? 'Unassigned'}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => setSelectedOfficerId(officer.id)}>
                          View detail
                        </button>
                        <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => void toggleOfficer(officer)}>
                          {officer.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={openCreate} title="Add Policeman" description="Create a new officer account with a temporary password that must be changed on first sign-in." onClose={() => setOpenCreate(false)}>
          <div className="space-y-4">
            <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <FloatingLabelInput label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            <FloatingLabelInput label="Badge Number" type="text" value={form.badgeNumber} onChange={(event) => setForm((prev) => ({ ...prev, badgeNumber: event.target.value }))} />
            <FloatingLabelInput label="Temporary Password" type="password" value={form.tempPassword} onChange={(event) => setForm((prev) => ({ ...prev, tempPassword: event.target.value }))} />
            <button type="button" className="btn-primary w-full" disabled={saving} onClick={() => void submit()}>
              {saving ? 'Creating...' : 'Create Policeman'}
            </button>
          </div>
        </Modal>

        {detail ? (
          <div className="fixed inset-y-0 right-0 z-[65] w-full max-w-xl border-l border-border/70 bg-[#fafafa] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionBadge label="Officer detail" />
                <h2 className="mt-5 text-2xl font-semibold text-ink">{detail.fullName}</h2>
                <p className="mt-2 text-sm text-muted">{detail.email}</p>
              </div>
              <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => { setSelectedOfficerId(null); setDetail(null); }}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="panel-subtle">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Current Hotspot</p>
                <p className="mt-2 text-lg font-semibold text-ink">{detail.currentHotspot?.name ?? 'Unassigned'}</p>
              </Card>
              <Card className="panel-subtle">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">SOS Response Count</p>
                <p className="mt-2 text-lg font-semibold text-ink">{detail.responseCount}</p>
              </Card>
            </div>

            <div className="mt-8 space-y-6 overflow-y-auto pb-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Assignment history</h3>
                <div className="mt-3 space-y-3">
                  {detail.assignmentHistory.map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4">
                      <p className="text-sm font-semibold text-ink">{item.hotspotName ?? 'Department hotspot'}</p>
                      <p className="mt-1 text-xs text-muted">{item.action.replace(/_/g, ' ')}</p>
                      <p className="mt-2 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Recent SOS actions</h3>
                <div className="mt-3 space-y-3">
                  {detail.responses.map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4">
                      <p className="text-sm font-semibold text-ink">{item.action.replace(/_/g, ' ')}</p>
                      <p className="mt-1 text-xs text-muted">Alert ID: {item.alertId ?? 'N/A'}</p>
                      <p className="mt-1 text-sm text-body">{item.notes ?? 'No note recorded.'}</p>
                      <p className="mt-2 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
