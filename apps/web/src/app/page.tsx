import Link from 'next/link';
import ThemeToggle from '@/components/ui/ThemeToggle';

export default function HomePage() {
  return (
    <main className="relative min-h-screen bg-gradient-to-br from-[#0B1026] via-[#111827] to-[#0B1026] overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Theme toggle — fixed top-right */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Ambient glow blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 rounded-full bg-[#7B61FF]/15 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/5 blur-3xl" />

      {/* Header brand */}
      <div className="relative z-10 text-center mb-10 animate-fade-in">
        <h1 className="text-5xl sm:text-6xl font-bold text-white tracking-tight">
          Raksha<span className="text-primary">AI</span>
        </h1>
        <p className="mt-3 text-base sm:text-lg text-white/50 max-w-md mx-auto font-light">
          AI-Powered Women Safety &amp; Emergency Response Ecosystem
        </p>

        {/* Trust indicators */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-5">
          {['End-to-End Encrypted', 'Government Grade Security', 'Real-time Response'].map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1.5 text-xs text-white/40 border border-white/10 rounded-full px-3 py-1"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-safe inline-block" />
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Auth card — glassmorphism */}
      <div
        className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 backdrop-blur-xl bg-white/5 shadow-2xl p-8 animate-slide-up"
        style={{ animationDelay: '0.1s' }}
      >
        <p className="text-center text-white/40 text-xs uppercase tracking-widest mb-7 font-medium">
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
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl border border-white/20 text-white font-semibold text-sm transition-all duration-200 hover:bg-white/10 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Sign In
          </Link>
        </div>

        <p className="mt-6 text-center text-white/25 text-xs leading-relaxed">
          By continuing you agree to our{' '}
          <a href="#" className="text-white/40 hover:text-white/60 underline underline-offset-2">
            Terms of Service
          </a>{' '}
          and{' '}
          <a href="#" className="text-white/40 hover:text-white/60 underline underline-offset-2">
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
            className="inline-flex items-center gap-1.5 text-xs text-white/35 bg-white/5 border border-white/8 rounded-full px-3.5 py-1.5"
          >
            <span>{f.icon}</span>
            {f.label}
          </span>
        ))}
      </div>
    </main>
  );
}

