'use client';

import { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { SectionBadge } from '@/components/ui/section-badge';
import { adminApi } from '@/lib/api/admin.api';
import { ApiError } from '@/lib/api/fetcher';
import { useRoleGuard } from '@/hooks/useRoleGuard';

type ModerationItem = {
  id: string;
  type: 'incident' | 'comment';
  contentPreview: string;
  reporterCount: number;
  flaggedReason: string;
  author: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  };
  createdAt: string;
};

export default function SuperadminModerationPage() {
  const { isAuthReady, isAllowed } = useRoleGuard('SUPERADMIN');
  const [items, setItems] = useState<ModerationItem[]>([]);
  const [error, setError] = useState('');
  const [confirmAction, setConfirmAction] = useState<{ mode: 'remove' | 'ban'; item: ModerationItem } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function loadQueue() {
    try {
      const response = await adminApi.getModerationQueue();
      setItems((((response.data ?? {}) as { items?: ModerationItem[] }).items) ?? []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load moderation queue.');
    }
  }

  useEffect(() => {
    if (!isAllowed) return;
    void loadQueue();
  }, [isAllowed]);

  async function handleDismiss(item: ModerationItem) {
    setBusyId(item.id);
    setError('');
    try {
      await adminApi.dismissModerationItem(item.id, item.type);
      await loadQueue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to dismiss moderation item.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmedAction() {
    if (!confirmAction) return;
    setBusyId(confirmAction.item.id);
    setError('');
    try {
      if (confirmAction.mode === 'remove') {
        if (confirmAction.item.type === 'incident') {
          await adminApi.deleteModerationIncident(confirmAction.item.id);
        } else {
          await adminApi.deleteModerationComment(confirmAction.item.id);
        }
      } else {
        await adminApi.banModerationUser(confirmAction.item.author.id);
      }
      setConfirmAction(null);
      await loadQueue();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to complete moderation action.');
    } finally {
      setBusyId(null);
    }
  }

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAllowed) return null;

  return (
    <AppShell title="Moderation Queue" subtitle="Review risky reports and linked comments, then dismiss, remove, or ban with audit coverage." showBack={false}>
      <div className="space-y-6">
        {error ? <div className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{error}</div> : null}

        <Card padding="lg" className="surface-panel-modern">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <SectionBadge label="Queue pressure" pulse />
              <h2 className="mt-5 text-xl font-semibold text-ink">{items.length} pending moderation items</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted">This queue is derived from the current report and comment schema: unverified or escalated reports, plus comments attached to those risky reports.</p>
          </div>
        </Card>

        <div className="space-y-4">
          {items.map((item) => (
            <Card key={`${item.type}-${item.id}`} padding="lg" className="surface-panel-modern">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={item.type === 'incident' ? 'badge-warning' : 'eyebrow'}>{item.type}</span>
                    <span className="text-xs text-muted">{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="mt-4 text-base font-semibold leading-7 text-ink">{item.contentPreview}</p>
                  <p className="mt-2 text-sm text-muted">{item.flaggedReason}</p>
                  <p className="mt-4 text-sm text-body">
                    Author: <span className="font-semibold text-ink">{item.author.name}</span> ({item.author.email || 'No email'})
                  </p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="rounded-full border border-border/80 bg-white/90 px-4 py-2 text-sm font-semibold text-ink shadow-soft">
                    Reports: {item.reporterCount}
                  </div>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className="btn-secondary" disabled={busyId === item.id} onClick={() => void handleDismiss(item)}>
                      Dismiss
                    </button>
                    <button type="button" className="btn-primary" disabled={busyId === item.id} onClick={() => setConfirmAction({ mode: 'remove', item })}>
                      Remove content
                    </button>
                    <button type="button" className="btn-secondary" disabled={busyId === item.id} onClick={() => setConfirmAction({ mode: 'ban', item })}>
                      Ban author
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Modal
        open={Boolean(confirmAction)}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.mode === 'ban' ? 'Ban author' : 'Remove content'}
        description={confirmAction?.mode === 'ban' ? 'This will suspend the author account and block login through the existing active-account gate.' : 'This removes the selected content and records the action in the audit log.'}
      >
        <div className="space-y-4">
          <p className="text-sm text-body">{confirmAction?.item.contentPreview}</p>
          <div className="flex gap-3">
            <button type="button" className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
            <button type="button" className="btn-primary" onClick={() => void handleConfirmedAction()} disabled={!confirmAction}>
              Confirm
            </button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
