import { api } from './fetcher';

export interface AdminNavigationMeta {
  adminName: string;
  adminEmail: string;
  pendingModerationCount: number;
}

export const adminApi = {
  getNavigationMeta: () =>
    api.get<AdminNavigationMeta>('/admin/navigation-meta'),

  getOverview: () =>
    api.get<Record<string, unknown>>('/admin/overview'),

  getUsers: (params: URLSearchParams) =>
    api.get<Record<string, unknown>>(`/admin/users?${params.toString()}`),

  updateUserRole: (id: string, role: string) =>
    api.patch(`/admin/users/${id}/role`, { role }),

  toggleUserSuspension: (id: string, isSuspended: boolean) =>
    api.patch(`/admin/users/${id}/suspend`, { isSuspended }),

  deleteUser: (id: string) =>
    api.delete(`/admin/users/${id}`),

  checkEmail: (email: string) =>
    api.get<{ exists: boolean }>(`/admin/check-email?email=${encodeURIComponent(email)}`),

  createDepartment: (payload: Record<string, unknown>) =>
    api.post('/admin/departments', payload),

  createNgo: (payload: Record<string, unknown>) =>
    api.post('/admin/ngos', payload),

  getDepartments: () =>
    api.get<Record<string, unknown>>('/admin/departments'),

  getNgos: () =>
    api.get<Record<string, unknown>>('/admin/ngos'),

  deleteDepartment: (id: string) =>
    api.delete(`/admin/departments/${id}`),

  deleteNgo: (id: string) =>
    api.delete(`/admin/ngos/${id}`),

  getHotspots: () =>
    api.get<Record<string, unknown>>('/admin/hotspots'),

  getHotspotDetail: (id: string) =>
    api.get<Record<string, unknown>>(`/admin/hotspots/${id}`),

  updateHotspotStatus: (id: string, status: 'ACTIVE' | 'INACTIVE') =>
    api.patch(`/admin/hotspots/${id}/status`, { status }),

  getSosAnalytics: () =>
    api.get<Record<string, unknown>>('/admin/analytics/sos'),

  getModerationQueue: () =>
    api.get<Record<string, unknown>>('/admin/moderation/queue'),

  dismissModerationItem: (id: string, type: 'incident' | 'comment') =>
    api.post(`/admin/moderation/${id}/dismiss`, { type }),

  deleteModerationIncident: (id: string) =>
    api.delete(`/admin/moderation/incident/${id}`),

  deleteModerationComment: (id: string) =>
    api.delete(`/admin/moderation/comment/${id}`),

  banModerationUser: (id: string) =>
    api.patch(`/admin/moderation/user/${id}/ban`),

  getAuditLog: (params: URLSearchParams) =>
    api.get<Record<string, unknown>>(`/admin/audit-log?${params.toString()}`),
};
