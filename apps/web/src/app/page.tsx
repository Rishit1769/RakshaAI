export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <div className="text-center space-y-3">
        <h1 className="text-hero text-navy">
          Raksha<span className="text-primary">AI</span>
        </h1>
        <p className="text-body text-muted max-w-md">
          AI-Powered Women Safety &amp; Emergency Response Ecosystem
        </p>
      </div>

      <div className="flex flex-wrap gap-4 justify-center">
        <a href="/dashboard" className="btn-primary">
          Open Dashboard
        </a>
        <a href="/auth/login" className="btn-secondary">
          Sign In
        </a>
      </div>

      <div className="card max-w-sm w-full text-center">
        <p className="text-caption text-muted uppercase tracking-wider font-semibold mb-2">
          Phase 1 — Infrastructure Ready
        </p>
        <p className="text-small text-navy">
          Backend, Prisma schema, Socket.IO, and frontend scaffold are initialized.
          Authentication (Phase 2) is next.
        </p>
      </div>
    </main>
  );
}
