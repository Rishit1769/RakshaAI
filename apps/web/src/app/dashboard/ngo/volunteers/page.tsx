'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { ngoApi } from '@/lib/api/ngo.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type Volunteer = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  currentAssignment?: { type: 'INCIDENT' | 'SOS'; label: string } | null;
  lastActive?: string | null;
  lastLocation?: { latitude: number; longitude: number; recordedAt: string } | null;
};

type VolunteerDetail = {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  currentAssignment?: { type: 'INCIDENT' | 'SOS'; label: string } | null;
  totalCasesHandled: number;
  lastCheckIn?: { createdAt: string; latitude?: number | null; longitude?: number | null } | null;
  assignmentHistory: Array<{ id: string; type: string; label: string; createdAt: string; status: string }>;
  checkIns: Array<{ id: string; createdAt: string; latitude?: number | null; longitude?: number | null; notes?: string | null }>;
};

export default function NgoVolunteersPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  const [selectedVolunteerId, setSelectedVolunteerId] = useState<string | null>(null);
  const [openCreate, setOpenCreate] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', tempPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const response = await ngoApi.getVolunteers();
      setVolunteers((response.data ?? []) as Volunteer[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load NGO volunteers.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  useEffect(() => {
    if (!selectedVolunteerId) return;
    void (async () => {
      try {
        const response = await ngoApi.getVolunteerDetail(selectedVolunteerId);
        setDetail((response.data ?? null) as VolunteerDetail | null);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load volunteer detail.');
      }
    })();
  }, [selectedVolunteerId]);

  async function submit() {
    setSaving(true);
    try {
      await ngoApi.createVolunteer(form);
      setForm({ name: '', email: '', tempPassword: '' });
      setOpenCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to create volunteer.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleVolunteer(volunteer: Volunteer) {
    try {
      if (volunteer.isActive) {
        await ngoApi.deactivateVolunteer(volunteer.id);
      } else {
        await ngoApi.reactivateVolunteer(volunteer.id);
      }
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update volunteer status.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell
      title="Manage Volunteers"
      subtitle="Add NGO volunteers, review current assignments, and inspect case and check-in history from one consistent workspace."
      actions={
        <button type="button" className="btn-primary" onClick={() => setOpenCreate(true)}>
          Add Volunteer
        </button>
      }
    >
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern overflow-hidden">
          <SectionBadge label="Volunteer roster" pulse />
          <h2 className="mt-5 text-xl font-semibold text-ink">NGO-owned volunteers</h2>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-border/70 text-xs font-mono uppercase tracking-[0.14em] text-muted">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Current Assignment</th>
                  <th className="px-4 py-3">Last Active</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.map((volunteer) => (
                  <tr key={volunteer.id} className="border-b border-border/40 last:border-b-0">
                    <td className="px-4 py-4 text-sm font-semibold text-ink">{volunteer.fullName}</td>
                    <td className="px-4 py-4 text-sm text-body">{volunteer.email}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${volunteer.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                        {volunteer.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-body">{volunteer.currentAssignment?.label ?? 'Unassigned'}</td>
                    <td className="px-4 py-4 text-sm text-body">{volunteer.lastActive ? new Date(volunteer.lastActive).toLocaleString() : 'No recent activity'}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => setSelectedVolunteerId(volunteer.id)}>
                          View
                        </button>
                        <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => void toggleVolunteer(volunteer)}>
                          {volunteer.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Modal open={openCreate} title="Add Volunteer" description="Create a volunteer account with a temporary password that must be changed on first sign-in." onClose={() => setOpenCreate(false)}>
          <div className="space-y-4">
            <FloatingLabelInput label="Name" type="text" value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            <FloatingLabelInput label="Email" type="email" value={form.email} onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))} />
            <FloatingLabelInput label="Temporary Password" type="password" value={form.tempPassword} onChange={(event) => setForm((prev) => ({ ...prev, tempPassword: event.target.value }))} />
            <button type="button" className="btn-primary w-full" disabled={saving} onClick={() => void submit()}>
              {saving ? 'Creating...' : 'Create Volunteer'}
            </button>
          </div>
        </Modal>

        {detail ? (
          <div className="fixed inset-y-0 right-0 z-[65] w-full max-w-xl border-l border-border/70 bg-[#fafafa] p-6 shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <SectionBadge label="Volunteer detail" />
                <h2 className="mt-5 text-2xl font-semibold text-ink">{detail.fullName}</h2>
                <p className="mt-2 text-sm text-muted">{detail.email}</p>
              </div>
              <button type="button" className="btn-secondary min-h-10 px-3 py-2" onClick={() => { setSelectedVolunteerId(null); setDetail(null); }}>
                Close
              </button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Card className="panel-subtle">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Current Assignment</p>
                <p className="mt-2 text-lg font-semibold text-ink">{detail.currentAssignment?.label ?? 'Unassigned'}</p>
              </Card>
              <Card className="panel-subtle">
                <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Total Cases Handled</p>
                <p className="mt-2 text-lg font-semibold text-ink">{detail.totalCasesHandled}</p>
              </Card>
            </div>

            <div className="mt-8 space-y-6 overflow-y-auto pb-8">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Assignment history</h3>
                <div className="mt-3 space-y-3">
                  {detail.assignmentHistory.map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4">
                      <p className="text-sm font-semibold text-ink">{item.label}</p>
                      <p className="mt-1 text-xs text-muted">{item.type} • {item.status}</p>
                      <p className="mt-2 text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-muted">Check-in history</h3>
                <div className="mt-3 space-y-3">
                  {detail.checkIns.map((item) => (
                    <div key={item.id} className="rounded-[1.25rem] border border-border/70 bg-white/95 p-4">
                      <p className="text-sm font-semibold text-ink">{item.latitude?.toFixed?.(4) ?? '--'}, {item.longitude?.toFixed?.(4) ?? '--'}</p>
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
