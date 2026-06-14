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
      <div className="page-container space-y-10 py-16">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="brand-lockup text-white">
              <span className="brand-mark brand-mark-dark">R</span>
              <span className="display-label text-xl text-white">RakshaAI</span>
            </div>
            <p className="mt-4 max-w-xl text-sm text-white/65">
              Coordinated women-safety infrastructure for faster alerts, better situational awareness, and calmer emergency response.
            </p>
          </div>
          <a href="/auth/register" className="btn-secondary-dark">
            Create account
          </a>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="text-sm font-semibold text-white">{group.title}</h2>
              <div className="mt-4 space-y-3">
                {group.links.map((link) => (
                  <a key={link.href} href={link.href} className="footer-link">
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-white/10 pt-6 text-sm text-white/45">
          RakshaAI closes the loop from alert to assistance without turning safety tools into visual noise.
        </div>
      </div>
    </footer>
  );
}
