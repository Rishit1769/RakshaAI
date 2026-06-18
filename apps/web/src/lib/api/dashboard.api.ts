import { api } from './fetcher';

export const dashboardApi = {
  getSuperadminOverview: () => api.get<{ metrics: Array<{ label: string; value: number }> }>('/dashboard/superadmin/overview'),
  getSuperadminUsers: () => api.get<Array<Record<string, unknown>>>('/dashboard/superadmin/users'),
  setUserStatus: (id: string, isActive: boolean) => api.patch(`/dashboard/superadmin/users/${id}/status`, { isActive }),
  getModerationQueue: () => api.get<Array<Record<string, unknown>>>('/dashboard/superadmin/moderation'),
  getHotspots: () => api.get<Array<Record<string, unknown>>>('/dashboard/superadmin/hotspots'),
  getAnalytics: () => api.get<Record<string, unknown>>('/dashboard/superadmin/analytics'),
  getAuditLogs: () => api.get<Array<Record<string, unknown>>>('/dashboard/superadmin/audit'),

  getDepartmentOverview: () => api.get<Record<string, unknown>>('/dashboard/department/overview'),
  getDepartmentAssignments: () => api.get<Record<string, unknown>>('/dashboard/department/assignments'),
  getDepartmentActivity: () => api.get<Array<Record<string, unknown>>>('/dashboard/department/activity'),

  getNgoOverview: () => api.get<Record<string, unknown>>('/dashboard/ngo/overview'),
  getNgoResponse: () => api.get<Record<string, unknown>>('/dashboard/ngo/response'),
  getNgoActivity: () => api.get<Array<Record<string, unknown>>>('/dashboard/ngo/activity'),

  getPolicemanOverview: () => api.get<Record<string, unknown>>('/dashboard/policeman/overview'),
  getPolicemanHotspot: () => api.get<Array<Record<string, unknown>>>('/dashboard/policeman/hotspot'),
  submitOfficialReport: (payload: Record<string, unknown>) => api.post('/dashboard/policeman/report', payload),

  getVolunteerOverview: () => api.get<Record<string, unknown>>('/dashboard/volunteer/overview'),
  getVolunteerCases: () => api.get<Array<Record<string, unknown>>>('/dashboard/volunteer/cases'),
  submitVolunteerCheckIn: (payload: Record<string, unknown>) =>
    api.post<{ caseId: string; latitude: number; longitude: number; notes: string | null; checkedInAt: string }>('/dashboard/volunteer/check-in', payload),
};
