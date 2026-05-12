'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useMutation } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth.api';
import { useAuthStore } from '@/store/auth.store';

type Role = 'user' | 'volunteer';

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'user' as Role,
  });

  const registerMutation = useMutation({
    mutationFn: () =>
      authApi.register({
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: formData.role,
      }),
    onSuccess: (res) => {
      if (res.data) {
        setIdentifier(formData.email);
        setStep('otp');
        setError('');
      }
    },
    onError: (err: Error) => {
      setError(err.message ?? 'Registration failed. Please try again.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      authApi.verifyOtp({ identifier, otp, purpose: 'register' }),
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
      setError(err.message ?? 'Invalid OTP.');
    },
  });

  const resendMutation = useMutation({
    mutationFn: () =>
      authApi.resendOtp({ identifier, purpose: 'register' }),
    onSuccess: () => setError(''),
  });

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    registerMutation.mutate();
  }

  return (
    <div className="min-h-screen bg-light flex items-center justify-center p-4">
      <div className="card w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-hero text-navy mb-1">
            Raksha<span className="text-primary">AI</span>
          </h1>
          <p className="text-caption text-muted">Create your safety account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-emergency text-emergency text-sm">
            {error}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-navy mb-1">
                Full Name
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Priya Sharma"
                className="input-field"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy mb-1">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="you@example.com"
                className="input-field"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-navy mb-1">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="input-field"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-navy mb-1">Account Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(['user', 'volunteer'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setFormData({ ...formData, role: r })}
                    className={`py-2 px-3 rounded-lg border text-sm font-medium capitalize transition-colors ${
                      formData.role === r
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-navy border-border hover:border-primary'
                    }`}
                  >
                    {r === 'user' ? '👤 User' : '🤝 Volunteer'}
                  </button>
                ))}
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                autoComplete="new-password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min. 8 characters"
                className="input-field"
              />
              <p className="text-xs text-muted mt-1">
                Must include uppercase, lowercase, and a number.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-navy mb-1">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="••••••••"
                className="input-field"
              />
            </div>

            <button
              type="submit"
              disabled={registerMutation.isPending}
              className="btn-primary w-full"
            >
              {registerMutation.isPending ? 'Creating account…' : 'Create Account'}
            </button>
          </form>
        ) : (
          <form
            onSubmit={(e) => { e.preventDefault(); setError(''); verifyMutation.mutate(); }}
            className="space-y-4"
          >
            <p className="text-sm text-muted text-center">
              We sent a 6-digit OTP to{' '}
              <span className="font-semibold text-navy">{identifier}</span>
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
              {verifyMutation.isPending ? 'Verifying…' : 'Verify & Finish'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => resendMutation.mutate()}
                disabled={resendMutation.isPending}
                className="text-sm text-primary hover:underline disabled:opacity-50"
              >
                {resendMutation.isPending ? 'Sending…' : "Didn't receive? Resend OTP"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
