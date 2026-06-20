'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import MarketingNav from '@/components/layout/MarketingNav';
import { useAuthStore } from '@/store/auth.store';

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

  const active = step === 'enter' ? mpin : confirmMpin;
  const setActive = step === 'enter' ? setMpin : setConfirmMpin;
  const MPIN_LENGTH = 6;

  function handleDigit(digit: string) {
    if (active.length >= MPIN_LENGTH) return;
    setError('');
    setActive((prev) => prev + digit);
  }

  function handleBackspace() {
    setError('');
    setActive((prev) => prev.slice(0, -1));
  }

  function handleNext() {
    if (mpin.length !== MPIN_LENGTH) {
      setError('MPIN must be exactly 6 digits.');
      return;
    }
    setStep('confirm');
  }

  async function handleConfirm() {
    if (confirmMpin.length !== MPIN_LENGTH) {
      setError('Please confirm your 6-digit MPIN.');
      return;
    }
    if (mpin !== confirmMpin) {
      setError('MPINs do not match. Please try again.');
      setConfirmMpin('');
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

  const handleAction = step === 'enter' ? handleNext : handleConfirm;

  return (
    <main className="min-h-screen bg-background">
      <MarketingNav />
      <section className="page-container grid gap-8 py-10 lg:grid-cols-[1fr_0.84fr] lg:py-16">
        <div className="hero-panel p-8 lg:p-12">
          <span className="eyebrow">Faster account access</span>
          <h1 className="display-section mt-6">Add MPIN for quicker, lower-friction sign-in.</h1>
          <p className="mt-4 text-lg leading-8 text-body">
            This short setup creates a 6-digit fallback path for moments when speed matters and typing a full password is harder.
          </p>
        </div>

        <div className="surface-panel-modern p-8">
          <div className="mb-8">
            <p className="text-sm font-semibold text-ink">{step === 'enter' ? 'Create MPIN' : 'Confirm MPIN'}</p>
            <p className="mt-2 text-sm text-muted">Use six digits that you can recall quickly but others cannot guess easily.</p>
          </div>

          {error ? (
            <div role="alert" className="mb-4 rounded-xl border border-emergency/30 bg-emergency/10 p-3">
              <p className="text-sm text-emergency">{error}</p>
            </div>
          ) : null}

          <div className="mb-6 flex justify-center gap-3">
            {Array.from({ length: MPIN_LENGTH }).map((_, index) => (
              <div
                key={index}
                className={`h-4 w-4 rounded-full border-2 transition-all ${index < active.length ? 'border-primary bg-primary' : 'border-hairline bg-transparent'}`}
              />
            ))}
          </div>

          <div className="mb-4 grid grid-cols-3 gap-3">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'Del'].map((key) => (
              <button
                key={key}
                type="button"
                disabled={loading || !key}
                onClick={() => {
                  if (!key) return;
                  if (key === 'Del') handleBackspace();
                  else handleDigit(key);
                }}
                className={`h-14 rounded-2xl border text-lg font-semibold transition-all ${!key ? 'invisible' : 'border-border bg-white text-ink shadow-soft hover:-translate-y-0.5 hover:bg-surface-soft hover:shadow-card'}`}
              >
                {key}
              </button>
            ))}
          </div>

          <button type="button" disabled={loading || active.length !== MPIN_LENGTH} onClick={handleAction} className="btn-primary w-full">
            {loading ? 'Saving...' : step === 'enter' ? 'Continue' : 'Set MPIN'}
          </button>

          <button type="button" onClick={() => router.push('/dashboard')} className="mt-3 w-full text-sm text-muted">
            Skip for now
          </button>
        </div>
      </section>
    </main>
  );
}
