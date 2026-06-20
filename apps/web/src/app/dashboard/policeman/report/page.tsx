'use client';

import { useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { officerApi } from '@/lib/api/officer.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const incidentTypes = [
  { value: 'unsafe_area', label: 'Unsafe Area' },
  { value: 'stalking', label: 'Stalking' },
  { value: 'broken_streetlight', label: 'Broken Streetlight' },
  { value: 'suspicious_behavior', label: 'Suspicious Behavior' },
  { value: 'unsafe_transport', label: 'Unsafe Transport' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'poor_lighting', label: 'Poor Lighting' },
  { value: 'other', label: 'Other' },
] as const;

export default function PolicemanReportPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [form, setForm] = useState({
    type: 'unsafe_area',
    description: '',
    severity: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH',
    lat: '',
    lng: '',
    evidenceUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function useCurrentLocation() {
    if (!navigator.geolocation) {
      setError('Geolocation is not available in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setForm((prev) => ({
          ...prev,
          lat: String(position.coords.latitude),
          lng: String(position.coords.longitude),
        }));
      },
      () => setError('Unable to retrieve current location.')
    );
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await officerApi.createIncident({
        type: form.type,
        description: form.description,
        lat: Number(form.lat),
        lng: Number(form.lng),
        severity: form.severity,
        evidenceUrl: form.evidenceUrl || undefined,
      });
      setMessage('Officer incident report submitted successfully.');
      setForm({ type: 'unsafe_area', description: '', severity: 'MEDIUM', lat: '', lng: '', evidenceUrl: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to submit officer incident report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Report Submission" subtitle="Submit a new officer incident report with severity, location capture, and optional evidence URL.">
      <Card padding="lg" className="surface-panel-modern">
        <SectionBadge label="Officer report form" pulse />
        <div className="mt-6 space-y-4">
          {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

          <label className="block">
            <span className="mb-2 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Incident Type</span>
            <select className="input-base h-12 w-full rounded-xl border border-border bg-white px-4 text-sm text-ink" value={form.type} onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value }))}>
              {incidentTypes.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Description</span>
            <textarea className="textarea-field min-h-36 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-ink" value={form.description} onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))} />
          </label>

          <div>
            <span className="mb-3 block text-xs font-mono uppercase tracking-[0.14em] text-muted">Severity</span>
            <div className="flex flex-wrap gap-3">
              {(['LOW', 'MEDIUM', 'HIGH'] as const).map((severity) => (
                <button key={severity} type="button" className={`rounded-full border px-4 py-2 text-sm ${form.severity === severity ? 'border-primary bg-primary/10 text-primary' : 'border-border bg-white text-body'}`} onClick={() => setForm((prev) => ({ ...prev, severity }))}>
                  {severity}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-secondary" onClick={() => void useCurrentLocation()}>
              Use Current GPS Location
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FloatingLabelInput label="Latitude" type="number" value={form.lat} onChange={(event) => setForm((prev) => ({ ...prev, lat: event.target.value }))} />
            <FloatingLabelInput label="Longitude" type="number" value={form.lng} onChange={(event) => setForm((prev) => ({ ...prev, lng: event.target.value }))} />
          </div>

          <FloatingLabelInput label="Evidence URL (optional)" type="url" value={form.evidenceUrl} onChange={(event) => setForm((prev) => ({ ...prev, evidenceUrl: event.target.value }))} />

          <button type="button" className="btn-primary" disabled={submitting} onClick={() => void submit()}>
            {submitting ? 'Submitting...' : 'Submit Incident Report'}
          </button>
        </div>
      </Card>
    </AppShell>
  );
}
