import { api } from './fetcher';

// ─── Types ────────────────────────────────────────────────────────

export type SosTriggerMethod = 'tap' | 'long_press' | 'voice' | 'shake' | 'silent' | 'hidden_trigger';
export type AlertType = 'harassment' | 'assault' | 'medical_emergency' | 'kidnapping_risk' | 'cyberstalking' | 'suspicious_activity' | 'general_danger' | 'stalking' | 'theft';
export type AlertStatus = 'pending' | 'active' | 'accepted' | 'resolved' | 'false_alarm' | 'escalated' | 'cancelled';

export interface CreateSosPayload {
  triggerMethod: SosTriggerMethod;
  alertType?: AlertType;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface SosAlert {
  id: string;
  alertCode: string;
  status: AlertStatus;
  alertType: AlertType;
  triggerMethod: SosTriggerMethod;
  triggerLatitude: number;
  triggerLongitude: number;
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
    api.post<SosAlert>('/sos/create', payload),

  updateStatus: (payload: UpdateSosStatusPayload) =>
    api.patch<SosAlert>('/sos/status', payload),

  getActive: () =>
    api.get<SosAlert[]>('/sos/active'),

  getById: (alertId: string) =>
    api.get<SosAlert>(`/sos/${alertId}`),
};
