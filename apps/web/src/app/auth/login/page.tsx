'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { FilterPills } from '@/components/ui/filter-pills';
import { authApi } from '@/lib/api/auth.api';
import { getPostLoginRoute } from '@/lib/auth-routing';
import { ApiError } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';

type LoginMethod = 'password' | 'mpin';

const benefits = [
  'Move from alert to active response without changing tools.',
  'Review community signals and live map layers from the same account.',
  'Keep faster sign-in available with password or MPIN.',
];

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, rememberIdentifier } = useAuthStore();
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('password');
  const [identifier, setIdentifier] = useState('');
  const [credential, setCredential] = useState('');
  const [showCredential, setShowCredential] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const normalizedIdentifier = identifier.trim();
    const normalizedCredential = loginMethod === 'mpin' ? credential.replace(/\D/g, '') : credential;

    if (!normalizedIdentifier || !normalizedCredential) {
      setError(loginMethod === 'password' ? 'Please enter your email or phone and password.' : 'Please enter your email or phone and 6-digit MPIN.');
      return;
    }

    if (loginMethod === 'mpin' && !/^\d{6}$/.test(normalizedCredential)) {
      setError('MPIN must be exactly 6 digits.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authApi.login({
        identifier: normalizedIdentifier,
        credential: normalizedCredential,
        loginMethod,
      });

      if (!response.success || !response.data) {
        setError(response.message || 'Login failed. Please check your credentials.');
        return;
      }

      rememberIdentifier(normalizedIdentifier);
      setAuth(response.data.user, response.data.accessToken);
      router.push(getPostLoginRoute(response.data.user) as never);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || 'Login failed. Please check your credentials.');
      } else if (err instanceof TypeError) {
        setError('Unable to reach the server. Please check your connection.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthSplitLayout
      badge="Secure access portal"
      title={
        <>
          Sign in to your <span className="gradient-text">RakshaAI workspace</span>.
        </>
      }
      description="Return to your dashboard, safety routes, responder tools, and live community intelligence without changing products or mental context."
      highlights={benefits}
      formTitle="Account access"
      formDescription="Use your password or the 6-digit MPIN attached to your profile."
      footer={
        <p className="text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="font-semibold text-ink">
            Create one
          </Link>
        </p>
      }
    >
      <FilterPills
        className="mb-6"
        options={[
          { label: 'Password', value: 'password' },
          { label: 'MPIN', value: 'mpin' },
        ]}
        selectedValue={loginMethod}
        onChange={(value) => {
          setLoginMethod(value as LoginMethod);
          setCredential('');
          setError('');
        }}
      />

      {error ? (
        <div role="alert" className="mb-5 rounded-2xl border border-emergency/20 bg-emergency/10 p-4">
          <p className="text-sm text-emergency">{error}</p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <FloatingLabelInput
          label="Email or Phone"
          type="text"
          value={identifier}
          onChange={(event) => {
            setIdentifier(event.target.value);
            setError('');
          }}
          autoComplete="username"
          disabled={loading}
        />

        <FloatingLabelInput
          label={loginMethod === 'password' ? 'Password' : '6-digit MPIN'}
          type={showCredential ? 'text' : 'password'}
          value={credential}
          onChange={(event) => {
            setCredential(loginMethod === 'mpin' ? event.target.value.replace(/\D/g, '') : event.target.value);
            setError('');
          }}
          autoComplete={loginMethod === 'password' ? 'current-password' : 'one-time-code'}
          inputMode={loginMethod === 'mpin' ? 'numeric' : undefined}
          maxLength={loginMethod === 'mpin' ? 6 : undefined}
          disabled={loading}
          className={loginMethod === 'mpin' ? 'tracking-[0.35em]' : ''}
          rightElement={
            <button type="button" onClick={() => setShowCredential((value) => !value)} className="transition-colors hover:text-ink" aria-label={showCredential ? 'Hide credential' : 'Show credential'}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </button>
          }
        />

        {loginMethod === 'mpin' ? <p className="text-sm text-muted">Use the 6-digit MPIN you set up for faster access.</p> : null}

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? 'Signing in...' : loginMethod === 'password' ? 'Sign in' : 'Sign in with MPIN'}
        </button>
      </form>
    </AuthSplitLayout>
  );
}
