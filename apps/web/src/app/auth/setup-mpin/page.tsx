'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';

type Step = 'enter' | 'confirm';

export default function SetupMpinPage() {
  const router = useRouter();
  const { accessToken } = useAuthStore();

  const [step, setStep] = useState<Step>('enter');
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [skipping, setSkipping] = useState(false);

  // Active digit array
  const active = step === 'enter' ? mpin : confirmMpin;
  const setActive = step === 'enter' ? setMpin : setConfirmMpin;
  const MPIN_LENGTH = 6;

  function handleDigit(d: string) {
    if (active.length >= MPIN_LENGTH) return;
    setError('');
    setActive((prev) => prev + d);
  }

  function handleBackspace() {
    setError('');
    setActive((prev) => prev.slice(0, -1));
  }

  function handleNext() {
    if (mpin.length < 4) { setError('MPIN must be at least 4 digits.'); return; }
    setStep('confirm');
  }

  async function handleConfirm() {
    if (confirmMpin.length < 4) { setError('Please confirm your MPIN.'); return; }
    if (mpin !== confirmMpin) {
      setError('MPINs do not match. Please try again.');
      setConfirmMpin('');
      setStep('confirm');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/auth/setup-mpin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken ?? ''}`,
        },
        body: JSON.stringify({ mpin, confirmMpin }),
      });

      const data = (await res.json()) as { success: boolean; message: string };
      if (!res.ok || !data.success) {
        setError(data.message || 'Failed to set MPIN.');
        return;
      }

      router.push('/dashboard');
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSkip() {
    setSkipping(true);
    router.push('/dashboard');
  }

  const handleAction = step === 'enter'
    ? () => { if (active.length >= 4) handleNext(); }
    : handleConfirm;

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#0B1026] via-[#111827] to-[#0B1026] flex items-center justify-center px-4">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-[#7B61FF]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl p-8 animate-slide-up">
          {/* Icon */}
          <div className="flex items-center justify-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <svg className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white">
              {step === 'enter' ? 'Set your MPIN' : 'Confirm MPIN'}
            </h1>
            <p className="mt-1.5 text-sm text-white/40 leading-relaxed">
              {step === 'enter'
                ? 'Your MPIN gives you quick, secure access to sensitive actions.'
                : 'Enter your MPIN again to confirm.'}
            </p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {(['enter', 'confirm'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={[
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                  step === s || (s === 'enter' && step === 'confirm')
                    ? 'bg-primary text-white'
                    : 'bg-white/10 text-white/30',
                ].join(' ')}>
                  {i + 1}
                </div>
                {i === 0 && <div className={['h-px w-8 transition-all', step === 'confirm' ? 'bg-primary/50' : 'bg-white/10'].join(' ')} />}
              </div>
            ))}
          </div>

          {/* MPIN dots */}
          <div className="flex justify-center gap-3 mb-6">
            {Array.from({ length: MPIN_LENGTH }).map((_, i) => (
              <div
                key={i}
                className={[
                  'w-4 h-4 rounded-full border-2 transition-all duration-150',
                  i < active.length
                    ? 'bg-primary border-primary scale-110'
                    : 'bg-transparent border-white/20',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Error */}
          {error && (
            <div role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-emergency/10 border border-emergency/30 p-3">
              <svg className="w-4 h-4 text-emergency flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-emergency">{error}</p>
            </div>
          )}

          {/* Numpad */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((key) => (
              <button
                key={key}
                type="button"
                disabled={loading || !key}
                onClick={() => {
                  if (!key) return;
                  if (key === '⌫') handleBackspace();
                  else handleDigit(key);
                }}
                className={[
                  'h-14 rounded-xl text-lg font-semibold transition-all duration-100 active:scale-95',
                  !key ? 'invisible' : '',
                  key === '⌫'
                    ? 'text-white/50 bg-white/5 border border-white/10 hover:bg-white/10'
                    : 'text-white bg-white/8 border border-white/10 hover:bg-white/15',
                  loading ? 'opacity-50 cursor-not-allowed' : '',
                ].join(' ')}
              >
                {key}
              </button>
            ))}
          </div>

          {/* Action button */}
          <button
            type="button"
            disabled={loading || active.length < 4}
            onClick={handleAction}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-primary transition-all duration-200 hover:bg-primary-600 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</>
            ) : step === 'enter' ? 'Continue' : 'Set MPIN'}
          </button>

          <button
            type="button"
            onClick={handleSkip}
            disabled={skipping}
            className="w-full mt-3 py-2.5 text-sm text-white/30 hover:text-white/50 transition-colors disabled:opacity-50"
          >
            Skip for now
          </button>
        </div>
      </div>
    </main>
  );
}
