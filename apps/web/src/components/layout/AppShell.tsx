import { DashboardLayout } from './DashboardLayout';

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
    <DashboardLayout
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <a href={backHref} className="btn-secondary">
            {backLabel}
          </a>
          {actions}
        </>
      }
    >
      {children}
    </DashboardLayout>
  );
}
