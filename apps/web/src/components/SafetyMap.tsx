'use client';

import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, Marker, Circle } from 'leaflet';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'user' | 'volunteer' | 'police' | 'safe_zone' | 'alert' | 'hotspot';
  label?: string;
  popupHtml?: string;
}

interface SafetyMapProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MapMarker[];
  radiusKm?: number;
  className?: string;
}

const MARKER_COLORS: Record<MapMarker['type'], string> = {
  user: '#7C3AED',
  volunteer: '#10B981',
  police: '#2563EB',
  safe_zone: '#059669',
  alert: '#EF4444',
  hotspot: '#F59E0B',
};

const MARKER_LABELS: Record<MapMarker['type'], string> = {
  user: 'U',
  volunteer: 'V',
  police: 'P',
  safe_zone: 'S',
  alert: 'A',
  hotspot: 'H',
};

export default function SafetyMap({
  center,
  zoom = 14,
  markers = [],
  radiusKm,
  className = 'w-full h-80',
}: SafetyMapProps) {
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Marker[]>([]);
  const circleRef = useRef<Circle | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    void (async () => {
      const L = await import('leaflet');

      const map = L.map(containerRef.current!, {
        center: [center.latitude, center.longitude],
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      if (radiusKm) {
        circleRef.current = L.circle([center.latitude, center.longitude], {
          radius: radiusKm * 1000,
          color: '#7C3AED',
          fillColor: '#7C3AED',
          fillOpacity: 0.05,
          weight: 1.5,
          dashArray: '6 4',
        }).addTo(map);
      }

      addMarkers(L, map, markers);
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    void (async () => {
      const L = await import('leaflet');
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      addMarkers(L, mapRef.current!, markers);
    })();
  }, [markers]);

  function addMarkers(L: typeof import('leaflet'), map: LeafletMap, items: MapMarker[]) {
    items.forEach((item) => {
      const color = MARKER_COLORS[item.type];
      const label = MARKER_LABELS[item.type];

      const divIcon = L.divIcon({
        html: `<div style="
          background:${color};
          border:2px solid white;
          border-radius:50%;
          width:28px;height:28px;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:white;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        ">${label}</div>`,
        className: '',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([item.latitude, item.longitude], { icon: divIcon }).addTo(map);

      if (item.popupHtml ?? item.label) {
        marker.bindPopup(item.popupHtml ?? `<b>${item.label}</b>`);
      }

      markersRef.current.push(marker);
    });
  }

  return (
    <div className={`overflow-hidden rounded-xl border border-border ${className}`}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
