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
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var stored=localStorage.getItem('theme');var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var theme=stored?(stored==='dark'?'dark':'light'):(prefersDark?'dark':'light');if(theme==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen bg-background text-navy antialiased transition-colors duration-200 dark:bg-[#0B1026] dark:text-white">
        <Providers>
          {children}
          <DownloadAppButton />
        </Providers>
      </body>
    </html>
  );
}
