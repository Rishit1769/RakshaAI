import { api } from './fetcher';

// ─── Types ────────────────────────────────────────────────────────

export type ReportCategory =
  | 'unsafe_area' | 'stalking' | 'broken_streetlight'
  | 'suspicious_behavior' | 'unsafe_transport' | 'harassment'
  | 'poor_lighting' | 'other';

export interface CommunityReport {
  id: string;
  category: ReportCategory;
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  imageUrls: string[];
  upvoteCount: number;
  score: number;
  pinColor: string;
  commentCount: number;
  isVerified: boolean;
  createdAt: string;
}

export interface CreateReportPayload {
  category: ReportCategory;
  title?: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  isAnonymous?: boolean;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  weight: number;
  category: ReportCategory;
}

// ─── API calls ────────────────────────────────────────────────────

export const communityApi = {
  createReport: (payload: CreateReportPayload) =>
    api.post<CommunityReport>('/community', payload),

  getReports: (params?: { city?: string; category?: ReportCategory; page?: number }) => {
    const query = new URLSearchParams(
      Object.entries(params ?? {}).filter(([, v]) => v !== undefined) as [string, string][]
    ).toString();
    return api.get<CommunityReport[]>(`/community${query ? `?${query}` : ''}`);
  },

  getHeatmaps: (params: { lat: number; lng: number; radiusKm?: number }) => {
    const query = new URLSearchParams({
      latitude: params.lat.toString(),
      longitude: params.lng.toString(),
      ...(params.radiusKm ? { radius: params.radiusKm.toString() } : {}),
    }).toString();
    return api.get<HeatmapPoint[]>(`/community/heatmap?${query}`);
  },

  upvoteReport: (reportId: string) =>
    api.post<{ upvoteCount: number }>('/community/upvote', { reportId }),
};
