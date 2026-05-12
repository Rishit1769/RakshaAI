'use client';

import { useTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  /** Size variant. Defaults to 'md'. */
  size?: 'sm' | 'md';
  /** Extra className on the button wrapper */
  className?: string;
}

export default function ThemeToggle({ size = 'md', className = '' }: ThemeToggleProps) {
  const { isDark, toggle } = useTheme();

  const dim = size === 'sm' ? 'w-8 h-8' : 'w-9 h-9';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]';

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className={[
        dim,
        'inline-flex items-center justify-center rounded-xl transition-colors duration-200',
        isDark
          ? 'bg-white/10 text-yellow-300 hover:bg-white/20'
          : 'bg-navy/8 text-navy hover:bg-navy/15',
        className,
      ].join(' ')}
    >
      {isDark ? (
        /* Sun icon */
        <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
        </svg>
      ) : (
        /* Moon icon */
        <svg className={iconSize} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}
