import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#FFF4EF] via-[#F7F8FC] to-[#E8EEF9] px-4 transition-colors duration-200 dark:from-[#0B1026] dark:via-[#111827] dark:to-[#0B1026]">
      {/* Theme toggle — fixed top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#7B61FF]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-3xl" />

      {/* Header brand */}
      <div className="relative z-10 mb-10 text-center animate-fade-in">
        <h1 className="text-5xl font-bold tracking-tight text-navy sm:text-6xl dark:text-white">
          Raksha<span className="text-primary">AI</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-base font-light text-navy/60 sm:text-lg dark:text-white/50">
          AI-Powered Women Safety &amp; Emergency Response Ecosystem
        </p>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-5">
          {['End-to-End Encrypted', 'Government Grade Security', 'Real-time Response'].map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white/70 px-3 py-1 text-xs text-navy/55 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/40"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-safe inline-block" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Auth card — glassmorphism */}
      <div
        className="surface-panel relative z-10 w-full max-w-sm animate-slide-up p-8"
        style={{ animationDelay: '0.1s' }}
      >
        <p className="mb-7 text-center text-xs font-medium uppercase tracking-widest text-navy/45 dark:text-white/40">
          Secure Access Portal
        </p>

        <div className="flex flex-col gap-3">
          <Link
            href="/auth/register"
            className="group flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-primary text-white font-semibold text-sm shadow-primary transition-all duration-200 hover:bg-primary-600 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Create Account
            <svg
              className="w-4 h-4 transition-transform group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>

          <Link
            href="/auth/login"
            className="interactive flex w-full items-center justify-center gap-2 rounded-xl border border-navy/10 py-3.5 text-sm font-semibold text-navy hover:bg-navy/5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:border-white/20 dark:text-white dark:hover:bg-white/10 dark:focus-visible:ring-white/30"
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

      {/* Feature pills */}
      <div className="relative z-10 flex flex-wrap justify-center gap-3 mt-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
        {[
          { icon: '🛡️', label: 'SOS Alerts' },
          { icon: '📍', label: 'Live Tracking' },
          { icon: '🤝', label: 'Volunteer Network' },
          { icon: '🧠', label: 'AI Risk Analysis' },
        ].map((f) => (
          <span
            key={f.label}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/10 bg-white/70 px-3.5 py-1.5 text-xs text-navy/55 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-white/35"
          >
            <span>{f.icon}</span>
            {f.label}
          </span>
        ))}
      </div>
    </main>
  );
}

