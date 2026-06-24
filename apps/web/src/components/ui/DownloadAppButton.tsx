'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function DownloadAppButton() {
  const pathname = usePathname();
  const [version, setVersion] = useState<string | null>(null);

  if (pathname === '/sos' || pathname.startsWith('/dashboard/sos-active')) {
    return null;
  }

  useEffect(() => {
    fetch('/downloads/version.json')
      .then((response) => response.json() as Promise<{ version?: string }>)
      .then((data) => {
        if (data.version) {
          setVersion(data.version);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <a
      href="/downloads/raksha-ai.apk"
      download="RakshaAI.apk"
      className="fixed bottom-4 right-4 z-50 flex min-h-11 items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-medium text-white shadow-lg transition-colors hover:bg-gray-800"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.523 15.341a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0zM7 2l1.5 2.5M17 2l-1.5 2.5M3 7h18v2H3z" />
      </svg>
      <span className="flex flex-col leading-none">
        <span>
          Download App {version && <span className="opacity-60">v{version}</span>}
        </span>
        <span className="block text-xs opacity-50">Android only</span>
      </span>
    </a>
  );
}
