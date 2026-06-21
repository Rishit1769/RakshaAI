'use client';

import { useEffect } from 'react';

export default function LeafletRuntimeConfig() {
  useEffect(() => {
    let active = true;

    void (async () => {
      const [{ default: L }, { configureLeafletDefaults }] = await Promise.all([
        import('leaflet'),
        import('@/lib/leaflet-config'),
      ]);

      if (!active) return;
      configureLeafletDefaults(L);
    })();

    return () => {
      active = false;
    };
  }, []);

  return null;
}
