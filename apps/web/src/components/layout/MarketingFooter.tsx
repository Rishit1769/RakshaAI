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
      <div className="page-container py-12">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {FOOTER_GROUPS.map((group) => (
            <div key={group.title}>
              <h2 className="mb-4 text-sm font-semibold text-[var(--text-primary)]">{group.title}</h2>
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

        <div className="mt-8 border-t border-[var(--border)] pt-6 text-xs text-[var(--text-muted)]">
          RakshaAI closes the loop from alert to assistance without turning safety tools into visual noise.
        </div>
      </div>
    </footer>
  );
}
