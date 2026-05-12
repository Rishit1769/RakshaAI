'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<'credentials' | 'otp'>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [error, setError] = useState('');

  // Step 1 — Submit email+password, get OTP sent
  const loginMutation = useMutation({
    mutationFn: () => authApi.login({ email, password }),
    onSuccess: (res) => {
      if (res.data) {
        setMaskedEmail(res.data.maskedEmail ?? email);
        setStep('otp');
        setError('');
      }
    },
    onError: (err: Error) => {
      setError(err.message ?? 'Login failed. Please try again.');
    },
  });

  // Step 2 — Submit OTP, receive tokens
  const verifyMutation = useMutation({
    mutationFn: () =>
      authApi.verifyOtp({ identifier: email, otp, purpose: 'login' }),
    onSuccess: (res) => {
      if (res.data) {
        const { user, accessToken } = res.data as {
          user: import('@/lib/api/auth.api').AuthUser;
          accessToken: string;
        };
        setAuth(user, accessToken, '');
        router.push('/dashboard');
      }
    },
    onError: (err: Error) => {
      setError(err.message ?? 'Invalid OTP. Please try again.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: () =>
      authApi.resendOtp({ identifier: email, purpose: 'login' }),
    onSuccess: () => setError(''),
  });

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-hero text-navy mb-1">
            Raksha<span className="text-primary">AI</span>
          </h1>
          <p className="text-caption text-muted">Sign in to your account</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-emergency text-emergency text-sm">
            {error}
          </div>
        )}

        {step === 'credentials' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              loginMutation.mutate();
            }}
            className="space-y-4"
          >
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="btn-primary w-full"
            >
              {loginMutation.isPending ? 'Sending OTP…' : 'Continue'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setError('');
              verifyMutation.mutate();
            }}
            className="space-y-4"
          >
            <p className="text-sm text-muted text-center">
              Enter the 6-digit OTP sent to{' '}
              <span className="font-semibold text-navy">{maskedEmail}</span>
            </p>

            <div>
              <label htmlFor="otp" className="block text-sm font-medium text-navy mb-1">
                OTP Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                maxLength={6}
                pattern="\d{6}"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="input-field text-center text-2xl font-mono tracking-widest"
              />
            </div>

            <button
              type="submit"
              disabled={verifyMutation.isPending || otp.length < 6}
              className="btn-primary w-full"
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Verify & Sign In'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {resendMutation.isPending ? 'Sending…' : "Didn't receive OTP? Resend"}
              </button>
            </div>

            <button
              type="button"
              onClick={() => { setStep('credentials'); setOtp(''); setError(''); }}
              className="w-full text-sm text-muted hover:text-navy"
            >
              ← Change email
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Don&apos;t have an account?{' '}
          <Link href="/auth/register" className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
