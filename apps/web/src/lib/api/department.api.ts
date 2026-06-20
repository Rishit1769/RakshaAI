import { api } from './fetcher';

export const departmentApi = {
  getNavigationMeta: () => api.get<{
    departmentName: string;
    liveSosCount: number;
    roomIds: string[];
  }>('/department/navigation-meta'),
  getOverview: () => api.get('/department/overview'),
  getPolicemen: () => api.get('/department/policemen'),
  createPoliceman: (body: { name: string; email: string; tempPassword: string; badgeNumber: string }) =>
    api.post('/department/policemen', body),
  getPolicemanDetail: (id: string) => api.get(`/department/policemen/${id}`),
  deactivatePoliceman: (id: string) => api.patch(`/department/policemen/${id}/deactivate`),
  reactivatePoliceman: (id: string) => api.patch(`/department/policemen/${id}/reactivate`),
  getHotspots: () => api.get('/department/hotspots'),
  createHotspot: (body: { name: string; lat: number; lng: number; radius: number; severity: 'LOW' | 'MEDIUM' | 'HIGH' }) =>
    api.post('/department/hotspots', body),
  assignHotspot: (id: string, policemanId: string) => api.post(`/department/hotspots/${id}/assign`, { policemanId }),
  unassignHotspot: (id: string) => api.delete(`/department/hotspots/${id}/assign`),
  updateHotspot: (id: string, body: Record<string, unknown>) => api.patch(`/department/hotspots/${id}`, body),
  deleteHotspot: (id: string) => api.delete(`/department/hotspots/${id}`),
  getIncidents: () => api.get('/department/incidents'),
  resolveIncident: (id: string) => api.patch(`/department/incidents/${id}/resolve`, {}),
  getSos: (page = 1, pageSize = 30) => api.get(`/department/sos?page=${page}&pageSize=${pageSize}`),
  acknowledgeSos: (id: string, officerId: string) => api.patch(`/department/sos/${id}/acknowledge`, { officerId }),
  resolveSos: (id: string) => api.patch(`/department/sos/${id}/resolve`, {}),
  getZones: () => api.get('/department/zones'),
  createZone: (body: { name: string; type: 'SAFE' | 'RED'; lat: number; lng: number; radius: number; description?: string }) =>
    api.post('/department/zones', body),
  updateZone: (id: string, body: Record<string, unknown>) => api.patch(`/department/zones/${id}`, body),
  deleteZone: (id: string) => api.delete(`/department/zones/${id}`),
  getActivity: () => api.get('/department/activity'),
};
