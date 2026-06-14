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
        className="fixed bottom-5 right-5 z-50 inline-flex items-center justify-center rounded-full border border-hairline bg-canvas px-5 py-3 text-sm font-semibold text-ink shadow-card transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-70 dark:border-white/10 dark:bg-[#14171d] dark:text-white dark:hover:bg-[#1a1d24]"
      >
        {isLoading ? 'Preparing download...' : 'Download Mobile App'}
      </button>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-6 z-50 max-w-xs rounded-xl border border-hairline bg-canvas px-4 py-3 text-sm text-ink shadow-card dark:border-white/10 dark:bg-[#14171d] dark:text-white"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
