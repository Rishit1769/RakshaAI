'use client';

import { useEffect, useState } from 'react';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { useProtectedRoute } from '@/hooks/useProtectedRoute';
import { authApi, type AuthUser } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/fetcher';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/card';
import { SectionBadge } from '@/components/ui/section-badge';
import { getPostLoginRoute } from '@/lib/auth-routing';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';

type MpinMode = 'setup' | 'change' | 'disable' | null;

const weakMpins = new Set(['000000', '111111', '123456', '654321']);

function validateNewMpin(value: string) {
  if (!/^\d{6}$/.test(value)) return 'MPIN must be exactly 6 digits.';
  if (weakMpins.has(value)) return 'MPIN is too simple. Please choose a less predictable combination.';
  return '';
}

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated, isAuthReady } = useProtectedRoute();
  const { user, accessToken, clearAuth, setAuth } = useAuthStore();
  const [me, setMe] = useState<AuthUser | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [actionMode, setActionMode] = useState<MpinMode>(null);
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [profileDraft, setProfileDraft] = useState({
    fullName: '',
    email: '',
  });
  const [form, setForm] = useState({
    mpin: '',
    confirmMpin: '',
    currentMpin: '',
    newMpin: '',
    newConfirmMpin: '',
    disableCurrentMpin: '',
  });

  useEffect(() => {
    if (!isAuthReady || !isAuthenticated) return;
    void (async () => {
      try {
        const response = await authApi.getMe();
        if (response.success && response.data) {
          setMe(response.data);
          setProfileDraft({ fullName: response.data.fullName, email: response.data.email });
        }
      } catch {
        setFormError('Unable to load account settings right now.');
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [isAuthReady, isAuthenticated]);

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

  async function handlePasswordSubmit() {
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
      setFormError('Please complete all password fields.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setFormError('New password and confirmation must match.');
      return;
    }

    setSubmitting(true);
    setFormError('');
    try {
      await authApi.changePassword(passwordForm);
      if (user) {
        setAuth({ ...user, mustChangePassword: false }, accessToken ?? '');
      }
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setSuccessMessage('Password updated successfully.');
      if (user?.mustChangePassword) {
        router.push(getPostLoginRoute({ ...user, mustChangePassword: false }) as never);
      }
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to update password right now.'));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Ignore server-side logout failures and still clear local state.
    } finally {
      clearAuth();
      router.push('/auth/login');
    }
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

  if (!isAuthReady) return <div className="min-h-screen bg-background px-6 py-20 text-sm text-muted">Checking session...</div>;
  if (!isAuthenticated) return null;

  return (
    <AppShell title="Settings" subtitle="Profile summary, password controls, MPIN access, and logout in one place." backLabel="Dashboard">
      <div className="space-y-6">
        {successMessage ? <div className="rounded-2xl border border-safe/20 bg-safe/10 p-3 text-sm text-safe-dark">{successMessage}</div> : null}
        {formError ? <div className="rounded-2xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">{formError}</div> : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="surface-panel-modern">
            <SectionBadge label="Profile" />
            <div className="mt-5 space-y-4">
              <FloatingLabelInput label="Name" type="text" value={profileDraft.fullName} onChange={(event) => setProfileDraft((current) => ({ ...current, fullName: event.target.value }))} />
              <FloatingLabelInput label="Email" type="email" value={profileDraft.email} disabled />
              <p className="text-sm leading-7 text-muted">
                The current API exposes profile retrieval and password updates, but not a saved profile-edit endpoint yet. Name is shown here for continuity and future wiring.
              </p>
              {loadingProfile ? <p className="text-sm text-muted">Loading profile...</p> : null}
            </div>
          </Card>

          <Card className="surface-panel-modern">
            <SectionBadge label="Password" pulse={Boolean(user?.mustChangePassword)} />
            <div className="mt-5 space-y-4">
              {user?.mustChangePassword ? (
                <p className="rounded-2xl border border-primary/15 bg-primary/[0.05] p-4 text-sm leading-7 text-body">
                  This account was created by an administrator. Update the temporary password here before moving anywhere else in the dashboard.
                </p>
              ) : null}
              <FloatingLabelInput label="Current Password" type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} />
              <FloatingLabelInput label="New Password" type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} />
              <FloatingLabelInput label="Confirm New Password" type="password" value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
              <button type="button" className="btn-primary w-full" onClick={() => void handlePasswordSubmit()} disabled={submitting}>
                {submitting ? 'Updating password...' : 'Update password'}
              </button>
            </div>
          </Card>
        </div>

        <Card>
          <div className="flex items-start justify-between gap-4">
            <div>
              <SectionBadge label="MPIN settings" />
              <h2 className="mt-4 text-lg font-semibold text-ink">Use a private 6-digit MPIN as an alternative sign-in method.</h2>
            </div>
            <span className={me?.mpinEnabled ? 'badge-safe' : 'eyebrow'}>{me?.mpinEnabled ? 'Enabled' : 'Disabled'}</span>
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
        </Card>

        {actionMode ? (
          <Card>
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-ink">{actionMode === 'setup' ? 'Set Up MPIN' : actionMode === 'change' ? 'Change MPIN' : 'Disable MPIN'}</h3>
              <button type="button" onClick={closeMode} className="text-sm text-muted">Cancel</button>
            </div>
            <div className="mt-5 space-y-4">
              {actionMode === 'setup' ? (
                <>
                  <FloatingLabelInput label="Enter 6-digit MPIN" type="password" inputMode="numeric" maxLength={6} value={form.mpin} onChange={(event) => setForm((prev) => ({ ...prev, mpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="Confirm MPIN" type="password" inputMode="numeric" maxLength={6} value={form.confirmMpin} onChange={(event) => setForm((prev) => ({ ...prev, confirmMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={() => void handleSetup()} disabled={submitting} className="btn-primary">{submitting ? 'Saving...' : 'Save MPIN'}</button>
                </>
              ) : null}
              {actionMode === 'change' ? (
                <>
                  <FloatingLabelInput label="Current MPIN" type="password" inputMode="numeric" maxLength={6} value={form.currentMpin} onChange={(event) => setForm((prev) => ({ ...prev, currentMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="New MPIN" type="password" inputMode="numeric" maxLength={6} value={form.newMpin} onChange={(event) => setForm((prev) => ({ ...prev, newMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <FloatingLabelInput label="Confirm New MPIN" type="password" inputMode="numeric" maxLength={6} value={form.newConfirmMpin} onChange={(event) => setForm((prev) => ({ ...prev, newConfirmMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={() => void handleChange()} disabled={submitting} className="btn-primary">{submitting ? 'Updating...' : 'Update MPIN'}</button>
                </>
              ) : null}
              {actionMode === 'disable' ? (
                <>
                  <p className="text-sm text-muted">Confirm your current MPIN before disabling MPIN login for this account.</p>
                  <FloatingLabelInput label="Current MPIN" type="password" inputMode="numeric" maxLength={6} value={form.disableCurrentMpin} onChange={(event) => setForm((prev) => ({ ...prev, disableCurrentMpin: event.target.value.replace(/\D/g, '') }))} disabled={submitting} />
                  <button type="button" onClick={() => void handleDisable()} disabled={submitting} className="btn-secondary">{submitting ? 'Disabling...' : 'Disable MPIN'}</button>
                </>
              ) : null}
            </div>
          </Card>
        ) : null}

        <Card className="surface-panel-modern">
          <SectionBadge label="Session control" />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <p className="max-w-2xl text-sm leading-7 text-muted">Sign out from the current web session. This calls the existing logout endpoint, clears local auth state, and returns you to the login screen.</p>
            <button type="button" className="btn-secondary" onClick={() => void handleLogout()}>
              Logout
            </button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
