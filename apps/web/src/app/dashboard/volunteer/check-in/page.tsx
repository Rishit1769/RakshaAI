'use client';

import { useEffect, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function VolunteerCheckInPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('VOLUNTEER');
  const [cases, setCases] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ caseId: '', latitude: '28.6139', longitude: '77.2090', notes: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const response = await dashboardApi.getVolunteerCases();
        const nextCases = response.data ?? [];
        setCases(nextCases);
        if (nextCases[0]?.id) {
          setForm((prev) => ({ ...prev, caseId: String(nextCases[0]?.id) }));
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Unable to load assigned cases.');
      }
    })();
  }, [isAllowed]);

  async function submit() {
    setError('');
    setSuccess('');

    try {
      const response = await dashboardApi.submitVolunteerCheckIn({
        caseId: form.caseId,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        notes: form.notes,
      });

      setSuccess(`Check-in saved at ${new Date(String(response.data?.checkedInAt ?? new Date().toISOString())).toLocaleString()}.`);
      setForm((prev) => ({ ...prev, notes: '' }));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit check-in.');
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Volunteer Check-In" subtitle="Record a location confirmation against an assigned case.">
      <SectionCard title="Check-in details">
        <div className="space-y-4">
          {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
          {success ? <div className="rounded-xl border border-safe/30 bg-safe/10 p-3 text-sm text-safe-dark">{success}</div> : null}
          <label className="block text-sm text-muted">
            Assigned case
            <select className="input-field mt-2" value={form.caseId} onChange={(event) => setForm((prev) => ({ ...prev, caseId: event.target.value }))}>
              {cases.map((item) => (
                <option key={String(item.id)} value={String(item.id)}>
                  {String(item.alertCode ?? item.id)}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <FloatingLabelInput label="Latitude" type="text" value={form.latitude} onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))} />
            <FloatingLabelInput label="Longitude" type="text" value={form.longitude} onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))} />
          </div>
          <label className="block text-sm text-muted">
            Notes
            <textarea className="textarea-field mt-2 min-h-28" value={form.notes} onChange={(event) => setForm((prev) => ({ ...prev, notes: event.target.value }))} />
          </label>
          <button type="button" className="btn-primary" onClick={() => void submit()} disabled={!form.caseId}>
            Submit check-in
          </button>
        </div>
      </SectionCard>
    </AppShell>
  );
}
