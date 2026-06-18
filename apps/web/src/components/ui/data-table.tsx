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
          <thead className="bg-surface-soft/70 text-muted">
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)} className="px-4 py-3 font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={index} className="border-t border-hairline align-top">
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-4 text-body">
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
