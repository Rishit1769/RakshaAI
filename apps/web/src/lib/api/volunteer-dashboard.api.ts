import { api } from './fetcher';

export const volunteerDashboardApi = {
  getNavigationMeta: () => api.get<{ volunteerName: string; ngoName: string; liveSosCount: number; roomIds: string[] }>('/volunteer/navigation-meta'),
  getOverview: () => api.get('/volunteer/overview'),
  getSos: () => api.get('/volunteer/sos'),
  respondSos: (id: string) => api.patch(`/volunteer/sos/${id}/respond`, {}),
  closeSos: (id: string) => api.patch(`/volunteer/sos/${id}/close`, {}),
  getCases: () => api.get('/volunteer/cases'),
  getCaseHistory: () => api.get('/volunteer/cases/history'),
  checkInCase: (id: string, body: { lat: number; lng: number; note?: string }) => api.patch(`/volunteer/cases/${id}/checkin`, body),
  closeCase: (id: string) => api.patch(`/volunteer/cases/${id}/close`, {}),
  getIncidentMap: (days = 7) => api.get(`/volunteer/incidents/map?days=${days}`),
  createCheckIn: (body: { lat: number; lng: number; note?: string }) => api.post('/volunteer/checkin', body),
  getCheckInHistory: () => api.get('/volunteer/checkin/history'),
  getZones: () => api.get('/volunteer/zones'),
};
