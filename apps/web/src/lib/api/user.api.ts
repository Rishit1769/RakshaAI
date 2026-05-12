import { api } from './fetcher';

// ─── Types ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  role: string;
  profileImageUrl?: string;
  isVerified: boolean;
  createdAt: string;
}

export interface SafetyProfile {
  bloodGroup?: string;
  medicalConditions: string[];
  allergies: string[];
  emergencyNotes?: string;
  voiceSosKeyword: string;
  shakeSensitivity: 'low' | 'medium' | 'high';
  silentSosEnabled: boolean;
  autoEvidence: boolean;
}

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priorityOrder: number;
  notifyOnSos: boolean;
  notifyOnJourney: boolean;
  canTrackLive: boolean;
}

export interface AddEmergencyContactPayload {
  name: string;
  phone: string;
  email?: string;
  relationship?: string;
  priorityOrder?: number;
}

// ─── API calls ────────────────────────────────────────────────────

export const userApi = {
  getProfile: () =>
    api.get<UserProfile>('/user/profile'),

  updateProfile: (payload: Partial<Pick<UserProfile, 'fullName' | 'profileImageUrl'>>) =>
    api.patch<UserProfile>('/user/profile', payload),

  getSafetyProfile: () =>
    api.get<SafetyProfile>('/user/safety-profile'),

  updateSafetyProfile: (payload: Partial<SafetyProfile>) =>
    api.patch<SafetyProfile>('/user/safety-profile', payload),

  getEmergencyContacts: () =>
    api.get<EmergencyContact[]>('/user/emergency-contacts'),

  addEmergencyContact: (payload: AddEmergencyContactPayload) =>
    api.post<EmergencyContact>('/user/emergency-contacts', payload),

  deleteEmergencyContact: (contactId: string) =>
    api.delete<void>(`/user/emergency-contacts/${contactId}`),
};
