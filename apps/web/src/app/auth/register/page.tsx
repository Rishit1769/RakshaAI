'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import PasswordStrength from '@/components/ui/PasswordStrength';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { authApi } from '@/lib/api/auth.api';
import { ApiError } from '@/lib/api/fetcher';
import { useAuthStore } from '@/store/auth.store';

type RegisterStep = 1 | 2 | 3;

interface ProfileFormState {
  fullName: string;
  phone: string;
  aadhaarNumber: string;
  password: string;
  confirmPassword: string;
  enableMpin: boolean;
  mpin: string;
  confirmMpin: string;
}

interface ProfileErrors {
  fullName?: string;
  phone?: string;
  aadhaarNumber?: string;
  password?: string;
  confirmPassword?: string;
  mpin?: string;
  confirmMpin?: string;
}

const OTP_LIFETIME_SECONDS = 600;
const RESEND_COOLDOWN_SECONDS = 60;
const weakMpins = new Set(['000000', '111111', '123456', '654321']);

function formatCountdown(totalSeconds: number) {
  const safeSeconds = Math.max(totalSeconds, 0);
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function validateProfile(form: ProfileFormState): ProfileErrors {
  const errors: ProfileErrors = {};

  if (!form.fullName.trim()) errors.fullName = 'Full name is required';
  else if (!/^[a-zA-Z\s'-]+$/.test(form.fullName)) errors.fullName = 'Only letters, spaces, hyphens and apostrophes';
  else if (form.fullName.trim().length < 2) errors.fullName = 'Name must be at least 2 characters';

  if (!form.phone.trim()) errors.phone = 'Phone number is required';
  else if (!/^(\+91)?[6-9]\d{9}$/.test(form.phone.replace(/\s/g, ''))) errors.phone = 'Enter a valid Indian mobile number';

  if (!form.aadhaarNumber.trim()) errors.aadhaarNumber = 'Aadhaar number is required';
  else if (!/^\d{12}$/.test(form.aadhaarNumber)) errors.aadhaarNumber = 'Aadhaar must be exactly 12 digits';

  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Minimum 8 characters';
  else if (!/[A-Z]/.test(form.password)) errors.password = 'Must contain an uppercase letter';
  else if (!/[a-z]/.test(form.password)) errors.password = 'Must contain a lowercase letter';
  else if (!/[0-9]/.test(form.password)) errors.password = 'Must contain a number';

  if (!form.confirmPassword) errors.confirmPassword = 'Please confirm your password';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';

  if (form.enableMpin) {
    if (!/^\d{6}$/.test(form.mpin)) errors.mpin = 'MPIN must be exactly 6 digits';
    else if (weakMpins.has(form.mpin)) errors.mpin = 'MPIN is too simple. Please choose a less predictable combination.';

    if (!form.confirmMpin) errors.confirmMpin = 'Please confirm your MPIN';
    else if (form.mpin !== form.confirmMpin) errors.confirmMpin = 'MPINs do not match';
  }

  return errors;
}

export default function RegisterPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();

  const [step, setStep] = useState<RegisterStep>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [resendAvailableAt, setResendAvailableAt] = useState<number | null>(null);

  const [profile, setProfile] = useState<ProfileFormState>({
    fullName: '',
    phone: '',
    aadhaarNumber: '',
    password: '',
    confirmPassword: '',
    enableMpin: false,
    mpin: '',
    confirmMpin: '',
  });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const secondsRemaining = useMemo(() => {
    if (!expiresAt) return OTP_LIFETIME_SECONDS;
    return Math.ceil((expiresAt - now) / 1000);
  }, [expiresAt, now]);

  const resendCooldownRemaining = useMemo(() => {
    if (!resendAvailableAt) return 0;
    return Math.ceil((resendAvailableAt - now) / 1000);
  }, [resendAvailableAt, now]);

  function updateProfileField<K extends keyof ProfileFormState>(field: K, value: ProfileFormState[K]) {
    setProfile((prev) => ({ ...prev, [field]: value }));
    if (field in errors) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  }

  function parseApiError(error: unknown, fallback: string) {
    if (error instanceof ApiError) return error.message || fallback;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
  }

  async function sendOtpRequest() {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFormError('Email address is required.');
      return;
    }

    setSendingOtp(true);
    setFormError('');

    try {
      await authApi.sendRegistrationOtp({ email: normalizedEmail });
      setEmail(normalizedEmail);
      setStep(2);
      setOtp('');
      setOtpVerified(false);
      setExpiresAt(Date.now() + OTP_LIFETIME_SECONDS * 1000);
      setResendAvailableAt(Date.now() + RESEND_COOLDOWN_SECONDS * 1000);
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to send verification code right now.'));
    } finally {
      setSendingOtp(false);
    }
  }

  async function verifyOtpRequest() {
    if (!/^\d{6}$/.test(otp)) {
      setFormError('Enter the 6-digit verification code.');
      return;
    }

    setVerifyingOtp(true);
    setFormError('');

    try {
      await authApi.checkRegistrationOtp({ email, otp });
      setOtpVerified(true);
      setStep(3);
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to verify the code right now.'));
    } finally {
      setVerifyingOtp(false);
    }
  }

  async function handleCreateAccount(event: React.FormEvent) {
    event.preventDefault();

    if (!otpVerified) {
      setFormError('Please verify your email code before creating the account.');
      setStep(2);
      return;
    }

    const validationErrors = validateProfile(profile);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setFormError('');
      return;
    }

    setCreatingAccount(true);
    setFormError('');

    try {
      const response = await authApi.verifyRegistrationOtp({
        email,
        otp,
        fullName: profile.fullName.trim(),
        phone: profile.phone.trim(),
        aadhaarNumber: profile.aadhaarNumber.trim(),
        password: profile.password,
        ...(profile.enableMpin ? { mpin: profile.mpin } : {}),
      });

      if (!response.success || !response.data) {
        setFormError(response.message || 'Registration failed.');
        return;
      }

      setAuth(response.data.user, response.data.accessToken);
      router.push('/dashboard');
    } catch (error) {
      setFormError(parseApiError(error, 'Unable to create your account right now.'));
    } finally {
      setCreatingAccount(false);
    }
  }

  async function handleResendOtp() {
    if (resendCooldownRemaining > 0 || sendingOtp) return;
    await sendOtpRequest();
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

          <div className="mb-6 flex items-center gap-2">
            {[1, 2, 3].map((item) => (
              <div key={item} className="flex flex-1 items-center gap-2">
                <div
                  className={[
                    'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors',
                    step >= item ? 'bg-primary text-white' : 'bg-navy/10 text-navy/45 dark:bg-white/10 dark:text-white/40',
                  ].join(' ')}
                >
                  {item}
                </div>
                {item < 3 ? (
                  <div className={`h-1 flex-1 rounded-full ${step > item ? 'bg-primary' : 'bg-navy/10 dark:bg-white/10'}`} />
                ) : null}
              </div>
            ))}
          </div>

          {formError ? (
            <div role="alert" className="mb-5 rounded-xl border border-emergency/30 bg-emergency/10 p-3.5">
              <p className="text-sm text-emergency">{formError}</p>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-navy dark:text-white">Step 1: Verify your email</h2>
                <p className="mt-1 text-sm text-navy/60 dark:text-white/45">We&apos;ll send a 6-digit code to your inbox before creating the account.</p>
              </div>

              <FloatingLabelInput
                label="Email Address"
                type="email"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setFormError(''); }}
                autoComplete="email"
                disabled={sendingOtp}
              />

              <button
                type="button"
                onClick={sendOtpRequest}
                disabled={sendingOtp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingOtp ? <><Spinner /> Sending code...</> : 'Send Verification Code'}
              </button>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-navy dark:text-white">Step 2: Enter your code</h2>
                <p className="mt-1 text-sm text-navy/60 dark:text-white/45">A 6-digit code has been sent to {email}.</p>
              </div>

              <div className="rounded-xl border border-navy/10 bg-navy/5 p-4 dark:border-white/10 dark:bg-white/5">
                <p className="text-sm font-medium text-navy dark:text-white">Code expires in {formatCountdown(secondsRemaining)}</p>
                <p className="mt-1 text-xs text-navy/55 dark:text-white/40">Keep this tab open while you complete verification.</p>
              </div>

              <FloatingLabelInput
                label="Verification Code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otp}
                onChange={(event) => {
                  setOtp(event.target.value.replace(/\D/g, ''));
                  setFormError('');
                }}
                disabled={verifyingOtp}
                className="text-center text-lg tracking-[0.4em]"
              />

              <button
                type="button"
                onClick={verifyOtpRequest}
                disabled={verifyingOtp}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifyingOtp ? <><Spinner /> Verifying code...</> : 'Verify Code'}
              </button>

              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setFormError('');
                  }}
                  className="font-medium text-navy/60 transition-colors hover:text-navy dark:text-white/45 dark:hover:text-white/70"
                >
                  Change email
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldownRemaining > 0 || sendingOtp}
                  className="font-medium text-primary transition-colors hover:text-primary-400 disabled:cursor-not-allowed disabled:text-navy/35 dark:disabled:text-white/25"
                >
                  {resendCooldownRemaining > 0 ? `Resend Code in ${resendCooldownRemaining}s` : 'Resend Code'}
                </button>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <form onSubmit={handleCreateAccount} noValidate className="space-y-4">
              <div>
                <h2 className="text-base font-semibold text-navy dark:text-white">Step 3: Complete your profile</h2>
                <p className="mt-1 text-sm text-navy/60 dark:text-white/45">Your email has been verified. Finish setting up your account.</p>
              </div>

              <FloatingLabelInput label="Full Name" type="text" value={profile.fullName} onChange={(event) => updateProfileField('fullName', event.target.value)} error={errors.fullName} autoComplete="name" disabled={creatingAccount} />
              <FloatingLabelInput label="Phone Number (Indian)" type="tel" value={profile.phone} onChange={(event) => updateProfileField('phone', event.target.value)} error={errors.phone} autoComplete="tel" disabled={creatingAccount} maxLength={13} />
              <FloatingLabelInput label="Aadhaar Card Number (12 digits)" type="text" inputMode="numeric" value={profile.aadhaarNumber} onChange={(event) => updateProfileField('aadhaarNumber', event.target.value.replace(/\D/g, ''))} error={errors.aadhaarNumber} maxLength={12} disabled={creatingAccount} />

              <div>
                <FloatingLabelInput
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  value={profile.password}
                  onChange={(event) => updateProfileField('password', event.target.value)}
                  error={errors.password}
                  autoComplete="new-password"
                  disabled={creatingAccount}
                  rightElement={
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="transition-colors hover:text-navy dark:hover:text-white/70" aria-label={showPassword ? 'Hide password' : 'Show password'}>
                      <EyeIcon />
                    </button>
                  }
                />
                <PasswordStrength password={profile.password} />
              </div>

              <FloatingLabelInput
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={profile.confirmPassword}
                onChange={(event) => updateProfileField('confirmPassword', event.target.value)}
                error={errors.confirmPassword}
                autoComplete="new-password"
                disabled={creatingAccount}
                rightElement={
                  <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="transition-colors hover:text-navy dark:hover:text-white/70" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                    <EyeIcon />
                  </button>
                }
              />

              <div className="rounded-2xl border border-navy/10 bg-navy/5 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-semibold text-navy dark:text-white">Set up MPIN (optional)</h3>
                    <p className="mt-1 text-xs text-navy/60 dark:text-white/40">Use a private 6-digit MPIN for faster sign-in later.</p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-navy dark:text-white">
                    <input
                      type="checkbox"
                      checked={profile.enableMpin}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        updateProfileField('enableMpin', checked);
                        if (!checked) {
                          setProfile((prev) => ({ ...prev, mpin: '', confirmMpin: '', enableMpin: false }));
                          setErrors((prev) => ({ ...prev, mpin: undefined, confirmMpin: undefined }));
                        }
                      }}
                      className="h-4 w-4 rounded border-navy/20 text-primary focus:ring-primary"
                    />
                    Enable
                  </label>
                </div>

                {profile.enableMpin ? (
                  <div className="mt-4 space-y-4">
                    <FloatingLabelInput
                      label="Enter 6-digit MPIN"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={profile.mpin}
                      onChange={(event) => updateProfileField('mpin', event.target.value.replace(/\D/g, ''))}
                      error={errors.mpin}
                      disabled={creatingAccount}
                    />
                    <FloatingLabelInput
                      label="Confirm MPIN"
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={profile.confirmMpin}
                      onChange={(event) => updateProfileField('confirmMpin', event.target.value.replace(/\D/g, ''))}
                      error={errors.confirmMpin}
                      disabled={creatingAccount}
                    />
                  </div>
                ) : null}
              </div>

              <button type="submit" disabled={creatingAccount} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60">
                {creatingAccount ? <><Spinner /> Creating account...</> : 'Create Account'}
              </button>
            </form>
          ) : null}

          <p className="mt-5 text-center text-xs leading-relaxed text-navy/60 dark:text-white/35">
            Your Aadhaar number is encrypted at rest and never shared with third parties.
          </p>
        </div>
      </div>
    </main>
  );
}

function Spinner() {
  return <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>;
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
