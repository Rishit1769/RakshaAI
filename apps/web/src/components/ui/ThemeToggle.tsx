'use client';

import { ThemeToggle as BaseThemeToggle } from '@/components/ThemeToggle';

interface ThemeToggleProps {
  size?: 'sm' | 'md';
  className?: string;
}

export default function ThemeToggle({ size = 'md', className = '' }: ThemeToggleProps) {
  const sizeClass = size === 'sm' ? 'scale-90' : '';

  return (
    <div className={[sizeClass, className].join(' ').trim()}>
      <BaseThemeToggle />
    </div>
  );
}
