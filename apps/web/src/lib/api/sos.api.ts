import { api } from './fetcher';

// ─── Types ────────────────────────────────────────────────────────

export type SosTriggerMethod = 'tap' | 'long_press' | 'voice' | 'shake' | 'silent' | 'hidden_trigger';
export type AlertType = 'harassment' | 'assault' | 'medical_emergency' | 'kidnapping_risk' | 'cyberstalking' | 'suspicious_activity' | 'general_danger' | 'stalking' | 'theft';
export type AlertStatus = 'pending' | 'active' | 'accepted' | 'resolved' | 'false_alarm' | 'escalated' | 'cancelled';

export interface CreateSosPayload {
  triggerMethod: SosTriggerMethod;
  alertType?: AlertType;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  description?: string;
}

export interface SosAlert {
  id: string;
  alertCode: string;
  status: AlertStatus;
  alertType: AlertType;
  triggerMethod: SosTriggerMethod;
  triggerLatitude?: number | null;
  triggerLongitude?: number | null;
  triggerAddress?: string;
  createdAt: string;
}

export interface UpdateSosStatusPayload {
  alertId: string;
  status: AlertStatus;
  notes?: string;
}

// ─── API calls ────────────────────────────────────────────────────

export const sosApi = {
  create: (payload: CreateSosPayload) =>
    api.post<SosAlert>('/sos', payload),

  updateStatus: (payload: UpdateSosStatusPayload) =>
    api.patch<SosAlert>('/sos/status', payload),

  getActive: () =>
    api.get<{ data: SosAlert[] }>('/sos/active'),

  getById: (alertId: string) =>
    api.get<SosAlert>(`/sos/${alertId}`),

  getHistory: (page = 1, limit = 20) =>
    api.get<{ alerts: SosAlert[]; total: number; totalPages: number }>(`/sos/history?page=${page}&limit=${limit}`),

  cancel: (alertId: string) =>
    api.post<null>(`/sos/${alertId}/cancel`, {}),
};
