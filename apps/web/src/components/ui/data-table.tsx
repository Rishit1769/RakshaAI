import type { ReactNode } from 'react';
import { Card } from './card';

export function DataTable<T extends Record<string, ReactNode>>({
  rows,
  columns,
}: {
  rows: T[];
  columns: Array<{ key: keyof T; label: string }>;
}) {
  return (
    <Card padding="none" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-surface-soft/75 text-muted">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-5 py-4 font-mono text-[0.72rem] uppercase tracking-[0.14em]">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-hairline align-top transition-colors hover:bg-primary/[0.03]">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-5 py-4 text-body">
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
