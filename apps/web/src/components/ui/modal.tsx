'use client';

import type { ReactNode } from 'react';

export function Modal({
  open,
  title,
  description,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm">
      <div className="surface-panel-modern w-full max-w-xl rounded-[1.75rem] p-6 shadow-panel">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-7 text-muted">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="btn-secondary min-h-10 px-3 py-2">
            Close
          </button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
