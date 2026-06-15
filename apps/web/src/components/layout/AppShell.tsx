import ThemeToggle from '@/components/ui/ThemeToggle';

interface AppShellProps {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, backHref = '/dashboard', backLabel = 'Back', actions, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="app-header">
        <div className="page-container flex min-h-16 flex-wrap items-center justify-between gap-4 py-3">
          <div className="flex items-start gap-3">
            <a href={backHref} className="btn-secondary">
              {backLabel}
            </a>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-ink)]">{title}</h1>
              <p className="text-sm text-[var(--color-muted)]">{subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {actions}
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="page-container py-8 md:py-12">{children}</main>
    </div>
  );
}
