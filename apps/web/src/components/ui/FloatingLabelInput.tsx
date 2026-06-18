'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';
import { cn } from '@/lib/cn';

interface FloatingLabelInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> {
  label: string;
  error?: string;
  rightElement?: React.ReactNode;
}

const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, error, rightElement, className = '', id, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    const hasValue = !!props.value || !!props.defaultValue;
    const floated = focused || hasValue;

    return (
      <div className="relative w-full">
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            aria-label={label}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : undefined}
            onFocus={(e) => {
              setFocused(true);
              props.onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              props.onBlur?.(e);
            }}
            className={cn(
              'peer input-field rounded-2xl pt-6 pb-2 placeholder-transparent',
              rightElement && 'pr-12',
              error && 'border-emergency focus:border-emergency focus:ring-emergency/10',
              className
            )}
            placeholder={label}
            {...props}
          />

          <label
            htmlFor={inputId}
            className={cn(
              'pointer-events-none absolute left-4 select-none transition-all duration-200',
              floated ? 'top-1.5 text-[10px]' : 'top-4 text-sm',
            )}
            style={{ color: floated ? 'var(--color-primary)' : 'var(--color-muted)' }}
          >
            {label}
          </label>

          {rightElement ? <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-muted)]">{rightElement}</div> : null}
        </div>

        {error ? (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-[var(--color-emergency)]">
            <svg className="h-3 w-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        ) : null}
      </div>
    );
  }
);

FloatingLabelInput.displayName = 'FloatingLabelInput';
export default FloatingLabelInput;
