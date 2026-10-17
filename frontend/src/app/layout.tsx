import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { PwaManager } from '@/components/pwa/PwaManager';
import { PersonaProvider } from '@/context/PersonaContext';
import { ThemeProvider } from '@/context/ThemeContext';
import { Suspense } from 'react';

const instrumentSerif = Instrument_Serif({
  weight: '400',
  style: ['normal', 'italic'],
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF9F6' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

export const metadata: Metadata = {
  title: 'CivicPulse — Municipal Infrastructure Triage & Dispatch Ledger',
  description:
    'Deterministic civic complaint triage system with spatial deduplication, auditable priority scoring, and verifiable field dispatch.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'CivicPulse',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  keywords: [
    'CivicPulse',
    'Municipal Triage',
    'Public Works Dispatch',
    'Open311',
    'Civic Infrastructure',
    'PWA',
  ],
  authors: [{ name: 'CivicPulse Municipal Systems' }],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`light ${instrumentSerif.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="CivicPulse" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('civicpulse_theme');if(t==='dark'){document.documentElement.classList.remove('light');document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');document.documentElement.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen flex flex-col bg-[var(--canvas-base)] text-[var(--text-primary)] font-sans selection:bg-[var(--brand-primary)] selection:text-white antialiased">
        <ThemeProvider>
          <PersonaProvider>
            {/* Top Navigation */}
            <Suspense fallback={<header className="h-16 w-full bg-[var(--surface-card)] border-b border-[var(--border-subtle)]" />}>
              <Navbar />
            </Suspense>

            {/* Main content body */}
            <main className="flex-1 flex flex-col w-full">
              <Suspense
                fallback={
                  <div className="flex-1 flex items-center justify-center min-h-[50vh]">
                    <div className="w-6 h-6 border-2 border-[var(--text-primary)] border-t-transparent animate-spin" />
                  </div>
                }
              >
                {children}
              </Suspense>
            </main>

            {/* Public Service Footer */}
            <Suspense fallback={null}>
              <Footer />
            </Suspense>

            {/* Progressive Web App Manager & Install Prompt */}
            <PwaManager />
          </PersonaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

