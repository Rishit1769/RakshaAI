'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_LINKS = [
  { href: '/#product', label: 'Product' },
  { href: '/#solutions', label: 'Solutions' },
  { href: '/#resources', label: 'Resources' },
  { href: '/community', label: 'Community' },
  { href: '/map', label: 'Safety Map' },
];

export default function MarketingNav() {
  const pathname = usePathname();

  return (
    <header className="top-nav">
      <div className="page-container flex min-h-20 items-center justify-between gap-6 py-4">
        <Link href="/" className="brand-lockup">
          <span className="brand-mark">R</span>
          <div>
            <span className="display-label text-base">RakshaAI</span>
            <p className="mt-0.5 font-mono text-[0.68rem] uppercase tracking-[0.18em] text-muted">Safety infrastructure</p>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 lg:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`nav-link rounded-full px-4 py-2 ${pathname === item.href ? 'bg-primary/[0.08] text-ink shadow-soft' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/auth/login" className="btn-text-link hidden sm:inline-flex">
            Sign in
          </Link>
          <Link href="/auth/register" className="btn-primary">
            Create account
          </Link>
        </div>
      </div>
    </header>
  );
}
