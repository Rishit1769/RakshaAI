import type L from 'leaflet';
import 'leaflet/dist/leaflet.css';

let configured = false;

export function configureLeafletDefaults(leaflet: typeof L) {
  if (configured) return;

  delete (leaflet.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
  leaflet.Icon.Default.mergeOptions({
    iconUrl: '/leaflet/marker-icon.png',
    iconRetinaUrl: '/leaflet/marker-icon-2x.png',
    shadowUrl: '/leaflet/marker-shadow.png',
  });

  configured = true;
}
