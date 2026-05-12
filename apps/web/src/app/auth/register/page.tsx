'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import PasswordStrength from '@/components/ui/PasswordStrength';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
  else if (!/^(\+91)?[6-9]\d{9}$/.test(data.phone.replace(/\s/g, '')))
    errors.phone = 'Enter a valid Indian mobile number';
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
    if (Object.keys(validationErrors).length > 0) { setErrors(validationErrors); return; }
    setLoading(true);
    setErrors({});
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api'}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fullName: form.fullName.trim(),
            email: form.email.trim().toLowerCase(),
            phone: form.phone.trim(),
            aadhaarNumber: form.aadhaarNumber.trim(),
            password: form.password,
          }),
        }
      );
      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) { setErrors({ form: data.message || 'Registration failed.' }); return; }
      sessionStorage.setItem('rakshaai_pending_email', form.email.trim().toLowerCase());
      sessionStorage.setItem('rakshaai_otp_purpose', 'register');
      router.push('/auth/verify-otp');
    } catch {
      setErrors({ form: 'Network error. Check your connection.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#0B1026] via-[#111827] to-[#0B1026] flex items-center justify-center px-4 py-12">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-[#7B61FF]/10 blur-3xl" />
      <div className="relative z-10 w-full max-w-md">
        <Link href="/" className="inline-flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-6 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 animate-slide-up">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white">Create Account</h1>
            <p className="mt-1 text-sm text-white/40">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary hover:text-primary-400 font-medium transition-colors">Sign in</Link>
            </p>
          </div>
          {errors.form && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-emergency/10 border border-emergency/30 p-3.5">
              <svg className="w-4 h-4 text-emergency flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-emergency">{errors.form}</p>
            </div>
          )}
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
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="hover:text-white/70 transition-colors" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    )}
                  </button>
                }
              />
              <PasswordStrength password={form.password} />
            </div>
            <button type="submit" disabled={loading} className="mt-2 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-primary transition-all duration-200 hover:bg-primary-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating account…</>
              ) : 'Create Account'}
            </button>
          </form>
          <p className="mt-5 text-center text-xs text-white/25 leading-relaxed">Your Aadhaar number is encrypted at rest and never shared with third parties.</p>
        </div>
      </div>
    </main>
  );
}
