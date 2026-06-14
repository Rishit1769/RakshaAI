'use client';

import { useEffect, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { authApi, type AuthUser } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';
import { AppShell } from '@/components/layout/AppShell';

type MpinMode = 'setup' | 'change' | 'disable' | null;

const weakMpins = new Set(['000000', '111111', '123456', '654321']);

function validateNewMpin(value: string) {
  if (!/^\d{6}$/.test(value)) return 'MPIN must be exactly 6 digits.';
  if (weakMpins.has(value)) return 'MPIN is too simple. Please choose a less predictable combination.';
  return '';
}

export default function SettingsPage() {
  const { isAuthenticated } = useAuthStore();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [actionMode, setActionMode] = useState<MpinMode>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    mpin: '',
    confirmMpin: '',
    currentMpin: '',
    newMpin: '',
    newConfirmMpin: '',
    disableCurrentMpin: '',
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    void (async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) setMe(response.data);
      } catch {
        setFormError('Unable to load account settings right now.');
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [isAuthenticated]);

  function resetForms() {
    setForm({ mpin: '', confirmMpin: '', currentMpin: '', newMpin: '', newConfirmMpin: '', disableCurrentMpin: '' });
    setFormError('');
    setSuccessMessage('');
  }

  function openMode(mode: MpinMode) {
    resetForms();
    setActionMode(mode);
  }

  function closeMode() {
    setActionMode(null);
    setForm({ mpin: '', confirmMpin: '', currentMpin: '', newMpin: '', newConfirmMpin: '', disableCurrentMpin: '' });
    setFormError('');
  }

  function parseApiError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.message || fallback;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  async function handleSetup() {
    const mpinError = validateNewMpin(form.mpin);
    if (mpinError) {
      setFormError(mpinError);
      return;
    }
    if (form.mpin !== form.confirmMpin) {
      setFormError('MPINs do not match.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await authApi.setupMpin({ mpin: form.mpin, confirmMpin: form.confirmMpin });
      setMe((prev) => (prev ? { ...prev, mpinEnabled: true } : prev));
      setSuccessMessage('MPIN enabled successfully.');
      closeMode();
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to set up MPIN right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleChange() {
    if (!/^\d{6}$/.test(form.currentMpin)) {
      setFormError('Current MPIN must be exactly 6 digits.');
      return;
    }
    const mpinError = validateNewMpin(form.newMpin);
    if (mpinError) {
      setFormError(mpinError);
      return;
    }
    if (form.newMpin !== form.newConfirmMpin) {
      setFormError('MPINs do not match.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await authApi.changeMpin({ currentMpin: form.currentMpin, newMpin: form.newMpin, confirmMpin: form.newConfirmMpin });
      setSuccessMessage('MPIN changed successfully.');
      closeMode();
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to change MPIN right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisable() {
    if (!/^\d{6}$/.test(form.disableCurrentMpin)) {
      setFormError('Current MPIN must be exactly 6 digits.');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await authApi.disableMpin({ currentMpin: form.disableCurrentMpin });
      setMe((prev) => (prev ? { ...prev, mpinEnabled: false } : prev));
      setSuccessMessage('MPIN disabled successfully.');
      closeMode();
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to disable MPIN right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  if (!isAuthenticated) return null;

  return (
    <AppShell title="Account Settings" subtitle="Manage sign-in speed and account security." backLabel="Dashboard">
      <div className="space-y-6">
        {successMessage ? <div className="rounded-xl border border-safe/20 bg-safe/10 p-3 text-sm text-safe-dark">{successMessage}</div> : null}
        <section className="product-card">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">MPIN Settings</h2>
              <p className="mt-1 text-sm text-muted">Use a private 6-digit MPIN as an alternative sign-in method.</p>
            </div>
            <span className={me?.mpinEnabled ? 'badge-safe' : 'eyebrow bg-surface-soft'}>{me?.mpinEnabled ? 'Enabled' : 'Disabled'}</span>
          </div>

          {loadingProfile ? (
            <p className="mt-4 text-sm text-muted">Loading settings...</p>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              {!me?.mpinEnabled ? (
                <button type="button" onClick={() => openMode('setup')} className="btn-primary">Set Up MPIN</button>
              ) : (
                <>
                  <button type="button" onClick={() => openMode('change')} className="btn-primary">Change MPIN</button>
                  <button type="button" onClick={() => openMode('disable')} className="btn-secondary">Disable MPIN</button>
                </>
              )}
            </div>
          )}
        </section>

        {actionMode ? (
          <section className="product-card">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-ink">{actionMode === 'setup' ? 'Set Up MPIN' : actionMode === 'change' ? 'Change MPIN' : 'Disable MPIN'}</h3>
              <button type="button" onClick={closeMode} className="text-sm text-muted">Cancel</button>
            </div>
            {formError ? <div className="mt-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{formError}</div> : null}
            <div className="mt-5 space-y-4">
              {actionMode === 'setup' ? (
                <>
                  <FloatingLabelInput label="Enter 6-digit MPIN" type="password" inputMode="numeric" maxLength={6} value={form.mpin} onChange={(event) => setForm((prev) => ({ ...prev, mpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="Confirm MPIN" type="password" inputMode="numeric" maxLength={6} value={form.confirmMpin} onChange={(event) => setForm((prev) => ({ ...prev, confirmMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={handleSetup} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save MPIN'}</button>
                </>
              ) : null}
              {actionMode === 'change' ? (
                <>
                  <FloatingLabelInput label="Current MPIN" type="password" inputMode="numeric" maxLength={6} value={form.currentMpin} onChange={(event) => setForm((prev) => ({ ...prev, currentMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="New MPIN" type="password" inputMode="numeric" maxLength={6} value={form.newMpin} onChange={(event) => setForm((prev) => ({ ...prev, newMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="Confirm New MPIN" type="password" inputMode="numeric" maxLength={6} value={form.newConfirmMpin} onChange={(event) => setForm((prev) => ({ ...prev, newConfirmMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={handleChange} disabled={submitting} className="btn-primary">{submitting ? 'Updating...' : 'Update MPIN'}</button>
                </>
              ) : null}
              {actionMode === 'disable' ? (
                <>
                  <p className="text-sm text-muted">Confirm your current MPIN before disabling MPIN login for this account.</p>
                  <FloatingLabelInput label="Current MPIN" type="password" inputMode="numeric" maxLength={6} value={form.disableCurrentMpin} onChange={(event) => setForm((prev) => ({ ...prev, disableCurrentMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={handleDisable} disabled={submitting} className="btn-secondary">{submitting ? 'Disabling...' : 'Disable MPIN'}</button>
                </>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </AppShell>
  );
}
