'use client';

import { useState } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api').replace(/\/+$/, '');

export default function DownloadAppButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [toast, setToast] = useState('');

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
        className="fixed bottom-6 right-6 z-50 inline-flex items-center justify-center rounded-full border border-white/10 bg-navy px-5 py-3 text-sm font-semibold text-white shadow-2xl transition hover:bg-navy/90 hover:shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? 'Preparing download...' : 'Download Mobile App'}
      </button>

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 right-6 z-50 max-w-xs rounded-2xl border border-emergency/20 bg-white px-4 py-3 text-sm text-navy shadow-soft dark:border-white/10 dark:bg-[#111827] dark:text-white"
        >
          {toast}
        </div>
      ) : null}
    </>
  );
}
