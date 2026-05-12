'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';
import type { MapMarker } from '@/components/SafetyMap';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-80 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
      <span className="text-muted text-sm">Loading map…</span>
    </div>
  ),
});

const RISK_COLORS: Record<string, string> = {
  safe: 'text-safe',
  low: 'text-green-600',
  moderate: 'text-amber-600',
  high: 'text-orange-600',
  critical: 'text-emergency',
};

export default function MapPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeLayer, setActiveLayer] = useState<'volunteers' | 'police' | 'safe_zones'>('safe_zones');

  useEffect(() => {
    if (!isAuthenticated) { router.push('/auth/login'); return; }
    navigator.geolocation?.getCurrentPosition(
      (p) => setUserLocation({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      () => setUserLocation({ latitude: 20.5937, longitude: 78.9629 }) // India center fallback
    );
  }, [isAuthenticated, router]);

  const baseParams = userLocation
    ? `latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=5`
    : null;

  const { data: volunteersData } = useQuery({
    queryKey: ['nearby-volunteers', userLocation],
    queryFn: () => api.get(`/maps/nearby/volunteers?${baseParams}`),
    enabled: !!baseParams && activeLayer === 'volunteers',
  });

  const { data: policeData } = useQuery({
    queryKey: ['nearby-police', userLocation],
    queryFn: () => api.get(`/maps/nearby/police?${baseParams}&radius=10`),
    enabled: !!baseParams && activeLayer === 'police',
  });

  const { data: safeZonesData } = useQuery({
    queryKey: ['nearby-safe-zones', userLocation],
    queryFn: () => api.get(`/maps/nearby/safe-zones?${baseParams}`),
    enabled: !!baseParams && activeLayer === 'safe_zones',
  });

  const { data: riskData } = useQuery({
    queryKey: ['area-risk', userLocation],
    queryFn: () => api.get(`/maps/risk?${baseParams}&radius=2`),
    enabled: !!baseParams,
    refetchInterval: 60_000,
  });

  const buildMarkers = useCallback((): MapMarker[] => {
    const markers: MapMarker[] = [];

    if (userLocation) {
      markers.push({
        id: 'me',
        ...userLocation,
        type: 'user',
        label: 'You',
      });
    }

    if (activeLayer === 'volunteers') {
      const rows = (volunteersData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; full_name: string; lat: number; lng: number; distance_km: number }>)
        .forEach((v) =>
          markers.push({
            id: v.id,
            latitude: v.lat,
            longitude: v.lng,
            type: 'volunteer',
            label: v.full_name,
            popupHtml: `<b>${v.full_name}</b><br>${v.distance_km.toFixed(2)} km away`,
          })
        );
    }

    if (activeLayer === 'police') {
      const rows = (policeData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; name: string; latitude: number; longitude: number; distance_km: number }>)
        .forEach((s) =>
          markers.push({
            id: s.id,
            latitude: s.latitude,
            longitude: s.longitude,
            type: 'police',
            label: s.name,
            popupHtml: `<b>${s.name}</b><br>${s.distance_km.toFixed(2)} km away`,
          })
        );
    }

    if (activeLayer === 'safe_zones') {
      const rows = (safeZonesData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; name: string; type: string; latitude: number; longitude: number; distance_km: number }>)
        .forEach((z) =>
          markers.push({
            id: z.id,
            latitude: z.latitude,
            longitude: z.longitude,
            type: 'safe_zone',
            label: z.name,
            popupHtml: `<b>${z.name}</b><br>${z.type}<br>${z.distance_km.toFixed(2)} km away`,
          })
        );
    }

    return markers;
  }, [userLocation, activeLayer, volunteersData, policeData, safeZonesData]);

  if (!isAuthenticated) return null;

  const risk = (riskData as { data?: { riskLevel?: string; recentIncidents?: number; safeZonesNearby?: number } } | undefined)?.data;

  return (
    <div className="min-h-screen bg-light">
      <header className="bg-white border-b border-border px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-muted hover:text-navy p-1 rounded hover:bg-gray-100">←</button>
        <h1 className="text-base font-bold text-navy">Safety Map</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Risk badge */}
        {risk && (
          <div className="card flex items-center justify-between">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Area Risk</p>
              <p className={`text-lg font-bold capitalize ${RISK_COLORS[risk.riskLevel ?? 'safe']}`}>
                {risk.riskLevel}
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>{risk.recentIncidents} incidents (30d)</p>
              <p>{risk.safeZonesNearby} safe zones nearby</p>
            </div>
          </div>
        )}

        {/* Layer selector */}
        <div className="flex gap-2">
          {(['safe_zones', 'volunteers', 'police'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-colors ${
                activeLayer === layer
                  ? 'bg-primary text-white'
                  : 'bg-white text-navy border border-border hover:bg-gray-50'
              }`}
            >
              {layer === 'safe_zones' ? '🛡️ Safe Zones' : layer === 'volunteers' ? '🦺 Volunteers' : '🚔 Police'}
            </button>
          ))}
        </div>

        {/* Map */}
        {userLocation ? (
          <SafetyMap
            center={userLocation}
            zoom={14}
            markers={buildMarkers()}
            radiusKm={5}
            className="w-full h-96"
          />
        ) : (
          <div className="w-full h-96 rounded-xl bg-gray-100 animate-pulse flex items-center justify-center">
            <span className="text-muted text-sm">Acquiring location…</span>
          </div>
        )}
      </main>
    </div>
  );
}
