import type { ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { MetricCard } from '@/components/ui/metric-card';
import { EmptyState } from '@/components/ui/empty-state';

export function MetricGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => <MetricCard key={item.label} label={item.label} value={item.value} />)}
    </section>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </Card>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return <EmptyState title="Nothing to show yet" description={message} />;
}

export function SimpleTable<T extends Record<string, ReactNode>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
}) {
  return <DataTable rows={rows} columns={columns} />;
}
