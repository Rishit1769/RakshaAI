'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import { useAuthStore } from '@/store/auth.store';
import ThemeToggle from '@/components/ui/ThemeToggle';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api';
type LoginMode = 'email' | 'mpin';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth, clearAuth, preferredIdentifier, rememberIdentifier } = useAuthStore();

  const [mode, setMode] = useState<LoginMode>('email');

  // Email login state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // MPIN login state
  const [mpinPassword, setMpinPassword] = useState('');
  const [mpinDigits, setMpinDigits] = useState('');
  const [mpinCredential, setMpinCredential] = useState('');
  const [showMpinPassword, setShowMpinPassword] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: email.trim().toLowerCase(), password }),
      });
      const data = (await res.json()) as {
        success: boolean;
        message: string;
        data?: { user: { id: string; fullName: string; email: string; phone: string; role: string; isVerified: boolean }; accessToken: string };
      };
      if (!res.ok || !data.success) { setError(data.message || 'Login failed.'); return; }
      rememberIdentifier(email.trim().toLowerCase());
      setAuth(data.data!.user, data.data!.accessToken);
      router.push('/dashboard');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  async function handleMpinLogin(e: React.FormEvent) {
    e.preventDefault();
    const credential = (preferredIdentifier ?? mpinCredential).trim().toLowerCase();
    if (!credential) {
      setError('Enter your linked email or phone once. It will be remembered for next MPIN login.');
      return;
    }
    if (!mpinPassword || mpinDigits.length < 4) {
      setError('Please enter password and MPIN.'); return;
    }
    setLoading(true); setError('');
    try {
      const res = await fetch(`${API_BASE}/auth/login-mpin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential, password: mpinPassword, mpin: mpinDigits }),
      });
      const data = (await res.json()) as {
        success: boolean; message: string;
        data?: { user: { id: string; fullName: string; email: string; phone: string; role: string; isVerified: boolean }; accessToken: string };
      };
      if (!res.ok || !data.success) { setError(data.message || 'Login failed.'); return; }
      rememberIdentifier(credential);
      setAuth(data.data!.user, data.data!.accessToken);
      router.push('/dashboard');
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#F7F8FC] via-[#EEF1F8] to-[#E6ECF7] dark:from-[#0B1026] dark:via-[#111827] dark:to-[#0B1026] flex items-center justify-center px-4">
      <div className="fixed top-4 right-4 z-50"><ThemeToggle /></div>
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 right-0 w-72 h-72 rounded-full bg-[#7B61FF]/10 blur-3xl" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-7">
          <Link href="/">
            <h1 className="text-3xl font-bold text-navy dark:text-white">Raksha<span className="text-primary">AI</span></h1>
          </Link>
          <p className="mt-1 text-sm text-navy/55 dark:text-white/35">Sign in to your account</p>
        </div>

        <div className="rounded-2xl border border-navy/10 bg-white/90 dark:border-white/10 dark:bg-white/5 backdrop-blur-xl shadow-2xl animate-slide-up">
          <div className="flex border-b border-navy/10 dark:border-white/10">
            {(['email', 'mpin'] as LoginMode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                className={['flex-1 py-3.5 text-sm font-medium transition-colors first:rounded-tl-2xl last:rounded-tr-2xl',
                  mode === m ? 'text-navy dark:text-white border-b-2 border-primary -mb-px' : 'text-navy/45 hover:text-navy/70 dark:text-white/35 dark:hover:text-white/60'].join(' ')}>
                {m === 'email' ? 'Email + Password' : 'MPIN Login'}
              </button>
            ))}
          </div>

          <div className="p-7">
            {error && (
              <div role="alert" className="mb-5 flex items-start gap-2 rounded-xl bg-emergency/10 border border-emergency/30 p-3">
                <svg className="w-4 h-4 text-emergency flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-emergency">{error}</p>
              </div>
            )}

            {mode === 'email' && (
              <form onSubmit={handleEmailLogin} noValidate className="space-y-4">
                <FloatingLabelInput label="Email Address" type="email" value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }} autoComplete="email" disabled={loading} />
                <FloatingLabelInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  disabled={loading}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="hover:text-white/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  }
                />
                <button type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary-600 active:scale-95 disabled:opacity-60">
                  {loading ? <><Spinner /> Signing in…</> : 'Sign In'}
                </button>
              </form>
            )}

            {mode === 'mpin' && (
              <form onSubmit={handleMpinLogin} noValidate className="space-y-4">
                {!preferredIdentifier && (
                  <FloatingLabelInput
                    label="Email or Phone"
                    type="text"
                    value={mpinCredential}
                    onChange={(e) => { setMpinCredential(e.target.value); setError(''); }}
                    autoComplete="username"
                    disabled={loading}
                  />
                )}
                <FloatingLabelInput
                  label="Password"
                  type={showMpinPassword ? 'text' : 'password'}
                  value={mpinPassword}
                  onChange={(e) => { setMpinPassword(e.target.value); setError(''); }}
                  autoComplete="current-password"
                  disabled={loading}
                  rightElement={
                    <button type="button" onClick={() => setShowMpinPassword((v) => !v)} className="hover:text-white/70 transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  }
                />
                <div className="space-y-1.5">
                  <p className="text-xs text-navy/55 dark:text-white/35 pl-1">MPIN ({mpinDigits.length}/6)</p>
                  <input type="password" inputMode="numeric" maxLength={6} value={mpinDigits}
                    onChange={(e) => { setMpinDigits(e.target.value.replace(/\D/g, '')); setError(''); }}
                    className="w-full rounded-xl border border-navy/15 bg-white dark:border-white/15 dark:bg-white/5 px-4 py-3.5 text-center text-2xl font-mono tracking-[0.4em] text-navy dark:text-white outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    aria-label="MPIN" disabled={loading} />
                </div>
                <button type="submit" disabled={loading || mpinDigits.length < 4}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-primary text-white font-semibold text-sm transition-all hover:bg-primary-600 active:scale-95 disabled:opacity-60">
                  {loading ? <><Spinner /> Signing in…</> : 'Sign In with MPIN'}
                </button>
              </form>
            )}

            <p className="mt-5 text-center text-sm text-navy/45 dark:text-white/30">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary hover:text-primary-400 font-medium transition-colors">Create one</Link>
            </p>
            {preferredIdentifier && (
              <button
                type="button"
                onClick={() => { clearAuth(); setMpinCredential(''); setError(''); }}
                className="mt-3 w-full text-xs text-navy/50 dark:text-white/40 hover:text-navy dark:hover:text-white transition-colors"
              >
                Forget saved account for MPIN login
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Spinner() {
  return <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}
