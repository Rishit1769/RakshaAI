import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

const trustBadges = [
  'AES-256 End-to-End Encryption',
  'Government-Grade Security Compliance',
  'Sub-Second Real-Time Response',
];

const featureBadges = ['SOS Alerts', 'Live Tracking', 'Volunteer Network', 'AI Risk Analysis'];

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF4EF] via-[#F7F8FC] to-[#E8EEF9] px-4 transition-colors duration-200 dark:from-[#0B1026] dark:via-[#111827] dark:to-[#0B1026]">
      <div className="fixed right-4 top-4 z-50">
        <ThemeToggle />
      </div>

      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-[#7B61FF]/15 blur-3xl" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />

      <div className="relative z-10 mb-10 animate-fade-in text-center">
        <h1 className="text-5xl font-bold tracking-tight text-navy sm:text-6xl dark:text-white">
          Raksha<span className="text-primary">AI</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-light text-navy/60 sm:text-lg dark:text-white/50">
          AI-Powered Women Safety &amp; Emergency Response Ecosystem
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
          {trustBadges.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-full border border-navy/10 bg-white/70 px-3 py-1 text-xs font-medium text-navy/70 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/60"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      <div className="surface-panel relative z-10 w-full max-w-sm animate-slide-up p-8" style={{ animationDelay: '0.1s' }}>
        <p className="mb-7 text-center text-xs font-medium uppercase tracking-widest text-navy/45 dark:text-white/40">
          Secure Access Portal
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/auth/register"
            className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-sm font-semibold text-white shadow-primary transition-all duration-200 hover:bg-primary-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Create Account
          </Link>

          <Link
            href="/auth/login"
            className="interactive flex w-full items-center justify-center rounded-xl border border-navy/10 py-3.5 text-sm font-semibold text-navy hover:bg-navy/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-navy/45 dark:text-white/25">
          By continuing you agree to our{' '}
          <a href="#" className="interactive text-navy/60 underline underline-offset-2 hover:text-navy dark:text-white/40 dark:hover:text-white/60">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="interactive text-navy/60 underline underline-offset-2 hover:text-navy dark:text-white/40 dark:hover:text-white/60">
            Privacy Policy
          </a>
          .
        </p>
      </div>

      <div className="relative z-10 mt-8 flex flex-wrap justify-center gap-3 animate-fade-in" style={{ animationDelay: '0.25s' }}>
        {featureBadges.map((label) => (
          <span
            key={label}
            className="inline-flex items-center rounded-full border border-navy/10 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-navy/70 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/55"
          >
            {label}
          </span>
        ))}
      </div>
    </main>
  );
}
