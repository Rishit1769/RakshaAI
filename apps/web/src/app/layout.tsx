import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import DownloadAppButton from '@/components/ui/DownloadAppButton';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'RakshaAI - Coordinated Women Safety Response',
    template: '%s | RakshaAI',
  },
  description: 'Emergency response infrastructure for women with SOS activation, live tracking, community intelligence, and coordinated responder workflows.',
  keywords: ['women safety', 'emergency response', 'SOS', 'community safety', 'live tracking'],
  authors: [{ name: 'RakshaAI Team' }],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'RakshaAI - Coordinated Women Safety Response',
    description: 'Emergency response ecosystem for women with faster alerts and calmer coordination.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored?(stored==='dark'?'dark':'light'):(prefersDark?'dark':'light');document.documentElement.classList.toggle('dark',theme==='dark');document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-body antialiased transition-colors duration-200">
        <Providers>
          {children}
          <DownloadAppButton />
        </Providers>
      </body>
    </html>
  );
}
