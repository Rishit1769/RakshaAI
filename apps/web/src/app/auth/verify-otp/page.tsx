'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtpPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COOLDOWN);
  const [resendSuccess, setResendSuccess] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get context from sessionStorage
  const [email, setEmail] = useState('');
  const [purpose, setPurpose] = useState<'register' | 'login' | 'reset' | 'verify' | 'mpin'>('register');

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('rakshaai_pending_email') ?? '';
    const storedPurpose = (sessionStorage.getItem('rakshaai_otp_purpose') ?? 'register') as typeof purpose;
    if (!storedEmail) { router.replace('/auth/register'); return; }
    setEmail(storedEmail);
    setPurpose(storedPurpose);
    inputRefs.current[0]?.focus();
  }, [router]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  function handleDigitChange(index: number, value: string) {
    const cleaned = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleaned;
    setDigits(newDigits);
    setError('');

    if (cleaned && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIdx = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIdx]?.focus();
  }

  const otp = digits.join('');
  const isComplete = otp.length === OTP_LENGTH;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!isComplete) { setError('Please enter all 6 digits.'); return; }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, otp, purpose }),
      });

      const data = (await res.json()) as {
        success: boolean;
        message: string;
        data?: { user: { id: string; fullName: string; email: string; phone: string; role: string; isVerified: boolean; mpinSet?: boolean }; accessToken: string };
      };

      if (!res.ok || !data.success) {
        setError(data.message || 'Invalid OTP. Please try again.');
        return;
      }

      const { user, accessToken } = data.data!;
      setAuth(user, accessToken, '');

      sessionStorage.removeItem('rakshaai_pending_email');
      sessionStorage.removeItem('rakshaai_otp_purpose');

      // After registration → MPIN setup
      if (purpose === 'register') {
        router.push('/auth/setup-mpin');
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (countdown > 0 || resendLoading) return;
    setResendLoading(true);
    setResendSuccess(false);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, purpose }),
      });

      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) { setError(data.message || 'Failed to resend OTP.'); return; }

      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
      setCountdown(RESEND_COOLDOWN);
      setResendSuccess(true);
      setTimeout(() => setResendSuccess(false), 3000);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  }

  const maskedEmail = email.replace(/(.{2})(.*)(@.*)/, (_, a, b, c) => a + '*'.repeat(Math.min(b.length, 4)) + c);

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#0B1026] via-[#111827] to-[#0B1026] flex items-center justify-center px-4">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-[#7B61FF]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 animate-slide-up">
          {/* Icon */}
          <div className="flex items-center justify-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-7">
            <h1 className="text-xl font-bold text-white">Verify your email</h1>
            <p className="mt-2 text-sm text-white/40 leading-relaxed">
              We sent a 6-digit code to{' '}
              <span className="text-white/60 font-medium">{maskedEmail}</span>
            </p>
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-emergency/10 border border-emergency/30 p-3">
              <svg className="w-4 h-4 text-emergency flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-emergency">{error}</p>
            </div>
          )}

          {resendSuccess && (
            <div className="mb-5 flex items-center gap-2 rounded-xl bg-safe/10 border border-safe/30 p-3">
              <svg className="w-4 h-4 text-safe flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-safe">New OTP sent to your email.</p>
            </div>
          )}

          <form onSubmit={handleVerify}>
            {/* OTP Boxes */}
            <div className="flex gap-2.5 justify-center mb-6" onPaste={handlePaste}>
              {digits.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { inputRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  aria-label={`OTP digit ${i + 1}`}
                  disabled={loading}
                  className={[
                    'w-11 h-14 rounded-xl text-center text-xl font-bold text-white',
                    'border bg-white/5 transition-all duration-150 outline-none',
                    'focus:ring-2 focus:ring-primary focus:border-primary',
                    'disabled:opacity-50',
                    error ? 'border-emergency/60' : digit ? 'border-primary/60' : 'border-white/15',
                  ].join(' ')}
                />
              ))}
            </div>

            <button
              type="submit"
              disabled={loading || !isComplete}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-primary transition-all duration-200 hover:bg-primary-600 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {loading ? (
                <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Verifying…</>
              ) : 'Verify Code'}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-5 text-center">
            <p className="text-xs text-white/35">
              Didn&apos;t receive the code?{' '}
              {countdown > 0 ? (
                <span className="text-white/40">Resend in {countdown}s</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendLoading}
                  className="text-primary hover:text-primary-400 font-medium transition-colors disabled:opacity-50"
                >
                  {resendLoading ? 'Sending…' : 'Resend OTP'}
                </button>
              )}
            </p>
          </div>

          <div className="mt-4 text-center">
            <Link href="/auth/register" className="text-xs text-white/25 hover:text-white/50 transition-colors">
              ← Use a different email
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
