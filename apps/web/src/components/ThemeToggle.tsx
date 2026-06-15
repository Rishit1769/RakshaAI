'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem('raksha-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const current = (saved as 'light' | 'dark' | null) || (prefersDark ? 'dark' : 'light');
    setTheme(current);
  }, [setTheme]);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('raksha-theme', next);
  };

  if (!mounted) return null;

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
      className="flex h-9 w-9 items-center justify-center rounded-full"
      type="button"
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
