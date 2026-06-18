import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const cardVariants = cva(
  'rounded-[var(--radius-xl)] border border-border bg-white/92 text-body shadow-card backdrop-blur-md',
  {
    variants: {
      variant: {
        default: '',
        elevated: 'shadow-panel',
        featured: 'relative overflow-hidden border-transparent bg-white',
        inverted: 'inverted-section border-white/10 text-white shadow-panel',
      },
      padding: {
        none: 'p-0',
        sm: 'p-5',
        md: 'p-6 md:p-7',
        lg: 'p-8 md:p-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export function Card({ className, variant, padding, children, ...props }: CardProps) {
  if (variant === 'featured') {
    return (
      <div className={cn('rounded-[calc(var(--radius-xl)+2px)] bg-[image:var(--gradient-accent)] p-[1px] shadow-accent', className)} {...props}>
        <div className={cn(cardVariants({ padding, variant: 'default' }), 'h-full w-full rounded-[var(--radius-xl)]')}>
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(cardVariants({ variant, padding }), className)} {...props}>
      {children}
    </div>
  );
}
