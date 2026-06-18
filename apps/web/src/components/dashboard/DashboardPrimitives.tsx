import type { ReactNode } from 'react';

export function MetricGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="product-card">
          <p className="text-sm font-medium text-muted">{item.label}</p>
          <p className="mt-3 text-3xl font-semibold text-ink">{item.value}</p>
        </div>
      ))}
    </section>
  );
}

export function SectionCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="product-card">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-muted">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyBlock({ message }: { message: string }) {
  return <div className="rounded-xl border border-dashed border-hairline p-6 text-sm text-muted">{message}</div>;
}

export function SimpleTable<T extends Record<string, ReactNode>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-hairline text-muted">
            {columns.map((column) => (
              <th key={String(column.key)} className="px-3 py-3 font-medium">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-hairline/60 align-top">
              {columns.map((column) => (
                <td key={String(column.key)} className="px-3 py-3 text-body">
                  {row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
