'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authApi } from '@/lib/api/auth.api';
import { getDashboardNavigation } from '@/lib/dashboard-navigation';
import { useAuthStore } from '@/store/auth.store';

interface DashboardLayoutProps {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function DashboardLayout({ title, subtitle, actions, children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const navItems = getDashboardNavigation(user?.role ?? 'user');

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // ignore server logout failures
    } finally {
      clearAuth();
      router.push('/auth/login');
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface-card)] xl:block">
          <div className="flex h-full flex-col px-5 py-6">
            <div className="brand-lockup mb-8">
              <span className="brand-mark">R</span>
              <div>
                <p className="display-label text-base">RakshaAI</p>
                <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{user?.role ?? 'workspace'}</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={`block rounded-[var(--rounded-md)] px-4 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[var(--color-surface-muted)] text-[var(--color-ink)]'
                        : 'text-[var(--color-body)] hover:bg-[var(--color-surface-muted)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto rounded-[var(--rounded-lg)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-ink)]">Signed in as</p>
              <p className="mt-2 text-sm text-[var(--color-body)]">{user?.email}</p>
              <button onClick={handleLogout} className="btn-secondary mt-4 w-full">
                Logout
              </button>
            </div>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="app-header">
            <div className="page-container flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
              <div>
                <h1 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h1>
                <p className="text-sm text-[var(--color-muted)]">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={'/dashboard/settings' as never} className="btn-secondary">
                  Settings
                </Link>
                {actions}
                <ThemeToggle />
              </div>
            </div>
          </header>

          <main className="page-container flex-1 py-8 md:py-12">{children}</main>
        </div>
      </div>
    </div>
  );
}
