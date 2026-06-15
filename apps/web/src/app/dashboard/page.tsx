'use client';

import { useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const sidebarLinks = [
  { label: 'Overview', href: '/dashboard' },
  { label: 'Journey', href: '/journey' },
  { label: 'Safety Map', href: '/map' },
  { label: 'Community', href: '/community' },
  { label: 'AI Assistant', href: '/ai' },
  { label: 'Contacts', href: '/dashboard/emergency-contacts' },
  { label: 'Settings', href: '/dashboard/settings' },
] as const;

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
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-[var(--color-muted)]">Checking session...</div>;
  }

  if (!isAuthenticated || !user) {
    return <div className="min-h-screen bg-background px-6 py-20 text-sm text-[var(--color-muted)]">Redirecting...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header">
        <div className="page-container flex min-h-16 items-center justify-between gap-4 py-3">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-ink)]">RakshaAI Dashboard</h1>
            <p className="text-sm text-[var(--color-muted)]">Welcome back, {user.fullName.split(' ')[0]}.</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button onClick={handleLogout} className="btn-secondary">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside className="hidden w-64 flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-card)] lg:block">
          <div className="flex h-full flex-col px-5 py-6">
            <div className="brand-lockup mb-8">
              <span className="brand-mark">R</span>
              <span className="display-label text-base">RakshaAI</span>
            </div>
            <nav className="space-y-2">
              {sidebarLinks.map((item) => (
                <a key={item.href} href={item.href} className={`block rounded-[var(--rounded-md)] px-4 py-3 text-sm font-medium ${item.href === '/dashboard' ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]' : 'text-[var(--color-body)]'}`}>
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="mt-auto rounded-[var(--rounded-lg)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Emergency shortcut</p>
              <p className="mt-2 text-sm text-[var(--color-muted)]">Keep SOS accessible from every operational screen.</p>
              <button onClick={() => router.push('/sos')} className="btn-primary mt-4 w-full">
                Open SOS
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 px-6 py-8">
          <div className="mx-auto max-w-6xl space-y-8">
            <section className="surface-panel p-8">
              <span className="eyebrow">Operational overview</span>
              <h2 className="display-section mt-4">One place to monitor safety, coordination, and escalation.</h2>
              <p className="mt-4 max-w-3xl text-base leading-relaxed text-[var(--color-body)]">
                RakshaAI keeps awareness, emergency response, community intelligence, and journey monitoring inside one consistent operational workspace.
              </p>
            </section>

            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {metricCards.map((card) => (
                <div key={card.label} className="card p-6">
                  <p className="text-sm font-medium text-[var(--color-muted)]">{card.label}</p>
                  <p className="mt-3 text-xl font-bold text-[var(--color-ink)]">{card.value}</p>
                </div>
              ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
              <div className="card p-8">
                <h3 className="text-lg font-semibold text-[var(--color-ink)]">Live safety workspace</h3>
                <p className="mt-3 text-base leading-relaxed text-[var(--color-body)]">
                  Use the left navigation to move between journey monitoring, safety maps, community reports, AI guidance, and account controls without losing context.
                </p>
                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <a href="/journey" className="card p-6">
                    <h4 className="text-lg font-semibold text-[var(--color-ink)]">Journey Mode</h4>
                    <p className="mt-2 text-sm text-[var(--color-body)]">Start monitored travel with a clear expected-arrival window.</p>
                  </a>
                  <a href="/community" className="card p-6">
                    <h4 className="text-lg font-semibold text-[var(--color-ink)]">Community Reports</h4>
                    <p className="mt-2 text-sm text-[var(--color-body)]">Review and contribute local safety signals.</p>
                  </a>
                </div>
              </div>

              <div className="card flex flex-col items-center justify-center gap-4 p-8 text-center">
                <p className="text-sm font-medium text-[var(--color-muted)]">Panic-first control</p>
                <button className="btn-sos" onClick={() => router.push('/sos')} aria-label="Trigger emergency SOS">
                  SOS
                </button>
                <p className="text-base leading-relaxed text-[var(--color-body)]">
                  The emergency flow fetches your freshest location before routing alerts to contacts and responders.
                </p>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
