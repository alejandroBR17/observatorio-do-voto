import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { SiteAnalytics } from './components/site-analytics';
import {
  siteOrigin,
  siteName,
  siteTitle,
  siteDescription,
  siteIndexable,
  sharingMetadata,
  websiteStructuredData,
} from '@/lib/site-metadata';
import './globals.css';
import './shell.css';
import './motion.css';
import './onboarding.css';
import './experience.css';
import './usability.css';
import './local-experience.css';
import './pwa.css';
import './actions.css';
import './recent-updates.css';
import './observatory.css';
import './research.css';
import './candidates.css';
import './coverage.css';
import './watch.css';
import './profile.css';
import './alerts.css';
import './app-experience.css';
import './history.css';
import './municipality.css';
import './live-observatory.css';
import './live-scoreboard.css';
import './post-election-analysis.css';
import './night-observatory.css';
import './welcome-observatory.css';
import './documents.css';
import './recovery.css';
import './debate.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin),
  title: {
    default: siteTitle,
    template: '%s | Observatório do Voto',
  },
  description: siteDescription,
  applicationName: siteName,
  category: 'politics',
  robots: {
    index: siteIndexable,
    follow: true,
    googleBot: { index: siteIndexable, follow: true, 'max-image-preview': 'large' },
  },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  ...sharingMetadata(siteTitle, siteDescription),
  appleWebApp: { capable: true, title: 'Observatório', statusBarStyle: 'default' },
};
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f4f2ec' },
    { media: '(prefers-color-scheme: dark)', color: '#14283d' },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get('x-nonce') || undefined;
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteStructuredData).replace(/</g, '\\u003c'),
          }}
        />
        <link rel="stylesheet" href="/assets/fonts.css" precedence="fonts" />
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html:
              "(()=>{let t='system';try{t=JSON.parse(localStorage.getItem('observatorio.preferences')||'{}').theme||'system'}catch{}document.documentElement.dataset.theme=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches)?'dark':'light'})()",
          }}
        />
      </head>
      <body className="antialiased">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
