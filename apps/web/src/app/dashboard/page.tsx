'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { MetricCard } from '@/components/ui/metric-card';
import { SectionBadge } from '@/components/ui/section-badge';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { authApi } from '@/lib/api/auth.api';
import { getPostLoginRoute } from '@/lib/auth-routing';
import { useAuthStore } from '@/store/auth.store';

const metricCards = [
  { label: 'Safety Status', value: 'Prepared' },
  { label: 'Coverage', value: 'Live Map' },
  { label: 'Contacts', value: 'Connected' },
  { label: 'Support', value: 'AI + Responders' },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const { clearAuth } = useAuthStore();
  const { user, isAuthenticated, isAuthReady } = useProtectedRoute();

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch {
      // Server-side logout failure should not leave client session alive.
    } finally {
      clearAuth();
      router.push('/auth/login');
    }
  };

  if (!isAuthReady) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Redirecting...</div>;
  }

  const postLoginRoute = getPostLoginRoute(user);
  useEffect(() => {
    if (postLoginRoute !== '/dashboard') {
      router.replace(postLoginRoute as never);
    }
  }, [postLoginRoute, router]);

  if (postLoginRoute !== '/dashboard') {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Redirecting...</div>;
  }

  return (
    <AppShell
      title="RakshaAI Dashboard"
      subtitle={`Welcome back, ${user.fullName.split(' ')[0]}.`}
      actions={
        <button onClick={handleLogout} className="btn-secondary">
          Sign out
        </button>
      }
    >
      <div className="space-y-6">
        <Card padding="lg" className="accent-glow">
          <SectionBadge label="Operational overview" pulse />
          <h2 className="display-subsection mt-5">One place to monitor safety, coordination, and escalation.</h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-body">
            RakshaAI keeps awareness, emergency response, community intelligence, and journey monitoring inside one consistent operational workspace.
          </p>
        </Card>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {metricCards.map((card) => (
            <MetricCard key={card.label} label={card.label} value={card.value} />
          ))}
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card padding="lg">
            <h3 className="text-xl font-semibold text-ink">Live safety workspace</h3>
            <p className="mt-3 text-base leading-8 text-body">
              Move between journey monitoring, safety maps, community reports, AI guidance, and account controls without losing context.
            </p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <Link href="/journey" className="rounded-[var(--radius-xl)] border border-border bg-surface-soft/70 p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <h4 className="text-lg font-semibold text-ink">Journey Mode</h4>
                <p className="mt-2 text-sm leading-7 text-body">Start monitored travel with a clear expected-arrival window.</p>
              </Link>
              <Link href="/community" className="rounded-[var(--radius-xl)] border border-border bg-surface-soft/70 p-5 transition-all hover:-translate-y-0.5 hover:shadow-card">
                <h4 className="text-lg font-semibold text-ink">Community Reports</h4>
                <p className="mt-2 text-sm leading-7 text-body">Review and contribute local safety signals.</p>
              </Link>
            </div>
          </Card>

          <Card padding="lg" className="flex flex-col items-center justify-center gap-4 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Panic-first control</p>
            <button className="btn-sos" onClick={() => router.push('/sos')} aria-label="Trigger emergency SOS">
              SOS
            </button>
            <p className="max-w-sm text-base leading-8 text-body">
              The emergency flow fetches your freshest location before routing alerts to contacts and responders.
            </p>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
