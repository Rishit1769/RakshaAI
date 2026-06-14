'use client';

import { usePathname } from 'next/navigation';
import ThemeToggle from '@/components/ui/ThemeToggle';

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
      <div className="page-container flex h-16 items-center justify-between gap-6">
        <a href="/" className="brand-lockup">
          <span className="brand-mark">R</span>
          <span className="display-label text-base">RakshaAI</span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={`nav-link ${pathname === item.href ? 'text-ink' : ''}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="/auth/login" className="btn-text-link hidden sm:inline-flex">
            Sign in
          </a>
          <a href="/auth/register" className="btn-primary">
            Create account
          </a>
        </div>
      </div>
    </header>
  );
}
