import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '../app/components/Navbar';
import Script from 'next/script';

const inter = Inter({ subsets: ['latin'] });

const GA_MEASUREMENT_ID = "G-03BHKQVRD6"; // Replace with your actual Google Analytics ID

export const metadata: Metadata = {
  title: 'Sui Rewards Me',
  description:
    'The First Rewards Descentralized Exchange DEX Ever. It is time you got a piece',
  metadataBase: new URL('https://SuiRewards.Me'),
  twitter: {
    title: 'Sui Rewareds Me',
    description:
      'The First Rewards Descentralized Exchange DEX Ever. It is time you got a piece',
    images: '/images/banner.jpg',
    card: 'summary_large_image',
    site: '@SuiRewardsMe',
  },
  openGraph: {
    title: 'Sui Rewards Me',
    description:
      'The First Rewards Descentralized Exchange DEX Ever. It is time you got a piece',
    images: '/images/banner.jpg',
    url: 'https://SuiRewards.Me',
    type: 'website',
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Google Analytics Scripts */}
        <Script
          strategy="afterInteractive"
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        />
        <Script
          id="google-analytics"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}', {
                page_path: window.location.pathname,
              });
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-900 text-white h-screen`}>
        <Navbar />
        <main className="container mx-auto">{children}</main>
      </body>
    </html>
  );
}