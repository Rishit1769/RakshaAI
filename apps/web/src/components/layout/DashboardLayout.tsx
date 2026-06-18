'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth.api';
import { getDashboardNavigation } from '@/lib/dashboard-navigation';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

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
        <aside className="hidden w-80 shrink-0 border-r border-border bg-white/72 backdrop-blur-xl xl:block">
          <div className="flex h-full flex-col px-6 py-7">
            <div className="brand-lockup mb-8">
              <span className="brand-mark">R</span>
              <div>
                <p className="display-label text-base">RakshaAI</p>
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{user?.role ?? 'workspace'}</p>
              </div>
            </div>

            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={`block rounded-2xl px-4 py-3 text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-primary/[0.07] text-ink shadow-soft ring-1 ring-primary/10'
                        : 'text-body hover:bg-surface-soft/80 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Card className="mt-auto border-primary/10 bg-surface-soft/80">
              <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Signed in</p>
              <p className="mt-3 text-sm text-body">{user?.email}</p>
              <Button onClick={handleLogout} variant="secondary" className="mt-5 w-full">
                Logout
              </Button>
            </Card>
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col">
          <header className="app-header">
            <div className="page-container flex min-h-16 flex-wrap items-center justify-between gap-4 py-4">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Operational workspace</p>
                <h1 className="mt-2 text-[1.75rem] font-semibold tracking-[-0.02em] text-ink">{title}</h1>
                <p className="mt-1 text-sm text-muted">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                <Link href={'/dashboard/settings' as never} className="btn-secondary">
                  Settings
                </Link>
                {actions}
              </div>
            </div>
          </header>

          <main className="page-container flex-1 py-8 md:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
