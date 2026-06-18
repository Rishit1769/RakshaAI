import type { ReactNode } from 'react';
import { Card } from './card';

export function MetricCard({
  label,
  value,
  inset,
}: {
  label: string;
  value: ReactNode;
  inset?: string;
}) {
  return (
    <Card>
      <p className="font-mono text-[0.72rem] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink">{value}</p>
      {inset ? <p className="mt-2 text-sm text-muted">{inset}</p> : null}
    </Card>
  );
}
