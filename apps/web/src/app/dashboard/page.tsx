'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

const quickActions = [
  { label: 'Journey Mode', href: '/journey', icon: 'Map', desc: 'Track your route safely' },
  { label: 'Community', href: '/community', icon: 'People', desc: 'Area safety reports' },
  { label: 'Contacts', href: '/dashboard/emergency-contacts', icon: 'Phone', desc: 'Emergency contacts & reports' },
  { label: 'AI Assistant', href: '/ai', icon: 'AI', desc: 'Safety guidance' },
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
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-muted text-sm">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light dark:bg-[#0B1026] transition-colors duration-200">
      <header className="flex items-center justify-between border-b border-border bg-white px-4 py-3 dark:border-white/10 dark:bg-[#0d1628]">
        <div>
          <h1 className="text-lg font-bold text-navy dark:text-white">
            Raksha<span className="text-primary">AI</span>
          </h1>
          <p className="text-xs text-muted dark:text-white/45">Welcome, {user.fullName.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/dashboard/settings"
            className="interactive rounded-lg px-3 py-1 text-xs text-muted hover:bg-gray-100 hover:text-navy dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Settings
          </Link>
          <button
            onClick={handleLogout}
            className="interactive rounded-lg px-3 py-1 text-xs text-muted hover:bg-gray-100 hover:text-navy dark:text-white/40 dark:hover:bg-white/5 dark:hover:text-white"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Safety Status</p>
            <span className="font-semibold text-navy">You&apos;re Safe</span>
          </div>
          <span className="text-sm font-semibold text-safe">Active Monitoring</span>
        </div>

        <div className="surface-panel flex flex-col items-center gap-3 px-4 py-8">
          <button className="btn-sos" onClick={() => router.push('/sos')} aria-label="Trigger emergency SOS">
            SOS
          </button>
          <p className="text-sm text-muted">Tap to activate emergency alert</p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-navy mb-3">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {quickActions.map((action) => (
              <Link key={action.href} href={action.href} className="card interactive flex flex-col gap-2 hover:-translate-y-0.5 hover:shadow-md">
                <span className="text-xs uppercase tracking-wide text-muted">{action.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-navy">{action.label}</p>
                  <p className="text-xs text-muted">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
