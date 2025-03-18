import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '../app/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Sui Rewards Me',
  description:
    'The First Rewards Descentralized Exchange DEX Ever. It is time you got a piece',
  metadataBase: new URL('https://SuiRewards.Me'),
  twitter: {
    title: 'Sui Rewareds Me',
    description:
      'The First Rewards Descentralized Exchange DEX Ever. It is time you got a piece',
    images: '/banner.jpg',
    card: 'summary_large_image',
    site: '@SuiRewardsMe',
  },
  openGraph: {
    title: 'Sui Rewards Me',
    description:
      'The First Rewards Descentralized Exchange DEX Ever. It is time you got a piece',
    images: '/preview.png',
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
      <body className={`${inter.className} bg-gray-900 text-white h-screen`}>
        <Navbar />
        <main className="container mx-auto">{children}</main>
      </body>
    </html>
  );
}