'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthSplitLayout } from '@/components/layout/AuthSplitLayout';
import FloatingLabelInput from '@/components/ui/FloatingLabelInput';
import PasswordStrength from '@/components/ui/PasswordStrength';
import { authApi } from '@/lib/api/auth.api';
import { establishAuthenticatedSession } from '@/lib/auth-session';
import { ApiError } from '@/lib/api/fetcher';

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

      await establishAuthenticatedSession(response.data);
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
    <AuthSplitLayout
      badge="Account onboarding"
      title={
        <>
          Set up a safety account that is <span className="gradient-text">ready before you need it</span>.
        </>
      }
      description="Verify identity, create protected credentials, and optionally enable MPIN for faster access during urgent moments."
      highlights={[
        'Email verification before account creation',
        'Structured profile fields for emergency use',
        'Optional MPIN for quicker re-entry',
      ]}
      formTitle="Create account"
      formDescription="Move from verification to full profile setup inside one consistent flow."
      footer={
        <>
          <p className="text-xs leading-relaxed text-muted">
            Your Aadhaar number is encrypted at rest and never shared with third parties.
          </p>
          <p className="mt-4 text-sm text-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="font-semibold text-ink">
              Sign in
            </Link>
          </p>
        </>
      }
    >
      <div className="mb-6 flex items-center gap-3">
        {[1, 2, 3].map((item) => (
          <div key={item} className="flex flex-1 items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${step >= item ? 'bg-[image:var(--gradient-accent)] text-white' : 'bg-surface-soft text-muted'}`}>
              {item}
            </div>
            {item < 3 ? <div className={`h-px flex-1 ${step > item ? 'bg-primary' : 'bg-hairline'}`} /> : null}
          </div>
        ))}
      </div>

      {formError ? (
        <div role="alert" className="mb-5 rounded-2xl border border-emergency/20 bg-emergency/10 p-4">
          <p className="text-sm text-emergency">{formError}</p>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Step 1: Verify your email</h2>
            <p className="mt-2 text-sm text-muted">We&apos;ll send a 6-digit code before activating the account.</p>
          </div>

          <FloatingLabelInput
            label="Email Address"
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setFormError('');
            }}
            autoComplete="email"
            disabled={sendingOtp}
          />

          <button type="button" onClick={sendOtpRequest} disabled={sendingOtp} className="btn-primary w-full">
            {sendingOtp ? 'Sending code...' : 'Send verification code'}
          </button>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Step 2: Enter your code</h2>
            <p className="mt-2 text-sm text-muted">A 6-digit code has been sent to {email}.</p>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p className="text-sm font-semibold text-ink">Code expires in {formatCountdown(secondsRemaining)}</p>
            <p className="mt-1 text-xs text-muted">Keep this tab open while you complete verification.</p>
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

          <button type="button" onClick={verifyOtpRequest} disabled={verifyingOtp} className="btn-primary w-full">
            {verifyingOtp ? 'Verifying code...' : 'Verify code'}
          </button>

          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={() => setStep(1)} className="font-medium text-muted">
              Change email
            </button>
            <button type="button" onClick={handleResendOtp} disabled={resendCooldownRemaining > 0 || sendingOtp} className="font-medium text-ink disabled:text-muted-soft">
              {resendCooldownRemaining > 0 ? `Resend in ${resendCooldownRemaining}s` : 'Resend code'}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <form onSubmit={handleCreateAccount} noValidate className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Step 3: Complete your profile</h2>
            <p className="mt-2 text-sm text-muted">Finish account setup and decide whether MPIN should be enabled.</p>
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
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="transition-colors hover:text-ink" aria-label={showPassword ? 'Hide password' : 'Show password'}>
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
              <button type="button" onClick={() => setShowConfirmPassword((value) => !value)} className="transition-colors hover:text-ink" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
                <EyeIcon />
              </button>
            }
          />

          <div className="rounded-2xl border border-border bg-surface-soft/65 p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-sm font-semibold text-ink">Set up MPIN (optional)</h3>
                <p className="mt-1 text-xs text-muted">Use a private 6-digit MPIN for faster sign-in later.</p>
              </div>
              <label className="inline-flex items-center gap-2 text-sm font-medium text-ink">
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
                  className="h-4 w-4 rounded border-hairline text-primary focus:ring-0"
                />
                Enable
              </label>
            </div>

            {profile.enableMpin ? (
              <div className="mt-4 space-y-4">
                <FloatingLabelInput label="Enter 6-digit MPIN" type="password" inputMode="numeric" maxLength={6} value={profile.mpin} onChange={(event) => updateProfileField('mpin', event.target.value.replace(/\D/g, ''))} error={errors.mpin} disabled={creatingAccount} />
                <FloatingLabelInput label="Confirm MPIN" type="password" inputMode="numeric" maxLength={6} value={profile.confirmMpin} onChange={(event) => updateProfileField('confirmMpin', event.target.value.replace(/\D/g, ''))} error={errors.confirmMpin} disabled={creatingAccount} />
              </div>
            ) : null}
          </div>

          <button type="submit" disabled={creatingAccount} className="btn-primary w-full">
            {creatingAccount ? 'Creating account...' : 'Create account'}
          </button>
        </form>
      ) : null}
    </AuthSplitLayout>
  );
}

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}
