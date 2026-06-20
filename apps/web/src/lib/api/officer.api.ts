import { api } from './fetcher';

export const officerApi = {
  getNavigationMeta: () => api.get<{ officerName: string; badgeNumber: string; liveSosCount: number; roomIds: string[] }>('/officer/navigation-meta'),
  getOverview: () => api.get('/officer/overview'),
  getHotspot: () => api.get('/officer/hotspot'),
  getSos: () => api.get('/officer/sos'),
  acknowledgeSos: (id: string) => api.patch(`/officer/sos/${id}/acknowledge`, {}),
  resolveSos: (id: string) => api.patch(`/officer/sos/${id}/resolve`, {}),
  getIncidents: (radius = 5) => api.get(`/officer/incidents?radius=${radius}`),
  resolveIncident: (id: string) => api.patch(`/officer/incidents/${id}/resolve`, {}),
  createIncident: (body: { type: string; description: string; lat: number; lng: number; severity: 'LOW' | 'MEDIUM' | 'HIGH'; evidenceUrl?: string }) =>
    api.post('/officer/incidents', body),
};
