import * as React from 'react';
import { cn } from '@/lib/cn';

type BaseProps = {
  label?: string;
  hint?: string;
  error?: string;
  className?: string;
};

export function FieldShell({
  label,
  hint,
  error,
  className,
  children,
}: BaseProps & { children: React.ReactNode }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label ? <label className="block text-sm font-medium text-ink">{label}</label> : null}
      {children}
      {error ? <p className="text-xs text-emergency">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => <input ref={ref} className={cn('input-field', className)} {...props} />
);

Input.displayName = 'Input';

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => <textarea ref={ref} className={cn('textarea-field', className)} {...props} />
);

Textarea.displayName = 'Textarea';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => <select ref={ref} className={cn('select-field', className)} {...props} />
);

Select.displayName = 'Select';
