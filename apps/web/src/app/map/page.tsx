'use client';

import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { FilterPills } from '@/components/ui/filter-pills';
import { LoadingState } from '@/components/ui/LoadingState';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionBadge } from '@/components/ui/section-badge';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { api } from '@/lib/api/fetcher';
import type { MapMarker } from '@/components/SafetyMap';
import { buildIncidentPopupHtml } from '@/components/SafetyMap';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-80 w-full" />,
});

const RISK_COLORS: Record<string, string> = {
  safe: 'text-safe',
  low: 'text-safe',
  moderate: 'text-warning',
  high: 'text-badge-orange',
  critical: 'text-emergency',
};

type IncidentRow = {
  id: string;
  type: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  likes: number;
  comments: number;
  score: number;
  pinColor: 'white' | 'yellow' | 'red';
};

export default function MapPage() {
  const { isAuthenticated, isAuthReady } = useProtectedRoute();
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [activeLayer, setActiveLayer] = useState<'volunteers' | 'police' | 'safe_zones'>('safe_zones');

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;

    navigator.geolocation?.getCurrentPosition(
      (position) => setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude }),
      () => setUserLocation({ latitude: 20.5937, longitude: 78.9629 })
    );
  }, [isAuthReady, isAuthenticated]);

  const baseParams = userLocation ? `latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=5` : null;

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

  const { data: incidentsData } = useQuery({
    queryKey: ['incidents-map'],
    queryFn: () => api.get('/incidents'),
    refetchInterval: 30_000,
    enabled: isAuthReady && isAuthenticated,
  });

  const buildMarkers = useCallback((): MapMarker[] => {
    const built: MapMarker[] = [];

    if (userLocation) {
      built.push({ id: 'me', ...userLocation, type: 'user', label: 'You' });
    }

    const incidents = ((incidentsData as { data?: IncidentRow[] } | undefined)?.data ?? []) as IncidentRow[];
    incidents.forEach((incident) => {
      built.push({
        id: `incident-${incident.id}`,
        latitude: incident.latitude,
        longitude: incident.longitude,
        type: 'incident',
        pinColor: incident.pinColor,
        popupHtml: buildIncidentPopupHtml(incident),
      });
    });

    if (activeLayer === 'volunteers') {
      const rows = (volunteersData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; full_name: string; lat: number; lng: number; distance_km: number }>).forEach((volunteer) => {
        built.push({
          id: volunteer.id,
          latitude: volunteer.lat,
          longitude: volunteer.lng,
          type: 'volunteer',
          label: volunteer.full_name,
          popupHtml: `<strong>${volunteer.full_name}</strong><br/>${volunteer.distance_km.toFixed(2)} km away`,
        });
      });
    }

    if (activeLayer === 'police') {
      const rows = (policeData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; name: string; latitude: number; longitude: number; distance_km: number }>).forEach((station) => {
        built.push({
          id: station.id,
          latitude: station.latitude,
          longitude: station.longitude,
          type: 'police',
          label: station.name,
          popupHtml: `<strong>${station.name}</strong><br/>${station.distance_km.toFixed(2)} km away`,
        });
      });
    }

    if (activeLayer === 'safe_zones') {
      const rows = (safeZonesData as { data?: unknown[] } | undefined)?.data ?? [];
      (rows as Array<{ id: string; name: string; type: string; latitude: number; longitude: number; distance_km: number }>).forEach((zone) => {
        built.push({
          id: zone.id,
          latitude: zone.latitude,
          longitude: zone.longitude,
          type: 'safe_zone',
          label: zone.name,
          popupHtml: `<strong>${zone.name}</strong><br/>${zone.type}<br/>${zone.distance_km.toFixed(2)} km away`,
        });
      });
    }

    return built;
  }, [activeLayer, incidentsData, policeData, safeZonesData, userLocation, volunteersData]);

  if (!isAuthReady) return <LoadingState label="Checking session..." className="h-80 w-full" />;

  if (!isAuthenticated) return null;

  const risk = (riskData as { data?: { riskLevel?: string; recentIncidents?: number; safeZonesNearby?: number } } | undefined)?.data;

  return (
    <AppShell title="Safety Map" subtitle="Incident density, nearby responders, and safe support points." backLabel="Dashboard">
      <div className="space-y-6">
        {risk ? (
          <div className="grid gap-4 md:grid-cols-3">
            <MetricCard label="Area risk" value={<span className={`capitalize ${RISK_COLORS[risk.riskLevel ?? 'safe']}`}>{risk.riskLevel}</span>} />
            <MetricCard label="Recent incidents" value={risk.recentIncidents ?? 0} />
            <MetricCard label="Safe zones nearby" value={risk.safeZonesNearby ?? 0} />
          </div>
        ) : null}

        <div className="product-card space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionBadge label="Layer controls" />
              <h2 className="mt-3 text-lg font-semibold text-ink">Switch between support layers and official infrastructure.</h2>
              <p className="mt-1 text-sm text-muted">Move between community support, safe infrastructure, and official responders.</p>
            </div>
            <FilterPills
              options={[
                { label: 'Safe Zones', value: 'safe_zones' },
                { label: 'Volunteers', value: 'volunteers' },
                { label: 'Police', value: 'police' },
              ]}
              selectedValue={activeLayer}
              onChange={(value) => setActiveLayer(value as 'safe_zones' | 'volunteers' | 'police')}
            />
          </div>

          {userLocation ? (
            <SafetyMap
              center={userLocation}
              zoom={14}
              markers={buildMarkers()}
              radiusKm={5}
              className="h-[calc(100vh-64px)] min-h-[32rem] w-full"
              showPoliceStations
              showLegend
            />
          ) : (
            <LoadingState label="Acquiring location..." className="h-[calc(100vh-64px)] min-h-[32rem] w-full" />
          )}
        </div>
      </div>
    </AppShell>
  );
}
