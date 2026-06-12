'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authApi } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';

type LoginMethod = 'password' | 'mpin';

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
      console.log('[login] submitting request', {
        loginMethod,
        identifier: normalizedIdentifier,
      });

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
      router.push('/dashboard');
    } catch (err) {
      console.error('[login] request failed', err);

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
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F7F8FC] via-[#EEF1F8] to-[#E6ECF7] px-4 dark:from-[#0B1026] dark:via-[#111827] dark:to-[#0B1026]">
      <div className="fixed right-4 top-4 z-50"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 h-72 w-72 rounded-full bg-[#7B61FF]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-7 text-center">
          <Link href="/">
            <h1 className="text-3xl font-bold text-navy dark:text-white">Raksha<span className="text-primary">AI</span></h1>
          </Link>
          <p className="mt-1 text-sm text-navy/55 dark:text-white/35">Sign in to your account</p>
        </div>

        <div className="animate-slide-up rounded-2xl border border-navy/10 bg-white/90 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="flex border-b border-navy/10 dark:border-white/10">
            {(['password', 'mpin'] as LoginMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setLoginMethod(method);
                  setCredential('');
                  setError('');
                }}
                className={[
                  'flex-1 py-3.5 text-sm font-medium transition-colors first:rounded-tl-2xl last:rounded-tr-2xl',
                  loginMethod === method ? 'border-b-2 border-primary -mb-px text-navy dark:text-white' : 'text-navy/45 hover:text-navy/70 dark:text-white/35 dark:hover:text-white/60',
                ].join(' ')}
              >
                {method === 'password' ? 'Password Login' : 'MPIN Login'}
              </button>
            ))}
          </div>

          <div className="p-7">
            {error ? (
              <div role="alert" className="mb-5 rounded-xl border border-emergency/30 bg-emergency/10 p-3">
                <p className="text-xs text-emergency">{error}</p>
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
                  <button type="button" onClick={() => setShowCredential((value) => !value)} className="transition-colors hover:text-navy dark:hover:text-white/70" aria-label={showCredential ? 'Hide credential' : 'Show credential'}>
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                }
              />

              {loginMethod === 'mpin' ? (
                <p className="text-xs text-navy/55 dark:text-white/35">Use the 6-digit MPIN you set up for this account. If MPIN is not enabled, use Password Login instead.</p>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95 disabled:opacity-60"
              >
                {loading ? <><Spinner /> Signing in...</> : loginMethod === 'password' ? 'Sign In' : 'Sign In with MPIN'}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-navy/60 dark:text-white/35">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="font-medium text-primary transition-colors hover:text-primary-400">Create one</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}

function Spinner() {
  return <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}
