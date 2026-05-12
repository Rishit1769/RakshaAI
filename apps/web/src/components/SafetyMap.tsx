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

const MARKER_ICONS: Record<MapMarker['type'], string> = {
  user: '📍',
  volunteer: '🦺',
  police: '🚔',
  safe_zone: '🛡️',
  alert: '🆘',
  hotspot: '⚠️',
};

/**
 * OpenStreetMap-based safety map using Leaflet.js
 * Dynamically imported to avoid SSR issues.
 */
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

    // Dynamic import to avoid SSR
    void (async () => {
      const L = await import('leaflet');
      // Leaflet CSS is imported in globals.css via @import or next.config

      const map = L.map(containerRef.current!, {
        center: [center.latitude, center.longitude],
        zoom,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;

      // Draw radius circle
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

      // Add markers
      addMarkers(L, map, markers);
    })();

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when they change
  useEffect(() => {
    if (!mapRef.current) return;

    void (async () => {
      const L = await import('leaflet');
      // Clear existing markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      addMarkers(L, mapRef.current!, markers);
    })();
  }, [markers]);

  function addMarkers(L: typeof import('leaflet'), map: LeafletMap, items: MapMarker[]) {
    items.forEach((item) => {
      const color = MARKER_COLORS[item.type];
      const icon = MARKER_ICONS[item.type];

      const divIcon = L.divIcon({
        html: `<div style="
          background:${color};
          border:2px solid white;
          border-radius:50%;
          width:28px;height:28px;
          display:flex;align-items:center;justify-content:center;
          font-size:14px;
          box-shadow:0 2px 8px rgba(0,0,0,0.3);
        ">${icon}</div>`,
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
    <div className={`rounded-xl overflow-hidden border border-border ${className}`}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
