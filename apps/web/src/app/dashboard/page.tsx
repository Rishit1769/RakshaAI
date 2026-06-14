'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const quickActions = [
  { label: 'Journey Mode', href: '/journey', icon: 'Journey', desc: 'Start monitored travel sessions with fallback escalation.' },
  { label: 'Community', href: '/community', icon: 'Reports', desc: 'Review local safety signals and share verified observations.' },
  { label: 'Contacts', href: '/dashboard/emergency-contacts', icon: 'Contacts', desc: 'Keep your trusted emergency contacts current.' },
  { label: 'AI Assistant', href: '/ai', icon: 'AI', desc: 'Get fast guidance when you need calm next steps.' },
] as const;

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

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

  useEffect(() => {
    if (!isAuthenticated) router.push('/auth/login');
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-background">
        <div className="page-container py-24 text-sm text-muted">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="app-header">
        <div className="page-container flex flex-wrap items-center justify-between gap-4 py-4">
          <div>
            <div className="brand-lockup">
              <span className="brand-mark">R</span>
              <span className="display-label text-lg text-ink">RakshaAI</span>
            </div>
            <p className="mt-2 text-sm text-muted">Welcome back, {user.fullName.split(' ')[0]}.</p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/dashboard/settings" className="btn-secondary">
              Settings
            </Link>
            <button onClick={handleLogout} className="btn-secondary">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="page-container space-y-6 py-8">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="surface-panel space-y-5 p-8">
            <span className="eyebrow">Safety operating system</span>
            <h1 className="display-subsection">One dashboard for awareness, action, and escalation.</h1>
            <p className="max-w-2xl text-base leading-7 text-body">
              Move between proactive tools and emergency response without changing context. Your account, contacts, live map surfaces, and assistance flows stay connected.
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-4 dark:bg-[#14171d]">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Status</p>
                <p className="mt-3 text-lg font-semibold text-ink">Prepared</p>
              </div>
              <div className="rounded-xl bg-white p-4 dark:bg-[#14171d]">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Coverage</p>
                <p className="mt-3 text-lg font-semibold text-ink">Live map</p>
              </div>
              <div className="rounded-xl bg-white p-4 dark:bg-[#14171d]">
                <p className="text-xs uppercase tracking-[0.12em] text-muted">Support</p>
                <p className="mt-3 text-lg font-semibold text-ink">AI + responders</p>
              </div>
            </div>
          </div>

          <div className="product-card flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-sm font-semibold text-muted">Emergency shortcut</p>
            <button className="btn-sos" onClick={() => router.push('/sos')} aria-label="Trigger emergency SOS">
              SOS
            </button>
            <p className="max-w-xs text-sm text-muted">Use only when you need immediate help. The flow will try to attach fresh location before sending.</p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href} className="product-card flex flex-col gap-4 p-6">
              <div className="flex items-center justify-between">
                <span className="eyebrow bg-surface-soft">{action.icon}</span>
                <span className="text-xs text-muted">Open</span>
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{action.label}</p>
                <p className="mt-2 text-sm leading-7 text-body">{action.desc}</p>
              </div>
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
