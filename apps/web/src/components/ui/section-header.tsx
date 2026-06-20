import { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { SectionBadge } from './section-badge';

export function SectionHeader({
  badge,
  title,
  description,
  align = 'left',
  className,
}: {
  badge?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div className={cn('space-y-5', align === 'center' && 'mx-auto text-center', className)}>
      {badge ? <SectionBadge label={badge} className={align === 'center' ? 'mx-auto' : undefined} /> : null}
      <div className="space-y-3">
        <div className="display-section">{title}</div>
        {description ? <div className="max-w-3xl text-base leading-8 text-body md:text-lg">{description}</div> : null}
      </div>
    </div>
  );
}
