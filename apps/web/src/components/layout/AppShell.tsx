import { DashboardLayout } from './DashboardLayout';

interface AppShellProps {
  title: string;
  subtitle: string;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ title, subtitle, backHref = '/dashboard', backLabel = 'Back', showBack = true, actions, children }: AppShellProps) {
  return (
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      actions={
        <>
          {showBack ? (
            <a href={backHref} className="btn-secondary">
              {backLabel}
            </a>
          ) : null}
          {actions}
        </>
      }
    >
      {children}
    </DashboardLayout>
  );
}
