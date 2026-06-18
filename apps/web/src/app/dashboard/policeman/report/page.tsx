'use client';

import { useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { SectionCard } from '@/components/dashboard/DashboardPrimitives';
import { dashboardApi } from '@/lib/api/dashboard.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

export default function PolicemanReportPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: 'unsafe_area',
    latitude: '28.6139',
    longitude: '77.2090',
    address: '',
    city: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await dashboardApi.submitOfficialReport({
        ...form,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
      });
      setSuccess('Official report submitted through the current incident/report pipeline.');
      setForm({
        title: '',
        description: '',
        category: 'unsafe_area',
        latitude: '28.6139',
        longitude: '77.2090',
        address: '',
        city: '',
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit official report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Submit Official Report" subtitle="Temporary mapping: officer reports are stored through the community incident model with audit logging.">
      <SectionCard title="Report details">
        <div className="space-y-4">
          {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}
          {success ? <div className="rounded-xl border border-safe/30 bg-safe/10 p-3 text-sm text-safe-dark">{success}</div> : null}
          <FloatingLabelInput label="Title" type="text" value={form.title} onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))} />
          <label className="block text-sm text-muted">
            Category
            <select className="input-field mt-2" value={form.category} onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}>
              <option value="unsafe_area">Unsafe area</option>
              <option value="harassment">Harassment</option>
              <option value="stalking">Stalking</option>
              <option value="suspicious_behavior">Suspicious behavior</option>
              <option value="poor_lighting">Poor lighting</option>
              <option value="other">Other</option>
            </select>
          </label>
          <label className="block text-sm text-muted">
            Description
            <textarea className="textarea-field mt-2 min-h-32" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <FloatingLabelInput label="Latitude" type="text" value={form.latitude} onChange={(event) => setForm((prev) => ({ ...prev, latitude: event.target.value }))} />
            <FloatingLabelInput label="Longitude" type="text" value={form.longitude} onChange={(event) => setForm((prev) => ({ ...prev, longitude: event.target.value }))} />
          </div>
          <FloatingLabelInput label="Address" type="text" value={form.address} onChange={(event) => setForm((prev) => ({ ...prev, address: event.target.value }))} />
          <FloatingLabelInput label="City" type="text" value={form.city} onChange={(event) => setForm((prev) => ({ ...prev, city: event.target.value }))} />
          <button type="button" className="btn-primary" disabled={submitting} onClick={() => void submit()}>
            {submitting ? 'Submitting...' : 'Submit report'}
          </button>
        </div>
      </SectionCard>
    </AppShell>
  );
}
