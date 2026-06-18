import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-60',
  {
    variants: {
      variant: {
        primary: 'bg-[image:var(--gradient-accent)] text-white shadow-soft hover:-translate-y-0.5 hover:shadow-accent-lg hover:brightness-110',
        secondary: 'border border-border bg-white/90 text-foreground shadow-soft hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-card',
        ghost: 'bg-transparent text-muted hover:bg-primary/5 hover:text-foreground',
        danger: 'bg-emergency text-white shadow-[var(--shadow-emergency)] hover:-translate-y-0.5 hover:brightness-105',
      },
      size: {
        sm: 'min-h-10 rounded-lg px-4 py-2 text-sm',
        md: 'min-h-12 px-5 py-3',
        lg: 'min-h-14 rounded-2xl px-6 py-3.5 text-base',
        icon: 'h-10 min-h-0 w-10 rounded-full p-0',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, fullWidth, type = 'button', ...props }, ref) => (
    <button ref={ref} type={type} className={cn(buttonVariants({ variant, size, fullWidth }), className)} {...props} />
  )
);

Button.displayName = 'Button';

export { buttonVariants };
