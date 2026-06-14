'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MarketingNav from '@/components/layout/MarketingNav';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { authApi } from '@/lib/api/auth.api';
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
      router.push('/dashboard');
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
    <main className="min-h-screen bg-background">
      <MarketingNav />
      <section className="page-container grid gap-8 py-10 lg:grid-cols-[0.95fr_0.85fr] lg:py-16">
        <div className="surface-panel flex flex-col justify-between p-8 lg:p-12">
          <div>
            <span className="eyebrow">Secure access portal</span>
            <h1 className="display-section mt-6">Sign in to your RakshaAI workspace.</h1>
            <p className="mt-4 max-w-xl text-lg leading-8 text-body">
              Return to your dashboard, safety routes, responder tools, and live community intelligence without changing products or mental context.
            </p>
          </div>

          <div className="mt-10 space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-xl border border-hairline bg-white px-4 py-4 dark:bg-[#14171d]">
                <p className="text-sm leading-7 text-body">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="product-card p-8 lg:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold text-ink">Account access</p>
            <p className="mt-2 text-sm text-muted">Use your password or the 6-digit MPIN attached to your profile.</p>
          </div>

          <div className="nav-pill-group mb-6">
            {(['password', 'mpin'] as LoginMethod[]).map((method) => (
              <button
                key={method}
                type="button"
                onClick={() => {
                  setLoginMethod(method);
                  setCredential('');
                  setError('');
                }}
                className={loginMethod === method ? 'nav-pill-active' : 'nav-pill'}
              >
                {method === 'password' ? 'Password' : 'MPIN'}
              </button>
            ))}
          </div>

          {error ? (
            <div role="alert" className="mb-5 rounded-xl border border-emergency/30 bg-emergency/10 p-3">
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
                <button type="button" onClick={() => setShowCredential((value) => !value)} className="transition-colors hover:text-ink dark:hover:text-white" aria-label={showCredential ? 'Hide credential' : 'Show credential'}>
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

          <p className="mt-6 text-sm text-muted">
            Don&apos;t have an account?{' '}
            <Link href="/auth/register" className="font-semibold text-ink">
              Create one
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
