'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { ngoApi } from '@/lib/api/ngo.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type Volunteer = { id: string; fullName: string; isActive: boolean; currentAssignment?: { type: string; label: string } | null };
type Incident = {
  id: string;
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  location: string;
  timeReported: string;
  distanceKm: number;
  volunteer?: { id: string; name: string } | null;
  assignedAt?: string | null;
  status: 'OPEN' | 'ASSIGNED' | 'CLOSED';
};

export default function NgoResponsePage() {
  const { isAuthReady, isAllowed } = useRoleGuard('NGO');
  const [tab, setTab] = useState<'open' | 'assigned'>('open');
  const [openIncidents, setOpenIncidents] = useState<Incident[]>([]);
  const [assignedIncidents, setAssignedIncidents] = useState<Incident[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [error, setError] = useState('');

  async function load() {
    try {
      const [openResponse, assignedResponse, volunteerResponse] = await Promise.all([
        ngoApi.getOpenIncidents(),
        ngoApi.getAssignedIncidents(),
        ngoApi.getVolunteers(),
      ]);
      setOpenIncidents((openResponse.data ?? []) as Incident[]);
      setAssignedIncidents((assignedResponse.data ?? []) as Incident[]);
      setVolunteers((volunteerResponse.data ?? []) as Volunteer[]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load incident response data.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void load();
  }, [isAllowed]);

  const availableVolunteers = volunteers.filter((volunteer) => volunteer.isActive && !volunteer.currentAssignment);

  async function assignIncident(incidentId: string) {
    const volunteerId = assignments[incidentId];
    if (!volunteerId) return;
    try {
      await ngoApi.assignIncident(incidentId, volunteerId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to assign incident.');
    }
  }

  async function unassignIncident(incidentId: string) {
    try {
      await ngoApi.unassignIncident(incidentId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to unassign incident.');
    }
  }

  async function closeIncident(incidentId: string) {
    try {
      await ngoApi.closeIncident(incidentId);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to close incident.');
    }
  }

  const incidents = tab === 'open' ? openIncidents : assignedIncidents;

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Incident Response" subtitle="Review open incidents near your NGO’s coverage area and coordinate volunteer assignment with a focused two-tab workflow.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex items-center justify-between gap-4">
            <div>
              <SectionBadge label="Response queue" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">Incident assignment board</h2>
            </div>
            <div className="flex gap-2 rounded-full border border-border/70 bg-slate-100 p-1">
              <button type="button" className={`rounded-full px-4 py-2 text-sm ${tab === 'open' ? 'bg-white text-ink shadow-soft' : 'text-muted'}`} onClick={() => setTab('open')}>
                Open Incidents
              </button>
              <button type="button" className={`rounded-full px-4 py-2 text-sm ${tab === 'assigned' ? 'bg-white text-ink shadow-soft' : 'text-muted'}`} onClick={() => setTab('assigned')}>
                Assigned
              </button>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {incidents.map((incident) => (
              <div key={incident.id} className="rounded-[1.45rem] border border-border/70 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-ink">{incident.type}</p>
                    <p className="mt-1 text-sm text-muted">{incident.location} • {new Date(incident.timeReported).toLocaleString()}</p>
                  </div>
                  <span className={`inline-flex rounded-full px-3 py-1 text-[11px] font-mono uppercase tracking-[0.14em] ${incident.severity === 'HIGH' ? 'bg-red-50 text-red-600' : incident.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-600'}`}>
                    {incident.severity}
                  </span>
                </div>
                <div className="mt-4 grid gap-2 text-sm text-body md:grid-cols-2">
                  <p>Distance from NGO center: <span className="font-medium text-ink">{incident.distanceKm.toFixed(1)} km</span></p>
                  <p>Assigned volunteer: <span className="font-medium text-ink">{incident.volunteer?.name ?? 'Unassigned'}</span></p>
                </div>
                {tab === 'open' ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <select className="input-base h-10 rounded-xl border border-border bg-white px-3 text-sm text-ink" value={assignments[incident.id] ?? ''} onChange={(event) => setAssignments((current) => ({ ...current, [incident.id]: event.target.value }))}>
                      <option value="">Assign volunteer</option>
                      {availableVolunteers.map((volunteer) => (
                        <option key={volunteer.id} value={volunteer.id}>
                          {volunteer.fullName}
                        </option>
                      ))}
                    </select>
                    <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void assignIncident(incident.id)}>
                      Assign Volunteer
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" className="btn-secondary min-h-10 px-4 py-2" onClick={() => void unassignIncident(incident.id)}>
                      Unassign
                    </button>
                    <button type="button" className="btn-primary min-h-10 px-4 py-2" onClick={() => void closeIncident(incident.id)}>
                      Close
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
