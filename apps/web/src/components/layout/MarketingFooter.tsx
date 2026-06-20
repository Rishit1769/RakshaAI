const FOOTER_GROUPS = [
  {
    title: 'Product',
    links: [
      { href: '/', label: 'Overview' },
      { href: '/dashboard', label: 'Dashboard' },
      { href: '/journey', label: 'Journey mode' },
    ],
  },
  {
    title: 'Response',
    links: [
      { href: '/sos', label: 'Emergency SOS' },
      { href: '/volunteer/dashboard', label: 'Volunteer network' },
      { href: '/police/dashboard', label: 'Police console' },
    ],
  },
  {
    title: 'Intelligence',
    links: [
      { href: '/community', label: 'Community reports' },
      { href: '/map', label: 'Safety map' },
      { href: '/ai', label: 'AI assistant' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/auth/register', label: 'Get started' },
      { href: '/auth/login', label: 'Sign in' },
      { href: 'mailto:support@rakshaai.in', label: 'Support' },
    ],
  },
];

export default function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div className="page-container py-20">
        <div className="mb-14 grid gap-8 border-b border-border/80 pb-12 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            <span className="eyebrow">
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse-dot" />
              Built for coordinated response
            </span>
            <h2 className="display-subsection max-w-2xl">Safety infrastructure with calmer workflows, stronger handoffs, and one unmistakable visual language.</h2>
            <p className="max-w-xl text-base leading-8 text-body">
              RakshaAI connects awareness, emergency activation, responder coordination, and community intelligence without turning the product into visual noise.
            </p>
          </div>
          <div className="relative overflow-hidden rounded-[var(--radius-2xl)] border border-border/80 bg-white p-6 shadow-card">
            <div className="absolute inset-x-6 top-0 h-px bg-[image:var(--gradient-accent)] opacity-70" />
            <p className="font-mono text-xs uppercase tracking-[0.16em] text-primary">Response loop</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {['Detect risk', 'Route help', 'Stay aligned'].map((step, index) => (
                <div key={step} className="rounded-[1.5rem] border border-border/70 bg-surface-soft/72 p-4">
                  <p className="text-3xl font-display text-primary">{index + 1}</p>
                  <p className="mt-2 text-sm font-medium text-ink">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-4 text-sm font-semibold text-ink">{group.title}</h2>
              <div className="space-y-3">
                {group.links.map((link) => (
                  <a key={link.href} href={link.href} className="footer-link">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-border/80 pt-6 text-xs text-muted">
          RakshaAI closes the loop from alert to assistance without turning safety tools into visual noise.
        </div>
      </div>
    </footer>
  );
}
