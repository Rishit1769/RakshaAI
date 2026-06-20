'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(/\/+$/, '');

export default function DownloadAppButton() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState('');

  if (pathname === '/sos' || pathname.startsWith('/dashboard/sos-active')) {
    return null;
  }

  async function handleDownload() {
    setIsLoading(true);
    setToast('');

    try {
      const response = await fetch(`${API_BASE}/app/download`, {
        method: 'GET',
        credentials: 'include',
      });

      const payload = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !payload.url) {
        throw new Error(payload.error ?? 'App download is currently unavailable. Please try again later.');
      }

      const link = document.createElement('a');
      link.href = payload.url;
      link.download = 'RakshaAI.apk';
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      setToast('App download is currently unavailable. Please try again later.');
      window.setTimeout(() => setToast(''), 4000);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleDownload}
        disabled={isLoading}
        className="fixed bottom-5 right-5 z-50 inline-flex min-h-11 items-center justify-center rounded-full border border-border/80 bg-white/92 px-5 py-3 text-sm font-semibold text-ink shadow-card backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-accent"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-card)', color: 'var(--color-ink)' }}
      >
        {isLoading ? 'Preparing download...' : 'Download Mobile App'}
      </button>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border border-border/80 bg-white/92 px-4 py-3 text-sm text-ink shadow-card backdrop-blur-md"
          style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-card)', color: 'var(--color-ink)' }}
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
