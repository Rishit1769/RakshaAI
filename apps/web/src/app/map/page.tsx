'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuthStore } from '@/store/auth.store';
import { api } from '@/lib/api/fetcher';
import type { MapMarker } from '@/components/SafetyMap';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map…" className="h-80 w-full" />,
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
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    navigator.geolocation?.getCurrentPosition(
      (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setUserLocation({ latitude: 20.5937, longitude: 78.9629 })
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
      markers.push({ id: 'me', ...userLocation, type: 'user', label: 'You' });
    }

    if (activeLayer === 'volunteers') {
      const rows = (volunteersData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; full_name: string; lat: number; lng: number; distance_km: number }>).forEach((volunteer) => {
        markers.push({
          id: volunteer.id,
          latitude: volunteer.lat,
          longitude: volunteer.lng,
          type: 'volunteer',
          label: volunteer.full_name,
          popupHtml: `<b>${volunteer.full_name}</b><br>${volunteer.distance_km.toFixed(2)} km away`,
        });
      });
    }

    if (activeLayer === 'police') {
      const rows = (policeData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; name: string; latitude: number; longitude: number; distance_km: number }>).forEach((station) => {
        markers.push({
          id: station.id,
          latitude: station.latitude,
          longitude: station.longitude,
          type: 'police',
          label: station.name,
          popupHtml: `<b>${station.name}</b><br>${station.distance_km.toFixed(2)} km away`,
        });
      });
    }

    if (activeLayer === 'safe_zones') {
      const rows = (safeZonesData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; name: string; type: string; latitude: number; longitude: number; distance_km: number }>).forEach((zone) => {
        markers.push({
          id: zone.id,
          latitude: zone.latitude,
          longitude: zone.longitude,
          type: 'safe_zone',
          label: zone.name,
          popupHtml: `<b>${zone.name}</b><br>${zone.type}<br>${zone.distance_km.toFixed(2)} km away`,
        });
      });
    }

    return markers;
  }, [activeLayer, policeData, safeZonesData, userLocation, volunteersData]);

  if (!isAuthenticated) return null;

  const risk = (riskData as { data?: { riskLevel?: string; recentIncidents?: number; safeZonesNearby?: number } } | undefined)?.data;

  return (
    <div className="min-h-screen bg-light transition-colors duration-200 dark:bg-[#0B1026]">
      <header className="flex items-center gap-3 border-b border-border bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0d1628]">
        <button onClick={() => router.back()} className="interactive rounded p-1 text-muted hover:bg-gray-100 hover:text-navy dark:hover:bg-white/5 dark:hover:text-white">
          ←
        </button>
        <div>
          <h1 className="text-base font-bold text-navy dark:text-white">Safety Map</h1>
          <p className="text-xs text-muted">Nearby responders, safe zones, and area risk</p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
        {risk ? (
          <div className="card flex items-center justify-between gap-4">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Area Risk</p>
              <p className={`text-lg font-bold capitalize ${RISK_COLORS[risk.riskLevel ?? 'safe']}`}>
                {risk.riskLevel}
              </p>
            </div>
            <div className="text-right text-xs text-muted">
              <p>{risk.recentIncidents} incidents in 30 days</p>
              <p>{risk.safeZonesNearby} safe zones nearby</p>
            </div>
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {(['safe_zones', 'volunteers', 'police'] as const).map((layer) => (
            <button
              key={layer}
              onClick={() => setActiveLayer(layer)}
              className={`interactive rounded-xl py-2 text-xs font-semibold ${
                activeLayer === layer
                  ? 'bg-primary text-white'
                  : 'border border-border bg-white text-navy hover:bg-gray-50 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
              }`}
            >
              {layer === 'safe_zones' ? 'Safe Zones' : layer === 'volunteers' ? 'Volunteers' : 'Police'}
            </button>
          ))}
        </div>

        {userLocation ? (
          <SafetyMap center={userLocation} zoom={14} markers={buildMarkers()} radiusKm={5} className="h-96 w-full" />
        ) : (
          <LoadingState label="Acquiring location…" className="h-96 w-full" />
        )}
      </main>
    </div>
  );
}
