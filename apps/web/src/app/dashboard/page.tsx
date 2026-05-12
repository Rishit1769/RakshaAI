'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-muted text-sm">Redirecting…</div>
      </div>
    );
  }

  const quickActions = [
    { label: 'Journey Mode', href: '/journey', icon: '🗺️', desc: 'Track your route safely' },
    { label: 'Community', href: '/community', icon: '👥', desc: 'Area safety reports' },
    { label: 'Contacts', href: '/contacts', icon: '📞', desc: 'Emergency contacts' },
    { label: 'AI Assistant', href: '/ai', icon: '🤖', desc: 'Safety guidance' },
  ];

  return (
    <div className="min-h-screen bg-light dark:bg-[#0B1026] transition-colors duration-200">
      {/* Top bar */}
      <header className="bg-white dark:bg-[#0d1628] border-b border-border dark:border-white/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-navy dark:text-white">
            Raksha<span className="text-primary">AI</span>
          </h1>
          <p className="text-xs text-muted dark:text-white/45">Welcome, {user.fullName.split(' ')[0]}</p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => { clearAuth(); router.push('/auth/login'); }}
            className="text-xs text-muted dark:text-white/40 hover:text-navy dark:hover:text-white px-3 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        {/* Safety Status */}
        <div className="card flex items-center justify-between">
          <div>
            <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">
              Safety Status
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-safe animate-pulse" />
              <span className="font-semibold text-navy">You&apos;re Safe</span>
            </div>
          </div>
          <span className="text-3xl">🛡️</span>
        </div>

        {/* SOS Button */}
        <div className="flex flex-col items-center gap-3 py-6">
          <button
            className="btn-sos"
            onClick={() => router.push('/sos')}
            aria-label="Trigger emergency SOS"
          >
            SOS
          </button>
          <p className="text-sm text-muted">Tap to activate emergency alert</p>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-navy mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="card flex flex-col gap-2 hover:shadow-md transition-shadow"
              >
                <span className="text-2xl">{action.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-navy">{action.label}</p>
                  <p className="text-xs text-muted">{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Phase status */}
        <div className="card bg-primary/5 border border-primary/20">
          <p className="text-xs text-primary font-semibold uppercase tracking-wider mb-1">
            Phase 2 Active — Authentication
          </p>
          <p className="text-xs text-navy">
            Auth system live. Phase 3 (SOS emergency system) is next.
          </p>
        </div>
      </main>
    </div>
  );
}
