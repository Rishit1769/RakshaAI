import type { Metadata } from 'next';
import { Calistoga, Inter, JetBrains_Mono } from 'next/font/google';
import DownloadAppButton from '@/components/ui/DownloadAppButton';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const calistoga = Calistoga({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-calistoga',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RakshaAI - Women Safety and Emergency Response',
    template: '%s | RakshaAI',
  },
  description: 'AI-powered women safety and emergency response ecosystem with SOS activation, live tracking, responder coordination, and community intelligence.',
  keywords: ['women safety', 'emergency response', 'SOS', 'live tracking', 'community safety'],
  authors: [{ name: 'RakshaAI Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'RakshaAI - Women Safety and Emergency Response',
    description: 'AI-powered emergency response ecosystem for women.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${calistoga.variable} ${jetbrainsMono.variable}`}>
      <head />
      <body className="min-h-screen bg-background font-sans text-body antialiased">
        <Providers>
          {children}
          <DownloadAppButton />
        </Providers>
      </body>
    </html>
  );
}
