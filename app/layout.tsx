import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import Head from 'next/head'
import Navbar from './components/Navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sui Template App',
  description:
    'Start your Sui journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
  metadataBase: new URL('https://sui-web3-template.nightly.app'), // ✅ Fix
  twitter: {
    title: 'Sui Template App',
    description:
      'Start your Sui journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
    images: '/preview.png',
    card: 'summary_large_image',
    site: '@nightly_app',
  },
  openGraph: {
    title: 'Sui Template App',
    description:
      'Start your Sui journey here, without unnecessary configuration and setup. Just clone it and code on top of it. Powered by Nightly Wallet.',
    images: '/preview.png',
    url: 'https://sui-web3-template.nightly.app',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <Navbar />
        <main className="container mx-auto mt-8">{children}</main>
      </body>
    </html>
  )
}
