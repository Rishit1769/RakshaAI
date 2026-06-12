import { api } from './fetcher';

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string | null;
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmergencyContactListResponse {
  contacts: EmergencyContact[];
  count: number;
  maxContacts: number;
}

export interface EmergencyContactPayload {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  isPrimary?: boolean;
}

export const userApi = {
  getEmergencyContacts: () =>
    api.get<EmergencyContactListResponse>('/emergency-contacts'),

  addEmergencyContact: (payload: EmergencyContactPayload) =>
    api.post<EmergencyContact>('/emergency-contacts', payload),

  updateEmergencyContact: (contactId: string, payload: EmergencyContactPayload) =>
    api.put<EmergencyContact>(`/emergency-contacts/${contactId}`, payload),

  deleteEmergencyContact: (contactId: string) =>
    api.delete<null>(`/emergency-contacts/${contactId}`),

  setPrimaryEmergencyContact: (contactId: string) =>
    api.patch<EmergencyContact>(`/emergency-contacts/${contactId}/primary`),
};
