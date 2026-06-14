'use client';

import { InputHTMLAttributes, forwardRef, useState } from 'react';

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
            className={[
              'peer w-full rounded-md border bg-canvas px-4 pb-2 pt-6 text-sm text-ink dark:bg-[#14171d] dark:text-white',
              'placeholder-transparent outline-none transition-all duration-200',
              'focus:border-ink focus:ring-0',
              error
                ? 'border-emergency focus:border-emergency'
                : 'border-hairline hover:border-ink/30 dark:border-white/10 dark:hover:border-white/30',
              rightElement ? 'pr-12' : '',
              className,
            ].join(' ')}
            placeholder={label}
            {...props}
          />

          <label
            htmlFor={inputId}
            className={[
              'pointer-events-none absolute left-4 select-none transition-all duration-200',
              'peer-placeholder-shown:top-4 peer-placeholder-shown:text-sm peer-placeholder-shown:text-muted dark:peer-placeholder-shown:text-white/35',
              'peer-focus:top-1.5 peer-focus:text-[10px] peer-focus:text-ink dark:peer-focus:text-white',
              floated && !focused ? 'top-1.5 text-[10px] text-muted dark:text-white/40' : '',
              !floated ? 'top-4 text-sm text-muted dark:text-white/35' : '',
            ].join(' ')}
          >
            {label}
          </label>

          {rightElement ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted dark:text-white/40">
              {rightElement}
            </div>
          ) : null}
        </div>

        {error ? (
          <p id={`${inputId}-error`} role="alert" className="mt-1.5 flex items-center gap-1 text-xs text-emergency">
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
