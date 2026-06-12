'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { authApi, type AuthUser } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';

type MpinMode = 'setup' | 'change' | 'disable' | null;

const weakMpins = new Set(['000000', '111111', '123456', '654321']);

function validateNewMpin(value: string) {
  if (!/^\d{6}$/.test(value)) return 'MPIN must be exactly 6 digits.';
  if (weakMpins.has(value)) return 'MPIN is too simple. Please choose a less predictable combination.';
  return '';
}

export default function SettingsPage() {
  const router = useRouter();
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
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

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
  }, [isAuthenticated, router]);

  function resetForms() {
    setForm({
      mpin: '',
      confirmMpin: '',
      currentMpin: '',
      newMpin: '',
      newConfirmMpin: '',
      disableCurrentMpin: '',
    });
    setFormError('');
    setSuccessMessage('');
  }

  function openMode(mode: MpinMode) {
    resetForms();
    setActionMode(mode);
  }

  function closeMode() {
    setActionMode(null);
    setForm({
      mpin: '',
      confirmMpin: '',
      currentMpin: '',
      newMpin: '',
      newConfirmMpin: '',
      disableCurrentMpin: '',
    });
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
      await authApi.changeMpin({
        currentMpin: form.currentMpin,
        newMpin: form.newMpin,
        confirmMpin: form.newConfirmMpin,
      });
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
    <main className="min-h-screen bg-light px-4 py-8 dark:bg-[#0B1026]">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-navy/55 transition-colors hover:text-navy dark:text-white/45 dark:hover:text-white/70">Back to dashboard</Link>
            <h1 className="mt-2 text-2xl font-bold text-navy dark:text-white">Account Settings</h1>
            <p className="mt-1 text-sm text-navy/60 dark:text-white/40">Manage your faster sign-in options and account security.</p>
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">{successMessage}</div>
        ) : null}

        <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-navy dark:text-white">MPIN Settings</h2>
              <p className="mt-1 text-sm text-navy/60 dark:text-white/40">Use a private 6-digit MPIN as an alternative sign-in method.</p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${me?.mpinEnabled ? 'bg-green-500/10 text-green-700 dark:text-green-300' : 'bg-navy/10 text-navy/60 dark:bg-white/10 dark:text-white/45'}`}>
              {me?.mpinEnabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          {loadingProfile ? (
            <p className="mt-4 text-sm text-navy/55 dark:text-white/40">Loading settings...</p>
          ) : (
            <div className="mt-6 flex flex-wrap gap-3">
              {!me?.mpinEnabled ? (
                <button type="button" onClick={() => openMode('setup')} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
                  Set Up MPIN
                </button>
              ) : (
                <>
                  <button type="button" onClick={() => openMode('change')} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
                    Change MPIN
                  </button>
                  <button type="button" onClick={() => openMode('disable')} className="rounded-xl border border-emergency/30 px-4 py-2.5 text-sm font-semibold text-emergency transition-colors hover:bg-emergency/10">
                    Disable MPIN
                  </button>
                </>
              )}
            </div>
          )}
        </section>

        {actionMode ? (
          <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-soft dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-navy dark:text-white">
                {actionMode === 'setup' ? 'Set Up MPIN' : actionMode === 'change' ? 'Change MPIN' : 'Disable MPIN'}
              </h3>
              <button type="button" onClick={closeMode} className="text-sm text-navy/55 transition-colors hover:text-navy dark:text-white/45 dark:hover:text-white/70">Cancel</button>
            </div>

            {formError ? (
              <div className="mt-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{formError}</div>
            ) : null}

            <div className="mt-5 space-y-4">
              {actionMode === 'setup' ? (
                <>
                  <FloatingLabelInput label="Enter 6-digit MPIN" type="password" inputMode="numeric" maxLength={6} value={form.mpin} onChange={(event) => setForm((prev) => ({ ...prev, mpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="Confirm MPIN" type="password" inputMode="numeric" maxLength={6} value={form.confirmMpin} onChange={(event) => setForm((prev) => ({ ...prev, confirmMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={handleSetup} disabled={submitting} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60">
                    {submitting ? 'Saving...' : 'Save MPIN'}
                  </button>
                </>
              ) : null}

              {actionMode === 'change' ? (
                <>
                  <FloatingLabelInput label="Current MPIN" type="password" inputMode="numeric" maxLength={6} value={form.currentMpin} onChange={(event) => setForm((prev) => ({ ...prev, currentMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="New MPIN" type="password" inputMode="numeric" maxLength={6} value={form.newMpin} onChange={(event) => setForm((prev) => ({ ...prev, newMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="Confirm New MPIN" type="password" inputMode="numeric" maxLength={6} value={form.newConfirmMpin} onChange={(event) => setForm((prev) => ({ ...prev, newConfirmMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={handleChange} disabled={submitting} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-60">
                    {submitting ? 'Updating...' : 'Update MPIN'}
                  </button>
                </>
              ) : null}

              {actionMode === 'disable' ? (
                <>
                  <p className="text-sm text-navy/60 dark:text-white/40">Confirm your current MPIN before disabling MPIN login for this account.</p>
                  <FloatingLabelInput label="Current MPIN" type="password" inputMode="numeric" maxLength={6} value={form.disableCurrentMpin} onChange={(event) => setForm((prev) => ({ ...prev, disableCurrentMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={handleDisable} disabled={submitting} className="rounded-xl border border-emergency/30 px-4 py-2.5 text-sm font-semibold text-emergency transition-colors hover:bg-emergency/10 disabled:opacity-60">
                    {submitting ? 'Disabling...' : 'Disable MPIN'}
                  </button>
                </>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
