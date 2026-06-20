import { api } from './fetcher';

export const ngoApi = {
  getNavigationMeta: () => api.get<{ ngoName: string; liveSosCount: number; roomIds: string[] }>('/ngo/navigation-meta'),
  getOverview: () => api.get('/ngo/overview'),
  getVolunteers: () => api.get('/ngo/volunteers'),
  createVolunteer: (body: { name: string; email: string; tempPassword: string }) => api.post('/ngo/volunteers', body),
  getVolunteerDetail: (id: string) => api.get(`/ngo/volunteers/${id}`),
  deactivateVolunteer: (id: string) => api.patch(`/ngo/volunteers/${id}/deactivate`),
  reactivateVolunteer: (id: string) => api.patch(`/ngo/volunteers/${id}/reactivate`),
  getOpenIncidents: () => api.get('/ngo/incidents'),
  getAssignedIncidents: () => api.get('/ngo/incidents/assigned'),
  assignIncident: (id: string, volunteerId: string) => api.post(`/ngo/incidents/${id}/assign`, { volunteerId }),
  unassignIncident: (id: string) => api.delete(`/ngo/incidents/${id}/assign`),
  closeIncident: (id: string) => api.patch(`/ngo/incidents/${id}/close`, {}),
  getSos: (page = 1, pageSize = 30) => api.get(`/ngo/sos?page=${page}&pageSize=${pageSize}`),
  respondSos: (id: string, volunteerId: string) => api.patch(`/ngo/sos/${id}/respond`, { volunteerId }),
  closeSos: (id: string) => api.patch(`/ngo/sos/${id}/close`, {}),
  getZones: () => api.get('/ngo/zones'),
  getActivity: () => api.get('/ngo/activity'),
};
