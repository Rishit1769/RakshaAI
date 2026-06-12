'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import PasswordStrength from '@/components/ui/PasswordStrength';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authApi } from '@/lib/api/auth.api';
import { ApiError, buildApiUrl } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
}

interface FormErrors {
  fullName?: string;
  email?: string;
  phone?: string;
  aadhaarNumber?: string;
  password?: string;
  form?: string;
}

function validate(data: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!data.fullName.trim()) errors.fullName = 'Full name is required';
  else if (!/^[a-zA-Z\s'-]+$/.test(data.fullName)) errors.fullName = 'Only letters, spaces, hyphens and apostrophes';
  else if (data.fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters';
  if (!data.email.trim()) errors.email = 'Email is required';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) errors.email = 'Enter a valid email address';
  if (!data.phone.trim()) errors.phone = 'Phone number is required';
  else if (!/^(\+91)?[6-9]\d{9}$/.test(data.phone.replace(/\s/g, ''))) errors.phone = 'Enter a valid Indian mobile number';
  if (!data.aadhaarNumber.trim()) errors.aadhaarNumber = 'Aadhaar number is required';
  else if (!/^\d{12}$/.test(data.aadhaarNumber)) errors.aadhaarNumber = 'Aadhaar must be exactly 12 digits';
  if (!data.password) errors.password = 'Password is required';
  else if (data.password.length < 8) errors.password = 'Minimum 8 characters';
  else if (!/[A-Z]/.test(data.password)) errors.password = 'Must contain an uppercase letter';
  else if (!/[a-z]/.test(data.password)) errors.password = 'Must contain a lowercase letter';
  else if (!/[0-9]/.test(data.password)) errors.password = 'Must contain a number';
  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState<FormState>({ fullName: '', email: '', phone: '', aadhaarNumber: '', password: '' });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationErrors = validate(form);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    setErrors({});

    try {
      const payload = {
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        aadhaarNumber: form.aadhaarNumber.trim(),
        password: form.password,
      };
      const requestUrl = buildApiUrl('/auth/register');

      console.log('[register] submitting registration to', requestUrl, payload);

      const response = await authApi.register(payload);

      if (!response.success || !response.data) {
        setErrors({ form: response.message || 'Registration failed.' });
        return;
      }

      setAuth(response.data.user, response.data.accessToken);
      router.push('/dashboard');
    } catch (error) {
      console.error('[register] registration request failed', {
        url: buildApiUrl('/auth/register'),
        error,
      });

      if (error instanceof ApiError) {
        const isConnectivityIssue = error.statusCode === 0 || error.message === 'Failed to fetch';
        setErrors({
          form: isConnectivityIssue
            ? 'Cannot connect to backend. Start backend server and try again.'
            : error.message || `Unable to reach auth service (HTTP ${error.statusCode}). Please ensure backend is running on port 5000.`,
        });
        return;
      }

      setErrors({ form: 'Cannot connect to backend. Start backend server and try again.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-gradient-to-br from-[#F7F8FC] via-[#EEF1F8] to-[#E6ECF7] px-4 py-12 dark:from-[#0B1026] dark:via-[#111827] dark:to-[#0B1026]">
      <div className="fixed right-4 top-4 z-50"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 rounded-full bg-[#7B61FF]/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="mb-6 inline-flex text-sm text-navy/55 transition-colors hover:text-navy dark:text-white/45 dark:hover:text-white/70">
          Back
        </Link>
        <div className="animate-slide-up rounded-2xl border border-navy/10 bg-white/90 p-8 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-navy dark:text-white">Create Account</h1>
            <p className="mt-1 text-sm text-navy/65 dark:text-white/45">
              Already have an account?{' '}
              <Link href="/auth/login" className="font-medium text-primary transition-colors hover:text-primary-400">Sign in</Link>
            </p>
          </div>

          {errors.form ? (
            <div role="alert" className="mb-5 rounded-xl border border-emergency/30 bg-emergency/10 p-3.5">
              <p className="text-sm text-emergency">{errors.form}</p>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <FloatingLabelInput label="Full Name" type="text" value={form.fullName} onChange={(e) => handleChange('fullName', e.target.value)} error={errors.fullName} autoComplete="name" disabled={loading} />
            <FloatingLabelInput label="Email Address" type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} error={errors.email} autoComplete="email" disabled={loading} />
            <FloatingLabelInput label="Phone Number (Indian)" type="tel" value={form.phone} onChange={(e) => handleChange('phone', e.target.value)} error={errors.phone} autoComplete="tel" disabled={loading} maxLength={13} />
            <FloatingLabelInput label="Aadhaar Card Number (12 digits)" type="text" inputMode="numeric" value={form.aadhaarNumber} onChange={(e) => handleChange('aadhaarNumber', e.target.value.replace(/\D/g, ''))} error={errors.aadhaarNumber} maxLength={12} disabled={loading} />
            <div>
              <FloatingLabelInput
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => handleChange('password', e.target.value)}
                error={errors.password}
                autoComplete="new-password"
                disabled={loading}
                rightElement={
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="transition-colors hover:text-navy dark:hover:text-white/70" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                }
              />
              <PasswordStrength password={form.password} />
            </div>
            <button type="submit" disabled={loading} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-primary transition-all duration-200 hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {loading ? (
                <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating account...</>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs leading-relaxed text-navy/60 dark:text-white/35">
            Your Aadhaar number is encrypted at rest and never shared with third parties.
          </p>
        </div>
      </div>
    </main>
  );
}
