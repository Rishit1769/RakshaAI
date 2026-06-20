'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authApi } from '@/lib/api/auth.api';
import { adminApi } from '@/lib/api/admin.api';
import { departmentApi } from '@/lib/api/department.api';
import { getDashboardNavigation } from '@/lib/dashboard-navigation';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ApiError } from '@/lib/api/fetcher';
import { getSocket } from '@/lib/socket';

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
  const [pendingModerationCount, setPendingModerationCount] = useState(0);
  const [liveSosCount, setLiveSosCount] = useState(0);
  const [departmentName, setDepartmentName] = useState<string | null>(null);
  const isSuperadmin = user?.role === 'SUPERADMIN';
  const isDepartment = user?.role === 'POLICE_DEPARTMENT';

  useEffect(() => {
    if (!isSuperadmin) return;
    void (async () => {
      try {
        const response = await adminApi.getNavigationMeta();
        setPendingModerationCount(response.data?.pendingModerationCount ?? 0);
      } catch {
        setPendingModerationCount(0);
      }
    })();
  }, [isSuperadmin, pathname]);

  useEffect(() => {
    if (!isDepartment) return;

    let mounted = true;
    const socket = getSocket(useAuthStore.getState().accessToken ?? undefined);
    const handleSosCreated = () => setLiveSosCount((count) => count + 1);
    socket.on('SOS_CREATED', handleSosCreated);

    void (async () => {
      try {
        const response = await departmentApi.getNavigationMeta();
        if (!mounted) return;
        const data = response.data;
        setLiveSosCount(data?.liveSosCount ?? 0);
        setDepartmentName(data?.departmentName ?? null);
        if (data?.roomIds?.length) {
          socket.emit('JOIN_DEPARTMENT_ROOMS', data.roomIds);
        }
      } catch (error) {
        if (mounted && !(error instanceof ApiError)) {
          setLiveSosCount(0);
        }
      }
      return undefined;
    })();

    return () => {
      mounted = false;
      socket.off('SOS_CREATED', handleSosCreated);
    };
  }, [isDepartment, pathname]);

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
        <aside className="hidden w-[21rem] shrink-0 border-r border-border/80 bg-white/75 backdrop-blur-xl xl:block">
          <div className="flex h-full flex-col px-6 py-8">
            <div className="brand-lockup mb-8">
              <span className="brand-mark">R</span>
              <div>
                <p className="display-label text-base">RakshaAI</p>
                <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{user?.role ?? 'workspace'}</p>
              </div>
            </div>

            <nav className="space-y-2.5">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href as never}
                    className={`dashboard-nav-item ${
                      isActive
                        ? 'dashboard-nav-item-active'
                        : 'text-body hover:bg-surface-soft/92 hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Card className="surface-panel-modern mt-auto border-primary/10">
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
            <div className="page-container flex min-h-24 flex-wrap items-center justify-between gap-4 py-5">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Operational workspace</p>
                <h1 className="mt-2 font-display text-[2rem] leading-none tracking-[-0.03em] text-ink md:text-[2.35rem]">{title}</h1>
                <p className="mt-1 text-sm text-muted">{subtitle}</p>
              </div>
              <div className="flex items-center gap-3">
                {isSuperadmin ? (
                  <Link href={'/dashboard/superadmin/moderation' as never} className="btn-secondary relative min-h-11 px-4">
                    <span aria-hidden="true">Bell</span>
                    {pendingModerationCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-[image:var(--gradient-accent)] px-1 text-[11px] font-semibold text-white shadow-accent">
                        {pendingModerationCount}
                      </span>
                    ) : null}
                  </Link>
                ) : null}
                {isDepartment ? (
                  <div className="relative rounded-full border border-primary/20 bg-primary/5 px-4 py-2 shadow-soft">
                    <p className="text-[11px] font-mono uppercase tracking-[0.16em] text-primary">Live SOS</p>
                    <p className="text-sm font-semibold text-ink">{liveSosCount} active feed items</p>
                    {liveSosCount > 0 ? <span className="absolute right-2 top-2 h-2.5 w-2.5 animate-pulse rounded-full bg-primary" /> : null}
                  </div>
                ) : null}
                <div className="hidden rounded-full border border-border/80 bg-white/85 px-4 py-2 text-right shadow-soft lg:block">
                  <p className="text-xs font-mono uppercase tracking-[0.14em] text-muted">{isDepartment ? 'Department' : 'Signed in'}</p>
                  <p className="text-sm font-semibold text-ink">{isDepartment ? departmentName ?? user?.fullName ?? 'Department workspace' : user?.fullName ?? 'Workspace user'}</p>
                </div>
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
