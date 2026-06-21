'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Circle, Control, LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
import { configureLeafletDefaults } from '@/lib/leaflet-config';
import { INDIA_CENTER, normalizeCenter, toCoordinateNumber } from '@/lib/geo';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'user' | 'volunteer' | 'police' | 'safe_zone' | 'alert' | 'hotspot' | 'incident' | 'report_pin' | 'police_station';
  label?: string;
  popupHtml?: string;
  pinColor?: 'white' | 'yellow' | 'red';
  markerColor?: string;
  markerText?: string;
}

interface SafetyMapProps {
  center: { latitude: number; longitude: number };
  zoom?: number;
  markers?: MapMarker[];
  radiusKm?: number;
  className?: string;
  placementMode?: boolean;
  selectedLocation?: { latitude: number; longitude: number } | null;
  onMapClick?: (coords: { latitude: number; longitude: number }) => void;
  showPoliceStations?: boolean;
  showLegend?: boolean;
}

type PermissionStateValue = 'granted' | 'denied' | 'prompt';

type PoliceStationElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

const MARKER_COLORS: Record<'user' | 'volunteer' | 'police' | 'safe_zone' | 'alert' | 'hotspot', string> = {
  user: 'var(--color-ai)',
  volunteer: 'var(--color-safe)',
  police: 'var(--color-primary)',
  safe_zone: 'var(--color-safe)',
  alert: 'var(--color-emergency)',
  hotspot: 'var(--color-warning)',
};

const MARKER_LABELS: Record<'user' | 'volunteer' | 'police' | 'safe_zone' | 'alert' | 'hotspot', string> = {
  user: 'YOU',
  volunteer: 'VOL',
  police: 'POL',
  safe_zone: 'SAFE',
  alert: 'SOS',
  hotspot: 'HOT',
};

function truncateText(value?: string | null, maxLength = 100): string {
  if (!value) return 'No description provided';
  return value.length > maxLength ? `${value.slice(0, maxLength - 1)}...` : value;
}

export default function SafetyMap({
  center,
  zoom = 14,
  markers = [],
  radiusKm,
  className = 'h-80 w-full',
  placementMode = false,
  selectedLocation = null,
  onMapClick,
  showPoliceStations = false,
  showLegend = false,
}: SafetyMapProps) {
  const normalizedCenter = normalizeCenter(center);
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<Circle | null>(null);
  const overlayLayerRef = useRef<LayerGroup | null>(null);
  const policeLayerRef = useRef<LayerGroup | null>(null);
  const placementMarkerRef = useRef<Marker | null>(null);
  const userMarkerRef = useRef<Marker | null>(null);
  const legendControlRef = useRef<Control | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  const userLocationRef = useRef<{ latitude: number; longitude: number } | null>(null);
  const permissionStateRef = useRef<PermissionStateValue>('prompt');
  const isMountedRef = useRef(false);
  const [showLocationBanner, setShowLocationBanner] = useState(false);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);
  const shouldShowLocationBanner = showLocationBanner && !locationBannerDismissed;
  const mapClassName = useMemo(() => `raksha-map ${className}`, [className]);

  useEffect(() => {
    let active = true;
    isMountedRef.current = true;

    void (async () => {
      const L = await import('leaflet');
      if (!active || !containerRef.current) return;

      leafletRef.current = L;
      configureLeafletDefaults(L);
      ensurePulseStyle();

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id) {
        delete container._leaflet_id;
      }
      container.innerHTML = '';

      const map = L.map(container, {
        center: [INDIA_CENTER.latitude, INDIA_CENTER.longitude],
        zoom: 5,
        zoomControl: true,
        attributionControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      overlayLayerRef.current = L.layerGroup().addTo(map);
      policeLayerRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      if (showLegend) {
        legendControlRef.current = buildLegendControl(L);
        legendControlRef.current.addTo(map);
      }

      map.on('click', (event) => {
        if (!placementMode || !onMapClick) return;
        onMapClick({
          latitude: event.latlng.lat,
          longitude: event.latlng.lng,
        });
      });

      renderRadius();
      renderMarkers();
      renderPlacementMarker();
      void applyUserLocation(map);
      if (showPoliceStations) {
        void loadPoliceStations();
      }
    })();

    return () => {
      active = false;
      isMountedRef.current = false;
      legendControlRef.current?.remove();
      legendControlRef.current = null;
      placementMarkerRef.current?.remove();
      placementMarkerRef.current = null;
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      overlayLayerRef.current?.clearLayers();
      overlayLayerRef.current = null;
      policeLayerRef.current?.clearLayers();
      policeLayerRef.current = null;
      circleRef.current?.remove();
      circleRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView([normalizedCenter.latitude, normalizedCenter.longitude], zoom);
    renderRadius();
    if (showPoliceStations) {
      void loadPoliceStations();
    }
  }, [normalizedCenter.latitude, normalizedCenter.longitude, zoom, radiusKm, showPoliceStations]);

  useEffect(() => {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) return;

    let active = true;
    let cleanup: (() => void) | undefined;

    void navigator.permissions
      .query({ name: 'geolocation' as PermissionName })
      .then((result) => {
        if (!active) return;

        const syncState = () => {
          permissionStateRef.current = result.state;
          setShowLocationBanner(result.state === 'denied');
          if (result.state !== 'denied') {
            setLocationBannerDismissed(false);
          }
        };

        syncState();

        if (typeof result.addEventListener === 'function') {
          result.addEventListener('change', syncState);
          cleanup = () => result.removeEventListener('change', syncState);
          return;
        }

        result.onchange = syncState;
        cleanup = () => {
          result.onchange = null;
        };
      })
      .catch(() => {
        // Ignore permissions API failures and let geolocation callbacks handle state.
      });

    return () => {
      active = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    renderMarkers();
  }, [markers]);

  useEffect(() => {
    renderPlacementMarker();
  }, [selectedLocation, placementMode]);

  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.off('click');
    if (!placementMode) return;
    mapRef.current.on('click', (event) => {
      if (!onMapClick) return;
      onMapClick({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    });
  }, [placementMode, onMapClick]);

  function renderRadius() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    circleRef.current?.remove();
    circleRef.current = null;

    if (!radiusKm) return;

    const radiusCenter = userLocationRef.current ?? normalizedCenter;

    circleRef.current = L.circle([radiusCenter.latitude, radiusCenter.longitude], {
      radius: radiusKm * 1000,
      color: 'var(--color-primary)',
      fillColor: 'var(--color-primary)',
      fillOpacity: 0.08,
      weight: 1.5,
      dashArray: '6 4',
    }).addTo(map);
  }

  function renderMarkers() {
    const L = leafletRef.current;
    const layer = overlayLayerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();

    markers.forEach((item) => {
      const latitude = toCoordinateNumber(item.latitude, Number.NaN);
      const longitude = toCoordinateNumber(item.longitude, Number.NaN);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
      const marker = L.marker([latitude, longitude], { icon: buildMarkerIcon(L, item) });
      if (item.popupHtml ?? item.label) {
        marker.bindPopup(item.popupHtml ?? `<strong>${item.label}</strong>`);
      }
      marker.addTo(layer);
    });
  }

  function renderPlacementMarker() {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    placementMarkerRef.current?.remove();
    placementMarkerRef.current = null;

    if (!placementMode || !selectedLocation) return;

    const latitude = toCoordinateNumber(selectedLocation.latitude, Number.NaN);
    const longitude = toCoordinateNumber(selectedLocation.longitude, Number.NaN);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    placementMarkerRef.current = L.marker([latitude, longitude], { icon: buildPlacementIcon(L) })
      .addTo(map)
      .bindPopup('Marked unsafe area')
      .openPopup();
  }

  async function loadPoliceStations() {
    const L = leafletRef.current;
    const layer = policeLayerRef.current;
    if (!L || !layer) return;

    layer.clearLayers();

    try {
      const anchor = userLocationRef.current ?? normalizedCenter;
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `
            [out:json][timeout:25];
            (
            node["amenity"="police"](around:5000,${anchor.latitude},${anchor.longitude});
            way["amenity"="police"](around:5000,${anchor.latitude},${anchor.longitude});
          );
          out body center;
        `,
      });

      const payload = (await response.json()) as { elements?: PoliceStationElement[] };
      const elements = payload.elements ?? [];

      elements.forEach((element) => {
        const latitude = element.lat ?? element.center?.lat;
        const longitude = element.lon ?? element.center?.lon;
        if (latitude === undefined || longitude === undefined) return;

        const name = element.tags?.name ?? 'Police Station';
        const address = [element.tags?.['addr:street'], element.tags?.['addr:city']].filter(Boolean).join(', ') || 'Address unavailable';

        L.marker([latitude, longitude], { icon: buildPoliceStationIcon(L) })
          .bindPopup(
            `<div style="min-width:180px">
              <strong>${name}</strong><br/>
              <span>${address}</span><br/>
              <span style="color:var(--color-primary);font-weight:700;">Safe Reporting Point</span>
            </div>`
          )
          .addTo(layer);
      });
    } catch (error) {
      console.error('[map] failed to load police stations', error);
    }
  }

  return (
    <div className={mapClassName}>
      {shouldShowLocationBanner ? (
        <div className="mb-3 flex items-start justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <p>Location access is blocked. Enable it in your browser settings for accurate map positioning.</p>
          <button type="button" onClick={() => setLocationBannerDismissed(true)} className="shrink-0 font-semibold text-amber-900">
            Dismiss
          </button>
        </div>
      ) : null}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );

  async function applyUserLocation(map: LeafletMap) {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isMountedRef.current) return;

        const latitude = toCoordinateNumber(position.coords.latitude, INDIA_CENTER.latitude);
        const longitude = toCoordinateNumber(position.coords.longitude, INDIA_CENTER.longitude);
        const accuracy = Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 0;
        const userLatLng: [number, number] = [latitude, longitude];
        const L = leafletRef.current;

        if (!L) return;

        userLocationRef.current = { latitude, longitude };
        permissionStateRef.current = 'granted';
        setShowLocationBanner(false);
        setLocationBannerDismissed(false);

        map.flyTo(userLatLng, 13, { animate: true, duration: 1.2 });
        renderRadius();
        if (showPoliceStations) {
          void loadPoliceStations();
        }

        userMarkerRef.current?.remove();
        userMarkerRef.current = L.marker(userLatLng, { icon: buildUserLocationIcon(L) })
          .addTo(map)
          .bindPopup(`Your location<br/>Accuracy: ${Math.round(accuracy)}m`)
          .openPopup();
      },
      (error) => {
        if (!isMountedRef.current) return;

        if (error.code === error.PERMISSION_DENIED) {
          permissionStateRef.current = 'denied';
          setShowLocationBanner(true);
        }

        console.warn('Geolocation error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }
}

function buildLegendControl(L: typeof import('leaflet')): Control {
  const legend = new L.Control({ position: 'bottomleft' });

  legend.onAdd = () => {
    const div = L.DomUtil.create('div', 'leaflet-map-legend');
    div.innerHTML = `
      <div style="background:var(--color-navy);color:var(--color-on-dark);padding:10px 12px;border-radius:16px;border:1px solid rgba(255,255,255,0.12);box-shadow:var(--shadow-md);font-size:12px;line-height:1.6;">
        <div style="font-weight:700;margin-bottom:6px;">Legend</div>
        <div><span style="color:var(--color-canvas);">●</span> White - No reported incidents</div>
        <div><span style="color:var(--color-warning);">●</span> Yellow - Some activity reported</div>
        <div><span style="color:var(--color-emergency);">●</span> Red - High-density incident zone</div>
        <div><span style="color:var(--color-primary);">■</span> Orange - Police station / Safe spot</div>
      </div>
    `;
    return div;
  };

  return legend;
}

function buildMarkerIcon(L: typeof import('leaflet'), marker: MapMarker) {
  if (marker.type === 'incident') {
    return getIncidentPinIcon(L, marker.pinColor ?? 'white');
  }

  if (marker.type === 'report_pin') {
    return buildPlacementIcon(L);
  }

  if (marker.type === 'police_station') {
    return buildPoliceStationIcon(L);
  }

  const baseType = marker.type as keyof typeof MARKER_COLORS;
  const color = marker.markerColor ?? MARKER_COLORS[baseType];
  const label = marker.markerText ?? MARKER_LABELS[baseType];

  return L.divIcon({
    html: `<div style="
      background:${color};
      border:2px solid var(--color-canvas);
      border-radius:999px;
      min-width:42px;
      height:28px;
      padding:0 8px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:10px;
      font-weight:800;
      letter-spacing:0.04em;
      color:var(--color-on-primary);
      box-shadow:var(--shadow-md);
    ">${label}</div>`,
    className: '',
    iconSize: [42, 28],
    iconAnchor: [21, 14],
    popupAnchor: [0, -14],
  });
}

function getIncidentPinIcon(L: typeof import('leaflet'), color: 'white' | 'yellow' | 'red') {
  const colorMap = {
    white: 'var(--color-canvas)',
    yellow: 'var(--color-warning)',
    red: 'var(--color-emergency)',
  };

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 24 12 24S24 21 24 12C24 5.373 18.627 0 12 0z"
            fill="${colorMap[color]}" stroke="var(--color-body)" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4" fill="var(--color-body)" opacity="0.6"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

function buildPlacementIcon(L: typeof import('leaflet')) {
  const svg = `
    <div style="position:relative;width:28px;height:28px;">
      <span style="position:absolute;inset:0;border-radius:999px;background:color-mix(in srgb, var(--color-emergency) 25%, transparent);animation:map-pin-pulse 1.8s ease-out infinite;"></span>
      <span style="position:absolute;left:6px;top:6px;width:16px;height:16px;border-radius:999px;background:var(--color-emergency);border:2px solid var(--color-canvas);box-shadow:var(--shadow-emergency);"></span>
    </div>
  `;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -12],
  });
}

function buildPoliceStationIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    html: `<div style="
      background:var(--color-primary);
      color:var(--color-on-primary);
      font-size:11px;
      font-weight:700;
      padding:4px 7px;
      border-radius:6px;
      border:2px solid var(--color-canvas);
      box-shadow:var(--shadow-sm);
      white-space:nowrap;
    ">POLICE</div>`,
    className: '',
    iconAnchor: [20, 16],
    popupAnchor: [0, -16],
  });
}

function buildUserLocationIcon(L: typeof import('leaflet')) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        width: 20px;
        height: 20px;
        background: #3b82f6;
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 0 0 4px rgba(59,130,246,0.3);
        animation: pulse 2s infinite;
      "></div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

function ensurePulseStyle() {
  if (typeof document === 'undefined' || document.getElementById('leaflet-pulse-style')) return;

  const style = document.createElement('style');
  style.id = 'leaflet-pulse-style';
  style.textContent = `
    @keyframes pulse {
      0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
      70% { box-shadow: 0 0 0 12px rgba(59,130,246,0); }
      100% { box-shadow: 0 0 0 0 rgba(59,130,246,0); }
    }
  `;
  document.head.appendChild(style);
}

export function buildIncidentPopupHtml(incident: {
  id: string;
  type: string;
  description?: string | null;
  score: number;
  likes: number;
  comments: number;
}) {
  return `<div style="min-width:220px">
    <strong>${incident.type.replace(/_/g, ' ')}</strong><br/>
    <span>${truncateText(incident.description)}</span><br/><br/>
    <span><strong>Score:</strong> ${incident.score}</span><br/>
    <span><strong>Likes:</strong> ${incident.likes}</span><br/>
    <span><strong>Comments:</strong> ${incident.comments}</span><br/><br/>
    <a href="/community#report-${incident.id}" style="color:var(--color-primary);font-weight:700;">View Full Report</a>
  </div>`;
}
