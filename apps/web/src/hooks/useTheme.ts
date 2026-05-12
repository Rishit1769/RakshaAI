'use client';

import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'rakshaai-theme';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light');

  // Initialize from localStorage / system preference on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme =
      stored ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    applyTheme(initial);
    setTheme(initial);
  }, []);

  function applyTheme(t: Theme) {
    document.documentElement.classList.toggle('dark', t === 'dark');
  }

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem(STORAGE_KEY, next);
      applyTheme(next);
      return next;
    });
  }

  return { theme, toggle, isDark: theme === 'dark' };
}
