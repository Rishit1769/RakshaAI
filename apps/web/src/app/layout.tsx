import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RakshaAI — Women Safety Platform',
    template: '%s | RakshaAI',
  },
  description: 'AI-powered women safety and emergency response ecosystem with live GPS tracking, SOS alerts, and responder coordination.',
  keywords: ['women safety', 'emergency', 'SOS', 'AI safety', 'GPS tracking'],
  authors: [{ name: 'RakshaAI Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'RakshaAI — Women Safety Platform',
    description: 'AI-powered emergency response ecosystem for women',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-background text-navy antialiased transition-colors duration-200 dark:bg-[#0B1026] dark:text-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
