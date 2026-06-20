'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { MapMarker } from '@/components/SafetyMap';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { officerApi } from '@/lib/api/officer.api';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading nearby stations..." className="h-[38rem] w-full" />,
});

type Station = {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  distanceKm: number;
};

type OverpassResponse = {
  elements?: Array<{
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
  }>;
};

export default function PolicemanStationsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');
  const [origin, setOrigin] = useState<{ latitude: number; longitude: number }>({ latitude: 20.5937, longitude: 78.9629 });
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      try {
        const hotspotResponse = await officerApi.getHotspot();
        const hotspot = hotspotResponse.data as { latitude?: number; longitude?: number } | null | undefined;
        if (hotspot?.latitude && hotspot?.longitude) {
          setOrigin({ latitude: hotspot.latitude, longitude: hotspot.longitude });
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (position) => {
            setOrigin({ latitude: position.coords.latitude, longitude: position.coords.longitude });
          },
          () => {
            setOrigin({ latitude: 28.6139, longitude: 77.209 });
          }
        );
      } catch {
        setOrigin({ latitude: 28.6139, longitude: 77.209 });
      }
    })();
  }, [isAllowed]);

  useEffect(() => {
    if (!isAllowed) return;

    void (async () => {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('https://overpass-api.de/api/interpreter', {
          method: 'POST',
          body: `
            [out:json][timeout:25];
            (
              node["amenity"="police"](around:10000,${origin.latitude},${origin.longitude});
              way["amenity"="police"](around:10000,${origin.latitude},${origin.longitude});
            );
            out body center;
          `,
        });
        const payload = (await response.json()) as OverpassResponse;
        const nextStations = (payload.elements ?? [])
          .map((element) => {
            const latitude = element.lat ?? element.center?.lat;
            const longitude = element.lon ?? element.center?.lon;
            if (latitude === undefined || longitude === undefined) return null;
            const address = [element.tags?.['addr:street'], element.tags?.['addr:city']].filter(Boolean).join(', ') || 'Address unavailable';
            return {
              id: element.id,
              name: element.tags?.name ?? 'Police Station',
              latitude,
              longitude,
              address,
              distanceKm: haversineDistance(origin.latitude, origin.longitude, latitude, longitude),
            };
          })
          .filter((station): station is Station => Boolean(station))
          .sort((a, b) => a.distanceKm - b.distanceKm);

        setStations(nextStations);
        setSelectedId(nextStations[0]?.id ?? null);
      } catch {
        setError('Unable to load nearby stations from OpenStreetMap.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isAllowed, origin.latitude, origin.longitude]);

  const selectedStation = stations.find((station) => station.id === selectedId) ?? stations[0] ?? null;
  const markers: MapMarker[] = stations.map((station) => ({
    id: String(station.id),
    latitude: station.latitude,
    longitude: station.longitude,
    type: 'police_station',
    popupHtml: `<div style="min-width:240px"><strong>${station.name}</strong><br/><span>${station.address}</span><br/><span>${station.distanceKm.toFixed(1)}km away</span></div>`,
  }));

  const center = useMemo(
    () => selectedStation ? { latitude: selectedStation.latitude, longitude: selectedStation.longitude } : origin,
    [selectedStation, origin]
  );

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Nearby Stations" subtitle="OpenStreetMap-powered nearby police station lookup centered on your assigned hotspot or current location.">
      <div className="space-y-8">
        {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Nearby stations" pulse />
            <h2 className="mt-5 text-xl font-semibold text-ink">Police stations within 10km</h2>
            <div className="mt-6">
              {loading ? <LoadingState label="Looking up nearby police stations..." className="h-[38rem] w-full" /> : <SafetyMap center={center} zoom={12} markers={markers} className="h-[38rem] w-full" />}
            </div>
          </Card>

          <Card padding="lg" className="surface-panel-modern">
            <SectionBadge label="Station list" />
            <div className="mt-5 space-y-3 overflow-y-auto pr-2 xl:max-h-[38rem]">
              {stations.map((station) => (
                <button key={station.id} type="button" className={`w-full rounded-[1.35rem] border p-4 text-left transition-all ${selectedStation?.id === station.id ? 'border-primary bg-primary/5 shadow-accent' : 'border-border/70 bg-white hover:-translate-y-0.5 hover:shadow-soft'}`} onClick={() => setSelectedId(station.id)}>
                  <p className="text-sm font-semibold text-ink">{station.name}</p>
                  <p className="mt-1 text-sm text-muted">{station.address}</p>
                  <p className="mt-2 text-xs text-muted">{station.distanceKm.toFixed(1)}km from your hotspot</p>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
}

function toRadians(value: number) {
  return value * (Math.PI / 180);
}
