'use client';

import type { ReactNode } from 'react';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'Loading...', className = '' }: LoadingStateProps) {
  return (
    <div className={`card flex min-h-32 items-center justify-center gap-3 text-sm text-[var(--color-muted)] ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-[color-mix(in_srgb,var(--color-primary)_30%,transparent)] border-t-[var(--color-primary)]" />
      <span>{label}</span>
    </div>
  );
}

interface SkeletonCardsProps {
  count?: number;
  className?: string;
}

export function SkeletonCards({ count = 3, className = '' }: SkeletonCardsProps) {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card space-y-3">
          <div className="skeleton h-4 w-1/3" />
          <div className="skeleton h-3 w-5/6" />
          <div className="skeleton h-3 w-2/3" />
        </div>
      ))}
    </div>
  );
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state text-center">
      {icon ? <div className="mb-3 text-base font-medium text-[var(--color-muted)]">{icon}</div> : null}
      <h3 className="text-base font-semibold text-[var(--color-ink)]">{title}</h3>
      {description ? <p className="mt-1 text-sm text-[var(--color-muted)]">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
