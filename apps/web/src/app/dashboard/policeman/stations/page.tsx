'use client';

import dynamic from 'next/dynamic';
import { AppShell } from '@/components/layout/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { SectionCard } from '@/components/dashboard/DashboardPrimitives';
import { useRoleGuard } from '@/hooks/useRoleGuard';

const SafetyMap = dynamic(() => import('@/components/SafetyMap'), {
  ssr: false,
  loading: () => <LoadingState label="Loading map..." className="h-[32rem] w-full" />,
});

export default function PolicemanStationsPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('POLICEMAN');

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Nearby Stations" subtitle="Live police station discovery via the current Leaflet and Overpass integration.">
      <SectionCard title="Police stations and safe reporting points">
        <SafetyMap center={{ latitude: 28.6139, longitude: 77.209 }} zoom={12} markers={[]} className="h-[calc(100vh-16rem)] min-h-[32rem] w-full" showPoliceStations />
      </SectionCard>
    </AppShell>
  );
}
