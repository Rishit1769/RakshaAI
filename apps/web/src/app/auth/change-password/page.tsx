'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MarketingNav from '@/components/layout/MarketingNav';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { authApi } from '@/lib/api/auth.api';
import { getPostLoginRoute } from '@/lib/auth-routing';
import { ApiError } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, accessToken, isAuthenticated, isHydrated, setAuth } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !user) {
      router.replace('/auth/login');
      return;
    }

    if (!user.mustChangePassword) {
      router.replace(getPostLoginRoute(user) as never);
    }
  }, [isAuthenticated, isHydrated, router, user]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please complete all password fields.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation must match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.changePassword({ currentPassword, newPassword, confirmPassword });
      if (!response.success) {
        setError(response.message || 'Unable to change password.');
        return;
      }

      if (user) {
        setAuth({ ...user, mustChangePassword: false }, accessToken ?? '');
      }

      router.push((user ? getPostLoginRoute({ ...user, mustChangePassword: false }) : '/dashboard') as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to change password right now.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <MarketingNav />
      <section className="page-container grid gap-8 py-10 lg:grid-cols-[0.9fr_0.8fr] lg:py-16">
        <div className="surface-panel p-8 lg:p-12">
          <span className="eyebrow">Security checkpoint</span>
          <h1 className="display-section mt-6">Set a password only you know.</h1>
          <p className="mt-4 text-lg leading-8 text-body">
            This account was created for you by an administrator. Change the temporary password before using the rest of the workspace.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="product-card space-y-4 p-8 lg:p-10">
          {error ? (
            <div role="alert" className="rounded-xl border border-emergency/30 bg-emergency/10 p-3 text-sm text-emergency">
              {error}
            </div>
          ) : null}

          <FloatingLabelInput label="Temporary Password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={loading} />
          <FloatingLabelInput label="New Password" type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={loading} />
          <FloatingLabelInput label="Confirm New Password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={loading} />

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? 'Updating password...' : 'Change password'}
          </button>
        </form>
      </section>
    </main>
  );
}
