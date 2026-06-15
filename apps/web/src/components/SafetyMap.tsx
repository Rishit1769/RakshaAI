'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type { Circle, Control, LayerGroup, Map as LeafletMap, Marker } from 'leaflet';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

export interface MapMarker {
  id: string;
  latitude: number;
  longitude: number;
  type: 'user' | 'volunteer' | 'police' | 'safe_zone' | 'alert' | 'hotspot' | 'incident' | 'report_pin' | 'police_station';
  label?: string;
  popupHtml?: string;
  pinColor?: 'white' | 'yellow' | 'red';
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
  const mapRef = useRef<LeafletMap | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const circleRef = useRef<Circle | null>(null);
  const overlayLayerRef = useRef<LayerGroup | null>(null);
  const policeLayerRef = useRef<LayerGroup | null>(null);
  const placementMarkerRef = useRef<Marker | null>(null);
  const legendControlRef = useRef<Control | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);

  useEffect(() => {
    let active = true;

    void (async () => {
      const L = await import('leaflet');
      if (!active || !containerRef.current) return;

      leafletRef.current = L;

      delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x.src,
        iconUrl: markerIcon.src,
        shadowUrl: markerShadow.src,
      });

      const container = containerRef.current as HTMLDivElement & { _leaflet_id?: number };
      if (container._leaflet_id) {
        delete container._leaflet_id;
      }
      container.innerHTML = '';

      const map = L.map(container, {
        center: [center.latitude, center.longitude],
        zoom,
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
      if (showPoliceStations) {
        void loadPoliceStations();
      }
    })();

    return () => {
      active = false;
      legendControlRef.current?.remove();
      legendControlRef.current = null;
      placementMarkerRef.current?.remove();
      placementMarkerRef.current = null;
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
    mapRef.current.setView([center.latitude, center.longitude], zoom);
    renderRadius();
    if (showPoliceStations) {
      void loadPoliceStations();
    }
  }, [center.latitude, center.longitude, zoom, radiusKm, showPoliceStations]);

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

    circleRef.current = L.circle([center.latitude, center.longitude], {
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
      const marker = L.marker([item.latitude, item.longitude], { icon: buildMarkerIcon(L, item) });
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

    placementMarkerRef.current = L.marker([selectedLocation.latitude, selectedLocation.longitude], { icon: buildPlacementIcon(L) })
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
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: `
          [out:json][timeout:25];
          (
            node["amenity"="police"](around:5000,${center.latitude},${center.longitude});
            way["amenity"="police"](around:5000,${center.latitude},${center.longitude});
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
    <div className={`raksha-map ${className}`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
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
  const color = MARKER_COLORS[baseType];
  const label = MARKER_LABELS[baseType];

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
