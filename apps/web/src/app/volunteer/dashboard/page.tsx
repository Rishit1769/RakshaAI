'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LegacyVolunteerDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/volunteer');
  }, [router]);

  return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Redirecting to the canonical volunteer dashboard...</div>;
}
