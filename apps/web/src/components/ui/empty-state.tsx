import { ReactNode } from 'react';
import { Card } from './card';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card className="border-dashed border-primary/20 bg-primary/5 text-center shadow-soft">
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-7 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </Card>
  );
}
